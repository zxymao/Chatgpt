#include "os.h"

unsigned char page_used[HEAP_PAGES];
unsigned char page_pool[HEAP_PAGES][PAGE_SIZE] __attribute__((aligned(PAGE_SIZE)));
static int expect(bool condition, const char *message) {
    if (condition) return 0;
    puts_os("[detail] "); puts_os(message); puts_os("\n");
    return 1;
}
static int check_strings(void) {
    int failed = 0;
    failed |= expect(lab_strlen("") == 0, "strlen(empty)");
    failed |= expect(lab_strlen("hello") == 5, "strlen(hello)");
    failed |= expect(lab_streq("same", "same") == 1, "equal strings");
    failed |= expect(lab_streq("", "") == 1, "empty strings equal");
    failed |= expect(lab_streq("a", "ab") == 0, "prefix is not equality");
    failed |= expect(lab_streq("a", "b") == 0, "different strings");
    return failed;
}
static int check_pages(void) {
    void *pages[HEAP_PAGES];
    memset(page_used, 0, sizeof(page_used));
    for (unsigned i = 0; i < HEAP_PAGES; ++i) {
        pages[i] = lab_page_alloc();
        uintptr_t p = (uintptr_t)pages[i], begin = (uintptr_t)page_pool;
        if (expect(p >= begin && p < begin + sizeof(page_pool) && p % PAGE_SIZE == 0,
                   "allocator must return a pool page aligned to 4096")) return 1;
        for (unsigned j = 0; j < i; ++j)
            if (expect(pages[i] != pages[j], "allocator returned a live page twice")) return 1;
        for (unsigned k = 0; k < PAGE_SIZE; ++k)
            if (expect(((unsigned char *)pages[i])[k] == 0, "allocated page must be zeroed")) return 1;
        memset(pages[i], (int)i + 1, PAGE_SIZE);
    }
    if (expect(lab_page_alloc() == NULL, "exhaustion must return NULL")) return 1;
    if (expect(lab_page_free((char *)pages[0] + 1) == -1, "reject misaligned free")) return 1;
    if (expect(lab_page_free((void *)1) == -1, "reject foreign free")) return 1;
    if (expect(lab_page_free(pages[7]) == 0, "free an allocated page")) return 1;
    if (expect(lab_page_free(pages[7]) == -1, "reject double free")) return 1;
    void *again = lab_page_alloc();
    if (expect(again == pages[7], "reuse the only free page")) return 1;
    for (unsigned k = 0; k < PAGE_SIZE; ++k)
        if (expect(((unsigned char *)again)[k] == 0, "reused page must be zeroed")) return 1;
    for (unsigned i = 0; i < HEAP_PAGES; ++i)
        if (expect(lab_page_free(pages[i]) == 0, "release all pages")) return 1;
    return 0;
}
static int check_scheduler(void) {
    struct task sample[3] = {0};
    if (expect(lab_choose_next(sample, -1, 3) == -1, "empty ready set")) return 1;
    sample[0].state = TASK_READY; sample[2].state = TASK_READY;
    if (expect(lab_choose_next(sample, -1, 3) == 0, "start at first READY task")) return 1;
    if (expect(lab_choose_next(sample, 0, 3) == 2, "skip non-READY tasks")) return 1;
    if (expect(lab_choose_next(sample, 2, 3) == 0, "wrap around")) return 1;
    sample[0].state = TASK_DONE;
    if (expect(lab_choose_next(sample, 2, 3) == 2, "single runnable task")) return 1;
    threads_demo(false);
    return 0;
}
static int check_syscalls(void) {
    if (expect(lab_syscall(99, 0, 0) == -38, "unknown syscall returns -ENOSYS")) return 1;
    if (expect(lab_syscall(SYS_WRITE, 1, 1) == -14, "bad pointer returns -EFAULT")) return 1;
    uint64_t before = read_time();
    uint64_t value = (uint64_t)lab_syscall(SYS_TIME, 0, 0);
    uint64_t after = read_time();
    if (expect(value >= before && value <= after, "SYS_TIME returns actual hardware time")) return 1;
    user_demo(); /* Real sret -> U -> ecall -> S -> sret, not just a C call. */
    return 0;
}
static int check_timer(void) {
    if (expect(lab_timer_start() == 0, "initialize SBI timer and interrupt enables")) return 1;
    uint64_t before = ticks, end = read_time() + TIMEBASE * 2;
    while (ticks - before < 3 && read_time() < end) __asm__ volatile("nop");
    if (expect(ticks - before >= 3, "at least three hardware timer IRQs")) return 1;
    before = ticks;
    sleep_ticks(3);
    if (expect(ticks - before >= 3, "timer wakeup after requested ticks")) return 1;
    if (check_scheduler()) return 1; /* Valid selector is a prerequisite. */
    threads_demo(true);
    return 0;
}
static int check_commands(void) {
    const char *arg = NULL;
    if (expect(lab_parse_command("echo hello world", &arg) == CMD_ECHO && arg &&
               lab_streq(arg, "hello world"), "echo argument")) return 1;
    if (expect(lab_parse_command("   mem  ", &arg) == CMD_MEM, "leading/trailing spaces")) return 1;
    if (expect(lab_parse_command("threads", &arg) == CMD_THREADS, "threads command")) return 1;
    if (expect(lab_parse_command("user", &arg) == CMD_USER, "user command")) return 1;
    if (expect(lab_parse_command("ticks", &arg) == CMD_TICKS, "ticks command")) return 1;
    if (expect(lab_parse_command("sleep", &arg) == CMD_SLEEP, "sleep command")) return 1;
    if (expect(lab_parse_command("preempt", &arg) == CMD_PREEMPT, "preempt command")) return 1;
    if (expect(lab_parse_command("memory", &arg) == CMD_UNKNOWN, "match whole command, not prefix")) return 1;
    if (expect(lab_parse_command("mem extra", &arg) == CMD_UNKNOWN, "reject extra arguments")) return 1;
    if (expect(lab_parse_command("", &arg) == CMD_UNKNOWN, "empty input")) return 1;
    return 0;
}
int check_lab(unsigned number) {
    int failed;
    switch (number) {
    case 1: failed = check_strings(); break;
    case 2: failed = check_pages(); break;
    case 3: failed = check_scheduler(); break;
    case 4: failed = check_syscalls(); break;
    case 5: failed = check_timer(); break;
    case 6: failed = check_commands(); break;
    default: puts_os("Choose a lab from 1 to 6.\n"); return 1;
    }
    puts_os(failed ? "[FAIL lab" : "[PASS lab"); print_u64(number); puts_os("]\n");
    return failed;
}
void memory_demo(void) {
    void *page = lab_page_alloc();
    if (!page) { puts_os("No page: complete lab2 or free resources.\n"); return; }
    puts_os("allocated page "); print_hex((uintptr_t)page); puts_os("\n");
    if (lab_page_free(page)) panic("could not free demo page");
    puts_os("page returned to pool\n");
}
