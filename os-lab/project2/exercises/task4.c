#include "p2.h"
void p2_timer_start(void) {
    /* L23: program future SBI deadline, enable STIE and SIE. */
    panic("TODO P2 task4: timer enable");
}
void p2_sleep(uint64_t duration) {
    (void)duration;
    /* L21: deadline=ticks+duration; SLEEPING queue; schedule, not busy-wait. */
    panic("TODO P2 task4: sleep");
}
void p2_wake_expired(void) {
    /* L22: wake ALL deadlines <= ticks, preserve future sleepers. */
    panic("TODO P2 task4: check sleeping");
}
void p2_on_timer(void) {
    /* L23-24: rearm, ticks++, wake expired, schedule; never increment sepc. */
    panic("TODO P2 task4: asynchronous preemption");
}
