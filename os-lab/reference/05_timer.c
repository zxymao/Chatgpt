#include "os.h"
int lab_timer_start(void) {
    set_timer(read_time() + TIMER_INTERVAL);
    __asm__ volatile("csrs sie, %0" :: "r"(SIE_STIE) : "memory");
    enable_irq();
    return 0;
}
