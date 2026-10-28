#ifndef PET_KERNEL_PROJECT2_H
#define PET_KERNEL_PROJECT2_H
#include "os.h"

enum p2_state { P2_READY, P2_RUNNING, P2_BLOCKED, P2_SLEEPING, P2_DONE };
struct p2_pcb {
    struct context context;
    unsigned pid;
    enum p2_state state;
    uint64_t deadline;
};
struct p2_queue { unsigned ids[TASK_COUNT]; unsigned count; };
struct p2_mutex { int owner; struct p2_queue waiters; };
extern struct p2_pcb p2_tasks[TASK_COUNT];
extern struct p2_queue p2_ready, p2_sleepers;
extern int p2_current;
extern volatile uint64_t ticks;

/* Caller holds local interrupts disabled when changing queues or PCB state.
 * These are single-hart teaching primitives, not SMP synchronization. */
void p2_init_pcb(struct p2_pcb *p, unsigned pid, uintptr_t entry, uintptr_t top);
void p2_enqueue(struct p2_queue *q, unsigned pid);
int p2_dequeue(struct p2_queue *q);
void p2_schedule(void);
void p2_block(struct p2_queue *q);
int p2_unblock(struct p2_queue *q);
void p2_mutex_init(struct p2_mutex *lock);
void p2_mutex_acquire(struct p2_mutex *lock);
void p2_mutex_release(struct p2_mutex *lock);
long p2_dispatch(uint64_t number, uint64_t a0, uint64_t a1);
void p2_handle_ecall(struct trapframe *frame);
void p2_timer_start(void);
void p2_sleep(uint64_t duration);
void p2_wake_expired(void);
void p2_on_timer(void);

/* Provided platform/test scaffolding, not student answers. */
void p2_yield(void);
void p2_switch_to(int next);
int p2_register_probe(unsigned pid);
void p2_missing_context(void) __attribute__((noreturn));
void p2_missing_trap(void) __attribute__((noreturn));
#endif
