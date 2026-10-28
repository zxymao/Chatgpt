#include "os.h"

static struct task tasks[TASK_COUNT];
static unsigned char stacks[TASK_COUNT][8192] __attribute__((aligned(16)));
static struct context host_context;
static int current = -1;
static bool active, preempting;
static unsigned steps[TASK_COUNT], trace[9], trace_count;
static uint64_t started[TASK_COUNT], finished[TASK_COUNT];

void thread_yield(void) {
    uint64_t flags = irq_save();
    int old = current;
    if (old >= 0 && tasks[old].state == TASK_RUNNING) tasks[old].state = TASK_READY;
    int next = lab_choose_next(tasks, old, TASK_COUNT);
    if (next < -1 || next >= TASK_COUNT) panic("lab3 returned invalid task index");
    if (next >= 0 && tasks[next].state != TASK_READY) panic("lab3 selected non-READY task");
    current = next;
    if (next >= 0) tasks[next].state = TASK_RUNNING;
    if (old != next) {
        struct context *from = old >= 0 ? &tasks[old].context : &host_context;
        struct context *to = next >= 0 ? &tasks[next].context : &host_context;
        context_switch(from, to);
    }
    irq_restore(flags);
}
static void task_entry(void) {
    enable_irq();
    unsigned id = (unsigned)current;
    if (preempting) {
        /* No yield/syscall here: only timer IRQs let peers start. */
        uint64_t start = ticks;
        started[id] = start;
        while (ticks - start < 6) __asm__ volatile("nop");
        uint64_t flags = irq_save();
        finished[id] = ticks;
        steps[id] = 1;
        puts_os("[preempt task "); print_u64(id); puts_os("] completed\n");
        irq_restore(flags);
    } else {
        for (unsigned i = 0; i < 3; ++i) {
            uint64_t flags = irq_save();
            if (trace_count < 9) trace[trace_count++] = id;
            steps[id]++;
            puts_os("[task "); print_u64(id); puts_os("] step "); print_u64(i); puts_os("\n");
            irq_restore(flags);
            thread_yield();
        }
    }
    irq_save();
    tasks[id].state = TASK_DONE;
    thread_yield();
    panic("finished task was scheduled again");
}
void scheduler_tick(void) {
    if (active && preempting && current >= 0) thread_yield();
}
void threads_demo(bool preempt) {
    uint64_t flags = irq_save();
    memset(tasks, 0, sizeof(tasks));
    memset(steps, 0, sizeof(steps));
    trace_count = 0;
    current = -1;
    preempting = preempt;
    active = true;
    for (unsigned i = 0; i < TASK_COUNT; ++i) {
        tasks[i].id = i;
        tasks[i].state = TASK_READY;
        tasks[i].context.ra = (uintptr_t)task_entry;
        tasks[i].context.sp = (uintptr_t)&stacks[i][sizeof(stacks[i])];
    }
    thread_yield();
    active = false;
    current = -1;
    for (unsigned i = 0; i < TASK_COUNT; ++i)
        if (steps[i] != (preempt ? 1U : 3U)) panic("task made no progress");
    if (!preempt) {
        if (trace_count != 9) panic("cooperative trace incomplete");
        for (unsigned i = 0; i < 9; ++i)
            if (trace[i] != i % TASK_COUNT) panic("scheduler is not round-robin");
    } else {
        uint64_t latest_start = 0, earliest_finish = UINT64_MAX;
        for (unsigned i = 0; i < TASK_COUNT; ++i) {
            if (started[i] > latest_start) latest_start = started[i];
            if (finished[i] < earliest_finish) earliest_finish = finished[i];
        }
        if (latest_start >= earliest_finish)
            panic("no asynchronous preemption: peers started after first task finished");
        puts_os("[preempt] overlap verified before first completion\n");
    }
    irq_restore(flags);
    puts_os(preempt ? "[preempt] all tasks completed without yield\n" : "[threads] round-robin verified\n");
}
