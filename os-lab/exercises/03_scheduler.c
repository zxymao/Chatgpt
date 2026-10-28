#include "os.h"
int lab_choose_next(const struct task *tasks, int current, size_t count) {
    (void)tasks; (void)current; (void)count;
    /* TODO(L3): search cyclically starting AFTER current (or at 0 for -1).
     * Select only TASK_READY, examine at most count entries, return -1 if none.
     * This function selects a task; arch/switch.S switches real registers. */
    return -1;
}
