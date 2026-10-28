#include "p2.h"
void p2_init_pcb(struct p2_pcb *p, unsigned pid, uintptr_t entry, uintptr_t top) {
    memset(p, 0, sizeof(*p));
    p->pid = pid;
    p->state = P2_READY;
    p->context.ra = entry;
    p->context.sp = top & ~(uintptr_t)15;
}
void p2_enqueue(struct p2_queue *q, unsigned pid) {
    for (unsigned i = 0; i < q->count; ++i)
        if (q->ids[i] == pid) panic("duplicate queue entry");
    if (q->count >= TASK_COUNT || pid >= TASK_COUNT) panic("bad queue insertion");
    q->ids[q->count++] = pid;
}
int p2_dequeue(struct p2_queue *q) {
    if (!q->count) return -1;
    unsigned pid = q->ids[0];
    for (unsigned i = 1; i < q->count; ++i) q->ids[i-1] = q->ids[i];
    --q->count;
    return (int)pid;
}
void p2_schedule(void) {
    if (p2_current >= 0 && p2_tasks[p2_current].state == P2_RUNNING) {
        p2_tasks[p2_current].state = P2_READY;
        p2_enqueue(&p2_ready, (unsigned)p2_current);
    }
    int next = p2_dequeue(&p2_ready);
    if (next >= 0) p2_tasks[next].state = P2_RUNNING;
    p2_switch_to(next);
}
