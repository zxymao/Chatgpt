#include "p2.h"
void p2_block(struct p2_queue *q) {
    if (p2_current < 0) panic("cannot block host");
    p2_tasks[p2_current].state = P2_BLOCKED;
    p2_enqueue(q, (unsigned)p2_current);
    p2_schedule();
}
int p2_unblock(struct p2_queue *q) {
    int pid = p2_dequeue(q);
    if (pid >= 0) {
        p2_tasks[pid].state = P2_READY;
        p2_enqueue(&p2_ready, (unsigned)pid);
    }
    return pid;
}
void p2_mutex_init(struct p2_mutex *lock) {
    lock->owner = -1;
    lock->waiters.count = 0;
}
void p2_mutex_acquire(struct p2_mutex *lock) {
    uint64_t flags = irq_save();
    if (lock->owner == p2_current) panic("recursive mutex acquire");
    if (lock->owner < 0) lock->owner = p2_current;
    else {
        p2_block(&lock->waiters);
        if (lock->owner != p2_current) panic("mutex handoff lost");
    }
    irq_restore(flags);
}
void p2_mutex_release(struct p2_mutex *lock) {
    uint64_t flags = irq_save();
    if (lock->owner != p2_current) panic("mutex release by non-owner");
    /* Direct handoff: no unlocked window in which a newcomer can steal it. */
    lock->owner = p2_unblock(&lock->waiters);
    irq_restore(flags);
}
