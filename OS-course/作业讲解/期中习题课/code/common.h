#ifndef HW_COMMON_H
#define HW_COMMON_H
#define _GNU_SOURCE
#include <assert.h>
#include <errno.h>
#include <inttypes.h>
#include <limits.h>
#include <pthread.h>
#include <sched.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

#define PCHECK(call) do { int rc_ = (call); if (rc_) { \
    fprintf(stderr, "%s: %s\n", #call, strerror(rc_)); exit(1); \
} } while (0)

static inline double seconds(void) {
    struct timespec ts;
    if (clock_gettime(CLOCK_MONOTONIC_RAW, &ts)) { perror("clock_gettime"); exit(1); }
    return (double)ts.tv_sec + (double)ts.tv_nsec * 1e-9;
}
static inline int allowed_cpus(int cpus[CPU_SETSIZE]) {
    cpu_set_t mask;
    if (sched_getaffinity(0, sizeof(mask), &mask)) { perror("sched_getaffinity"); exit(1); }
    int n = 0;
    for (int i = 0; i < CPU_SETSIZE; ++i) if (CPU_ISSET(i, &mask)) cpus[n++] = i;
    if (!n) { fputs("No available CPU\n", stderr); exit(1); }
    return n;
}
static inline void pin_self(int cpu) {
    cpu_set_t mask;
    CPU_ZERO(&mask); CPU_SET(cpu, &mask);
    PCHECK(pthread_setaffinity_np(pthread_self(), sizeof(mask), &mask));
}
static inline uint32_t rng_next(uint32_t *state) {
    uint32_t x = *state; x ^= x << 13; x ^= x >> 17; x ^= x << 5;
    return *state = x;
}
static inline int compare_double(const void *a, const void *b) {
    double x = *(const double *)a, y = *(const double *)b;
    return (x > y) - (x < y);
}
#endif
