#ifndef LEARNING_OS_H
#define LEARNING_OS_H
#include <stddef.h>
#include <stdint.h>
#include <stdbool.h>

#define PAGE_SIZE 4096UL
#define HEAP_PAGES 32
#define TASK_COUNT 3
#define TIMEBASE 10000000UL /* QEMU virt/OpenSBI platform, 10 MHz */
#define TIMER_INTERVAL (TIMEBASE / 100)
#define SSTATUS_SIE (1UL << 1)
#define SSTATUS_SPIE (1UL << 5)
#define SSTATUS_SPP (1UL << 8)
#define SIE_STIE (1UL << 5)
#define TODO_ERROR (-999L)
#define SYS_WRITE 1
#define SYS_TIME 2
#define SYS_EXIT 3

static inline uint64_t read_time(void) {
    uint64_t value;
    __asm__ volatile("rdtime %0" : "=r"(value));
    return value;
}
static inline uint64_t irq_save(void) {
    uint64_t value;
    __asm__ volatile("csrrc %0, sstatus, %1" : "=r"(value) : "r"(SSTATUS_SIE) : "memory");
    return value;
}
static inline void irq_restore(uint64_t value) {
    if (value & SSTATUS_SIE)
        __asm__ volatile("csrs sstatus, %0" :: "r"(SSTATUS_SIE) : "memory");
}
static inline void enable_irq(void) {
    __asm__ volatile("csrs sstatus, %0" :: "r"(SSTATUS_SIE) : "memory");
}
void set_timer(uint64_t deadline);
void putchar_os(int ch);
void puts_os(const char *s);
void print_u64(uint64_t value);
void print_hex(uint64_t value);
void panic(const char *message) __attribute__((noreturn));
void poweroff(int status) __attribute__((noreturn));
void *memset(void *dst, int byte, size_t size);
void *memcpy(void *dst, const void *src, size_t size);

enum task_state { TASK_UNUSED, TASK_READY, TASK_RUNNING, TASK_DONE };
struct context { uint64_t ra, sp, s[12]; };
struct task {
    struct context context;
    enum task_state state;
    unsigned id;
};
struct trapframe { uint64_t x[32], sstatus, sepc, stval, scause; };
extern volatile uint64_t ticks;
extern unsigned char page_used[HEAP_PAGES];
extern unsigned char page_pool[HEAP_PAGES][PAGE_SIZE];
void context_switch(struct context *from, struct context *to);
void trap_entry(void);
void trap_handler(struct trapframe *frame);
long run_user(void);
void user_return(void);
extern uint64_t user_resume_sp;
extern char __user_start[], __user_end[];

/* The six student APIs. See exercises/ and docs/LESSONS.md. */
size_t lab_strlen(const char *s);
int lab_streq(const char *a, const char *b);
void *lab_page_alloc(void);
int lab_page_free(void *page);
int lab_choose_next(const struct task *tasks, int current, size_t count);
long lab_syscall(uint64_t number, uint64_t arg0, uint64_t arg1);
int lab_timer_start(void);
enum command {
    CMD_UNKNOWN = 0, CMD_ECHO, CMD_MEM, CMD_THREADS,
    CMD_USER, CMD_TICKS, CMD_SLEEP, CMD_PREEMPT
};
int lab_parse_command(const char *line, const char **argument);

long sys_write_checked(uint64_t address, uint64_t size);
void threads_demo(bool preempt);
void thread_yield(void);
void scheduler_tick(void);
void memory_demo(void);
void user_demo(void);
void sleep_ticks(uint64_t count);
int check_lab(unsigned number);
void shell(void);
#endif
