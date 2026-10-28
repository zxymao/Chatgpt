#include "os.h"
long lab_syscall(uint64_t number, uint64_t arg0, uint64_t arg1) {
    (void)number; (void)arg0; (void)arg1;
    /* TODO(L4): SYS_WRITE -> sys_write_checked(arg0,arg1), SYS_TIME -> read_time().
     * Unknown numbers return -38. SYS_EXIT is handled by the demo harness.
     * Never directly dereference an unvalidated user pointer. */
    return TODO_ERROR;
}
