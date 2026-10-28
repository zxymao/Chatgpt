#include "os.h"
int lab_choose_next(const struct task *tasks, int current, size_t count) {
    if (!count) return -1;
    size_t start = current < 0 ? 0 : ((size_t)current + 1) % count;
    for (size_t n = 0; n < count; ++n) {
        size_t i = (start + n) % count;
        if (tasks[i].state == TASK_READY) return (int)i;
    }
    return -1;
}
