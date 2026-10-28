#include "os.h"

volatile uint64_t ticks;
uint64_t user_resume_sp;
_Static_assert(sizeof(struct trapframe) == 288, "trap.S frame layout");
_Static_assert(sizeof(struct context) == 112, "switch.S context layout");

void trap_handler(struct trapframe *frame) {
    if (frame->scause == ((1UL << 63) | 5)) {
        set_timer(read_time() + TIMER_INTERVAL);
        ticks++;
        scheduler_tick();
        return; /* Do not advance sepc for asynchronous interrupts. */
    }
    if (frame->scause == 8 && !(frame->sstatus & SSTATUS_SPP)) {
        frame->sepc += 4; /* ecall itself is always 32-bit. */
        if (frame->x[17] == SYS_EXIT) {
            /* Single-user-demo harness, not a general process exit syscall. */
            frame->sepc = (uintptr_t)user_return;
            frame->sstatus |= SSTATUS_SPP;
            frame->x[2] = user_resume_sp;
        } else {
            frame->x[10] = (uint64_t)lab_syscall(frame->x[17], frame->x[10], frame->x[11]);
        }
        return;
    }
    puts_os("\ntrap: scause="); print_hex(frame->scause);
    puts_os(" sepc="); print_hex(frame->sepc);
    puts_os(" stval="); print_hex(frame->stval);
    panic("unexpected trap");
}
long sys_write_checked(uint64_t address, uint64_t size) {
    uint64_t begin = (uintptr_t)__user_start, end = (uintptr_t)__user_end;
    if (address < begin || address > end || size > end - address) return -14;
    const char *p = (const char *)(uintptr_t)address;
    for (uint64_t i = 0; i < size; ++i) putchar_os(p[i]);
    return (long)size;
}
void user_demo(void) {
    long result = run_user();
    if (result != 0) panic("U-mode syscall demo failed");
    puts_os("[user] write, time, EFAULT, ENOSYS verified\n");
}
void sleep_ticks(uint64_t count) {
    uint64_t end = ticks + count;
    while ((int64_t)(ticks - end) < 0) __asm__ volatile("wfi");
}
