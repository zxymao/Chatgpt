#include "p2.h"
void p2_init_pcb(struct p2_pcb *p, unsigned pid, uintptr_t entry, uintptr_t top) {
    (void)p; (void)pid; (void)entry; (void)top;
    /* L7: zero context; pid; READY; ra=entry; sp aligned down to 16. */
    panic("TODO P2 task1: init PCB");
}
void p2_enqueue(struct p2_queue *q, unsigned pid) {
    (void)q; (void)pid;
    /* L10: FIFO append; reject duplicates, overflow and invalid pid. */
    panic("TODO P2 task1: ready enqueue");
}
int p2_dequeue(struct p2_queue *q) {
    (void)q;
    /* L10: remove FIFO head, shift remaining entries; empty -> -1. */
    panic("TODO P2 task1: ready dequeue");
}
void p2_schedule(void) {
    /* L11: requeue only RUNNING current, select READY head, mark RUNNING.
     * p2_switch_to(next) updates current and tp then switches real registers.
     * -1 is the host/idle continuation; do not enqueue BLOCKED/DONE. */
    panic("TODO P2 task1: scheduler");
}
