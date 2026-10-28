#include "p2.h"

struct p2_pcb p2_tasks[TASK_COUNT];
struct p2_queue p2_ready, p2_sleepers;
int p2_current = -1;
volatile uint64_t ticks;
uint64_t user_resume_sp;
static struct context host;
static unsigned char stacks[TASK_COUNT][8192] __attribute__((aligned(16)));
static struct p2_mutex bowl;
static unsigned demo, completed, trace[16], trace_count, critical;
static bool scheduling;
static uint64_t start_time[TASK_COUNT], end_time[TASK_COUNT], woke_at;

void p2_missing_context(void) { panic("TODO P2 task1: context.S"); }
void p2_missing_trap(void) { panic("TODO P2 task3: trap.S"); }
static void require(bool ok, const char *why) { if (!ok) panic(why); }

void p2_switch_to(int next) {
    int old = p2_current;
    require(next >= -1 && next < TASK_COUNT, "invalid next task");
    if (next >= 0) require(p2_tasks[next].state == P2_RUNNING, "next not RUNNING");
    p2_current = next;
    struct p2_pcb *pcb = next < 0 ? 0 : &p2_tasks[next];
    __asm__ volatile("mv tp, %0" :: "r"(pcb) : "memory");
    if (old != next)
        context_switch(old < 0 ? &host : &p2_tasks[old].context,
                       next < 0 ? &host : &p2_tasks[next].context);
}
void p2_yield(void) {
    uint64_t flags = irq_save();
    p2_schedule();
    struct p2_pcb *tp;
    __asm__ volatile("mv %0, tp" : "=r"(tp));
    require(p2_current >= 0 && tp == &p2_tasks[p2_current], "tp lost across resume");
    irq_restore(flags);
}
static void task_main(void) {
    unsigned pid = (unsigned)p2_current;
    struct p2_pcb *tp;
    __asm__ volatile("mv %0, tp" : "=r"(tp));
    require(tp == &p2_tasks[pid], "tp must equal current PCB");
    enable_irq();
    if (demo == 1) {
        for (unsigned n = 0; n < 3; ++n) {
            trace[trace_count++] = pid;
            require(p2_register_probe(pid) == 0, "callee-saved register corrupted");
        }
    } else if (demo == 2) {
        for (unsigned n = 0; n < 2; ++n) {
            p2_mutex_acquire(&bowl);
            require(!critical, "two owners entered critical section");
            critical = 1;
            trace[trace_count++] = pid;
            p2_yield(); /* Deliberately switch WHILE holding the lock. */
            require(bowl.owner == (int)pid, "ownership stolen while suspended");
            critical = 0;
            p2_mutex_release(&bowl);
            p2_yield();
        }
    } else {
        start_time[pid] = ticks;
        if (demo == 5 && pid == 0) {
            uint64_t deadline = ticks + 3;
            p2_sleep(3);
            woke_at = ticks;
            require(woke_at >= deadline, "sleep returned before deadline");
        } else {
            uint64_t start = ticks;
            /* CPU-bound threads: no voluntary yield and no syscall. */
            while (ticks - start < 6) __asm__ volatile("nop");
        }
        end_time[pid] = ticks;
    }
    irq_save();
    ++completed;
    p2_tasks[pid].state = P2_DONE;
    p2_schedule();
    panic("DONE task resumed");
}
static void run_threads(unsigned which) {
    uint64_t flags = irq_save();
    memset(p2_tasks, 0xa5, sizeof(p2_tasks));
    p2_ready.count = p2_sleepers.count = 0;
    completed = trace_count = critical = 0;
    p2_current = -1;
    demo = which;
    for (unsigned i = 0; i < TASK_COUNT; ++i) {
        uintptr_t top = (uintptr_t)&stacks[i][sizeof(stacks[i])];
        p2_init_pcb(&p2_tasks[i], i, (uintptr_t)task_main, top + 7);
        require(p2_tasks[i].pid == i && p2_tasks[i].state == P2_READY,
                "PCB id/state initialization");
        require(p2_tasks[i].context.ra == (uintptr_t)task_main &&
                p2_tasks[i].context.sp == top, "PCB initial ra/sp");
        for (unsigned j = 0; j < 12; ++j)
            require(p2_tasks[i].context.s[j] == 0, "PCB context not zeroed");
        p2_enqueue(&p2_ready, i);
    }
    scheduling = true;
    p2_schedule();
    /* Host doubles as idle continuation: don't exit when all tasks sleep. */
    while (completed != TASK_COUNT) {
        enable_irq();
        __asm__ volatile("wfi");
        irq_save();
        if (p2_ready.count) p2_schedule();
    }
    scheduling = false;
    require(p2_ready.count == 0 && p2_sleepers.count == 0, "queue leak");
    if (which <= 2) {
        unsigned expected = which == 1 ? 9 : 6;
        require(trace_count == expected, "missing task progress");
        puts_os("[trace] ");
        for (unsigned i = 0; i < expected; ++i) {
            require(trace[i] == i % TASK_COUNT, "FIFO/round-robin order wrong");
            print_u64(trace[i]);
        }
        puts_os("\n");
    } else if (which == 4) {
        uint64_t latest = 0, earliest = UINT64_MAX;
        for (unsigned i = 0; i < TASK_COUNT; ++i) {
            if (start_time[i] > latest) latest = start_time[i];
            if (end_time[i] < earliest) earliest = end_time[i];
        }
        require(latest < earliest, "no actual asynchronous preemption");
        puts_os("[preempt] all CPU-bound tasks started before first completion\n");
    } else {
        require(woke_at > start_time[0], "sleep never blocked");
        puts_os("[sleep] blocked task woke while CPU-bound peers ran\n");
    }
    irq_restore(flags);
}
long sys_write_checked(uint64_t address, uint64_t size) {
    uintptr_t begin = (uintptr_t)__user_start, end = (uintptr_t)__user_end;
    if (address < begin || address > end || size > end - address) return -14;
    for (uint64_t i = 0; i < size; ++i) putchar_os(((const char *)address)[i]);
    return (long)size;
}
void trap_handler(struct trapframe *frame) {
    if (frame->scause == ((1UL << 63) | 5)) {
        if (scheduling) p2_on_timer();
        else { set_timer(read_time() + TIMER_INTERVAL); ++ticks; }
        return;
    }
    if (frame->scause == 8 && !(frame->sstatus & SSTATUS_SPP)) {
        if (frame->x[17] == SYS_EXIT) {
            /* Supplied one-user-program test harness. */
            frame->sepc = (uintptr_t)user_return;
            frame->sstatus |= SSTATUS_SPP;
            frame->x[2] = user_resume_sp;
        } else p2_handle_ecall(frame);
        return;
    }
    panic("unexpected trap cause / bad context restore");
}
void kernel_main(void) {
    puts_os("\n[Project2 workshop] real RV64 kernel; ");
    puts_os(P2_MODE_NAME); puts_os(" implementation\n");
    run_threads(1);
    puts_os("[PASS P2 task1] PCB, tp, FIFO, switch and s0-s11 canaries\n");
    if (P2_STAGE >= 2) {
        p2_mutex_init(&bowl);
        run_threads(2);
        require(bowl.owner == -1 && bowl.waiters.count == 0, "mutex not released");
        puts_os("[PASS P2 task2] actual blocking and FIFO mutex handoff\n");
    }
    if (P2_STAGE >= 3) {
        require(p2_dispatch(99, 0, 0) == -38, "unknown syscall");
        require(p2_dispatch(1, 1, 1) == -14, "bad user pointer");
        uint64_t before = read_time();
        long value = p2_dispatch(2, 0, 0);
        require(value >= 0 && (uint64_t)value >= before &&
                (uint64_t)value <= read_time(), "SYS_TIME is not clock value");
        require(run_user() == 0, "U-mode ecall result/register restore failed");
        puts_os("[PASS P2 task3] U->S->U, ecall ABI, EFAULT, ENOSYS, sret\n");
    }
    if (P2_STAGE >= 4) {
        /* Check equality, multiple simultaneous deadlines and an unsorted queue. */
        irq_save();
        p2_ready.count = p2_sleepers.count = 0;
        for (unsigned i = 0; i < TASK_COUNT; ++i) {
            p2_tasks[i].state = P2_SLEEPING;
            p2_tasks[i].deadline = i == 1 ? ticks + 100 : ticks;
            p2_enqueue(&p2_sleepers, i);
        }
        p2_wake_expired();
        require(p2_ready.count == 2 && p2_ready.ids[0] == 0 && p2_ready.ids[1] == 2 &&
                p2_sleepers.count == 1 && p2_sleepers.ids[0] == 1 &&
                p2_tasks[0].state == P2_READY && p2_tasks[2].state == P2_READY &&
                p2_tasks[1].state == P2_SLEEPING, "must wake ALL expired, not future sleepers");
        p2_timer_start();
        run_threads(4);
        run_threads(5);
        irq_save();
        puts_os("[PASS P2 task4] timer IRQ, blocked sleep, no-yield preemption\n");
    }
    puts_os("[PROJECT2 CHECK PASS]\n");
    poweroff(0);
}
