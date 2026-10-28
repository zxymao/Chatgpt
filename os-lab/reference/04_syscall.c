#include "os.h"
long lab_syscall(uint64_t number, uint64_t arg0, uint64_t arg1) {
    switch (number) {
    case SYS_WRITE: return sys_write_checked(arg0, arg1);
    case SYS_TIME: return (long)read_time();
    default: return -38;
    }
}
