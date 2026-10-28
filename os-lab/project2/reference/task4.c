#include "p2.h"
void p2_timer_start(void) {
    set_timer(read_time() + TIMER_INTERVAL);
    __asm__ volatile("csrs sie, %0" :: "r"(SIE_STIE) : "memory");
    enable_irq();
}
void p2_sleep(uint64_t duration) {
    uint64_t flags = irq_save();
    if (!duration) { p2_schedule(); irq_restore(flags); return; }
    p2_tasks[p2_current].deadline = ticks + duration;
    p2_tasks[p2_current].state = P2_SLEEPING;
    p2_enqueue(&p2_sleepers, (unsigned)p2_current);
    p2_schedule();
    irq_restore(flags);
}
void p2_wake_expired(void) {
    /* Examine every original sleeper once; future deadlines stay asleep. */
    unsigned count = p2_sleepers.count;
    while (count--) {
        int pid = p2_dequeue(&p2_sleepers);
        if ((int64_t)(ticks - p2_tasks[pid].deadline) >= 0) {
            p2_tasks[pid].state = P2_READY;
            p2_enqueue(&p2_ready, (unsigned)pid);
        } else p2_enqueue(&p2_sleepers, (unsigned)pid);
    }
}
void p2_on_timer(void) {
    set_timer(read_time() + TIMER_INTERVAL);
    ++ticks;
    p2_wake_expired();
    p2_schedule();
}
