#include <pthread.h>
#include <cstdio>
#include <cstdlib>
#include <cstdint>
#include <climits>
#include <string>
using namespace std;

const int M = 8;
const size_t N = 250000;
static_assert(CHAR_BIT == 8 && sizeof(uint32_t) == 4);

struct node {
    int id;
    const char *path;
} task[M];
struct result {
    uint32_t value;
    size_t count;
    bool ok;
} a[M];
pthread_barrier_t start_barrier, done_barrier;
int status = 0;

void wait_barrier(pthread_barrier_t *b) {
    int r = pthread_barrier_wait(b);
    if (r != 0 && r != PTHREAD_BARRIER_SERIAL_THREAD) exit(1);
}

void *Map(void *arg) {
    node *p = static_cast<node *>(arg);
    uint32_t maxn = 0;
    size_t count = 0;
    bool ok = true;
    wait_barrier(&start_barrier);
    FILE *f = fopen(p->path, "rb");
    if (!f) ok = false;
    else {
        unsigned char buf[16384];
        size_t len;
        while ((len = fread(buf, 1, sizeof(buf), f)) != 0) {
            if (len % 4 != 0) { ok = false; break; }
            for (size_t i = 0; i < len; i += 4) {
                uint32_t x = uint32_t(buf[i])
                    | (uint32_t(buf[i + 1]) << 8)
                    | (uint32_t(buf[i + 2]) << 16)
                    | (uint32_t(buf[i + 3]) << 24);
                if (x < 1 || x > 1000000) ok = false;
                if (x > maxn) maxn = x;
                ++count;
            }
        }
        if (ferror(f)) ok = false;
        fclose(f);
    }
    if (count != N) ok = false;
    a[p->id] = {maxn, count, ok};
    wait_barrier(&done_barrier);
    return nullptr;
}

void *Reduce(void *) {
    wait_barrier(&start_barrier);
    wait_barrier(&done_barrier);
    uint32_t maxn = 0;
    for (int i = 0; i < M; ++i) {
        if (!a[i].ok) {
            fprintf(stderr, "Invalid input: %s\n", task[i].path);
            status = 1;
        }
        if (a[i].value > maxn) maxn = a[i].value;
    }
    if (status == 0) {
        for (int i = 0; i < M; ++i)
            printf("Map %d: count=%zu, max=%u\n",
                   i, a[i].count, unsigned(a[i].value));
        printf("Global max: %u\n", unsigned(maxn));
    }
    return nullptr;
}

int main(int argc, char *argv[]) {
    if (argc != 1 && argc != M + 1) return 1;
    string path[M];
    for (int i = 0; i < M; ++i) {
        path[i] = argc == 1 ? "data/map" + to_string(i) + ".bin"
                            : argv[i + 1];
        task[i] = {i, path[i].c_str()};
    }
    if (pthread_barrier_init(&start_barrier, nullptr, M + 1) != 0)
        return 1;
    if (pthread_barrier_init(&done_barrier, nullptr, M + 1) != 0) {
        pthread_barrier_destroy(&start_barrier);
        return 1;
    }
    pthread_t map[M], reduce;
    if (pthread_create(&reduce, nullptr, Reduce, nullptr) != 0)
        exit(1);
    for (int i = 0; i < M; ++i)
        if (pthread_create(&map[i], nullptr, Map, &task[i]) != 0)
            exit(1);
    for (int i = 0; i < M; ++i) pthread_join(map[i], nullptr);
    pthread_join(reduce, nullptr);
    pthread_barrier_destroy(&done_barrier);
    pthread_barrier_destroy(&start_barrier);
    return status;
}
