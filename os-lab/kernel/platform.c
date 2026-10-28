#include "os.h"

static volatile unsigned char *const uart = (void *)0x10000000UL;
void putchar_os(int ch) {
    if (ch == '\n') putchar_os('\r');
    while (!(uart[5] & 0x20)) { }
    uart[0] = (unsigned char)ch;
}
int getchar_os(void) {
    while (!(uart[5] & 1)) { }
    return uart[0];
}
void puts_os(const char *s) { while (*s) putchar_os(*s++); }
void print_u64(uint64_t value) {
    char buffer[21];
    unsigned n = 0;
    do { buffer[n++] = '0' + value % 10; value /= 10; } while (value);
    while (n) putchar_os(buffer[--n]);
}
void print_hex(uint64_t value) {
    puts_os("0x");
    for (int shift = 60; shift >= 0; shift -= 4)
        putchar_os("0123456789abcdef"[(value >> shift) & 15]);
}
void *memset(void *dst, int byte, size_t size) {
    unsigned char *p = dst;
    for (size_t i = 0; i < size; ++i) p[i] = (unsigned char)byte;
    return dst;
}
void *memcpy(void *dst, const void *src, size_t size) {
    unsigned char *d = dst;
    const unsigned char *s = src;
    for (size_t i = 0; i < size; ++i) d[i] = s[i];
    return dst;
}
void set_timer(uint64_t deadline) {
    /* SBI v0.2 TIME extension. OpenSBI provides M-mode timer access. */
    register uint64_t a0 __asm__("a0") = deadline;
    register uint64_t a1 __asm__("a1") = 0;
    register uint64_t a6 __asm__("a6") = 0;
    register uint64_t a7 __asm__("a7") = 0x54494d45;
    __asm__ volatile("ecall" : "+r"(a0), "+r"(a1) : "r"(a6), "r"(a7) : "memory");
    if ((long)a0) panic("OpenSBI TIME extension unavailable");
}
void poweroff(int status) {
    *(volatile uint32_t *)0x100000UL = status ? 0x13333 : 0x5555;
    for (;;) __asm__ volatile("wfi");
}
void panic(const char *message) {
    irq_save();
    puts_os("\n[PANIC] "); puts_os(message); puts_os("\n");
    poweroff(1);
}
