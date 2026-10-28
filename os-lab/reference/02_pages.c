#include "os.h"
void *lab_page_alloc(void) {
    uint64_t flags = irq_save();
    for (unsigned i = 0; i < HEAP_PAGES; ++i) {
        if (!page_used[i]) {
            page_used[i] = 1;
            memset(page_pool[i], 0, PAGE_SIZE);
            irq_restore(flags);
            return page_pool[i];
        }
    }
    irq_restore(flags);
    return NULL;
}
int lab_page_free(void *page) {
    uintptr_t p = (uintptr_t)page, begin = (uintptr_t)page_pool;
    if (p < begin || p >= begin + sizeof(page_pool) || (p - begin) % PAGE_SIZE) return -1;
    unsigned i = (unsigned)((p - begin) / PAGE_SIZE);
    uint64_t flags = irq_save();
    if (!page_used[i]) { irq_restore(flags); return -1; }
    page_used[i] = 0;
    irq_restore(flags);
    return 0;
}
