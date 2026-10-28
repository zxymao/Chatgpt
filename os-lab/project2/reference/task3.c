#include "p2.h"
long p2_dispatch(uint64_t number, uint64_t a0, uint64_t a1) {
    switch (number) {
    case SYS_WRITE: return sys_write_checked(a0, a1);
    case SYS_TIME: return (long)read_time();
    default: return -38;
    }
}
void p2_handle_ecall(struct trapframe *frame) {
    frame->sepc += 4;
    frame->x[10] = (uint64_t)p2_dispatch(frame->x[17], frame->x[10], frame->x[11]);
}
