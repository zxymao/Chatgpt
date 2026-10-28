#include "p2.h"
long p2_dispatch(uint64_t number, uint64_t a0, uint64_t a1) {
    (void)number; (void)a0; (void)a1;
    /* L18-19: number in a7; WRITE uses checked user range; TIME reads timer;
     * unknown -> -38. Never dereference first and check afterward. */
    return TODO_ERROR;
}
void p2_handle_ecall(struct trapframe *frame) {
    (void)frame;
    /* L19: sepc += 4 exactly once; result -> saved a0 (x[10]). */
    panic("TODO P2 task3: syscall trap frame");
}
