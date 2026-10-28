#include "os.h"
void *lab_page_alloc(void) {
    /* TODO(L2): protect metadata; find a free pool page, mark it, zero it.
     * Exhaustion must return NULL. The bitmap and pool are declared in os.h. */
    return NULL;
}
int lab_page_free(void *page) {
    (void)page;
    /* TODO(L2): reject non-pool, misaligned, and already-free pointers (-1).
     * Otherwise release the slot and return 0. Restore the old IRQ state. */
    return -1;
}
