#include "common.h"
#include <sys/syscall.h>

#if !defined(__x86_64__)
#error "This example uses the Linux x86-64 syscall ABI."
#endif
static inline long raw0(long nr) {
    long r;
    __asm__ volatile("syscall" : "=a"(r) : "0"(nr) : "rcx", "r11", "memory", "cc");
    return r;
}
#define DEFINE_BENCH(name, expr) \
static __attribute__((noinline)) uint64_t name(size_t n) { \
    uint64_t sum = 0; for (size_t i = 0; i < n; ++i) sum += (uint64_t)(expr); return sum; \
}
DEFINE_BENCH(libc_pid, getpid())
DEFINE_BENCH(call_pid, syscall(SYS_getpid))
DEFINE_BENCH(asm_pid, raw0(SYS_getpid))
DEFINE_BENCH(libc_ppid, getppid())
DEFINE_BENCH(call_ppid, syscall(SYS_getppid))
DEFINE_BENCH(asm_ppid, raw0(SYS_getppid))

int main(void) {
    const size_t n = 200000;
    const int repeats = 9;
    const char *names[] = {"getpid,glibc", "getpid,syscall", "getpid,asm",
                           "getppid,glibc", "getppid,syscall", "getppid,asm"};
    uint64_t (*funcs[])(size_t) = {libc_pid,call_pid,asm_pid,libc_ppid,call_ppid,asm_ppid};
    int cpus[CPU_SETSIZE]; allowed_cpus(cpus); pin_self(cpus[0]);
    double samples[6][9]; uint64_t checksum = 0;
    for (int j = 0; j < 6; ++j) checksum ^= funcs[j](10000);
    for (int r = 0; r < repeats; ++r) {
        for (int k = 0; k < 6; ++k) {
            int j = (r + k) % 6;
            double t = seconds();
            uint64_t actual = funcs[j](n);
            double elapsed = seconds() - t;
            long expected = j < 3 ? (long)getpid() : (long)getppid();
            assert(actual == (uint64_t)expected * n);
            checksum += actual;
            samples[j][r] = elapsed * 1e9 / (double)n;
        }
    }
    printf("# CPU=%d calls_per_sample=%zu repeats=%d checksum=%" PRIu64 "\n", cpus[0],n,repeats,checksum);
    puts("syscall,method,median_ns_per_call,min_ns,max_ns");
    for (int j = 0; j < 6; ++j) {
        qsort(samples[j],repeats,sizeof(double),compare_double);
        printf("%s,%.2f,%.2f,%.2f\n",names[j],samples[j][repeats/2],samples[j][0],samples[j][repeats-1]);
    }
    return 0;
}
