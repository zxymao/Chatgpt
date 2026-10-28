#include "p2.h"
void p2_block(struct p2_queue *q) {
    (void)q;
    /* L12: current -> BLOCKED, append to q, schedule. */
    panic("TODO P2 task2: block");
}
int p2_unblock(struct p2_queue *q) {
    (void)q;
    /* L13: FIFO dequeue, state -> READY, append ready; no immediate switch. */
    panic("TODO P2 task2: unblock");
}
void p2_mutex_init(struct p2_mutex *lock) {
    (void)lock;
    /* L14: owner=-1 and empty waiters. */
    panic("TODO P2 task2: mutex init");
}
void p2_mutex_acquire(struct p2_mutex *lock) {
    (void)lock;
    /* L14: irq_save/restore; free -> own; busy -> block, no spin loop.
     * This mutex forbids recursive acquire. Resumed waiter already owns it. */
    panic("TODO P2 task2: mutex acquire");
}
void p2_mutex_release(struct p2_mutex *lock) {
    (void)lock;
    /* L15: check owner; hand ownership directly to first unblocked waiter. */
    panic("TODO P2 task2: mutex release");
}
