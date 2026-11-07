#include "common.h"

enum { MAX_WORKERS = 4, REPEATS = 7 };
typedef struct {
    const int *array;
    size_t begin, end;
    int find_max, cpu;
    int64_t result;
} Arg;

static __attribute__((noinline)) int64_t scan(const int *a, size_t begin, size_t end, int maximum) {
    int64_t r = maximum ? INT_MIN : 0;
    if (maximum) { for (size_t i=begin; i<end; ++i) if (a[i]>r) r=a[i]; }
    else { for (size_t i=begin; i<end; ++i) r += a[i]; }
    return r;
}
static void *worker(void *ptr) {
    Arg *a = ptr;
    if (a->cpu >= 0) pin_self(a->cpu);
    a->result = scan(a->array,a->begin,a->end,a->find_max);
    pthread_exit(NULL);
}
static double measure(const int *array, size_t n, int maximum, int mode, int nworkers,
                      const int *cpus, int ncpus, int64_t expected) {
    double samples[REPEATS];
    for (int run=-1; run<REPEATS; ++run) {
        double start=seconds(); int64_t result;
        if (mode == 0) result=scan(array,0,n,maximum);
        else {
            pthread_t th[MAX_WORKERS]; Arg args[MAX_WORKERS];
            for (int i=0; i<nworkers; ++i) {
                args[i]=(Arg){array,n*(size_t)i/(size_t)nworkers,n*(size_t)(i+1)/(size_t)nworkers,
                              maximum,mode==1?-1:(mode==2?cpus[i%ncpus]:cpus[0]),0};
                PCHECK(pthread_create(&th[i],NULL,worker,&args[i]));
            }
            result=maximum?INT_MIN:0;
            for (int i=0; i<nworkers; ++i) {
                PCHECK(pthread_join(th[i],NULL));
                if (maximum) { if (args[i].result>result) result=args[i].result; }
                else result+=args[i].result;
            }
        }
        double elapsed=seconds()-start;
        assert(result==expected);
        if (run>=0) samples[run]=elapsed*1000;
    }
    qsort(samples,REPEATS,sizeof(double),compare_double);
    return samples[REPEATS/2];
}
static void experiment(size_t n, int maximum, const int *cpus, int ncpus) {
    int *array=malloc(n*sizeof(*array)); assert(array);
    uint32_t seed=20261107;
    for (size_t i=0; i<n; ++i) array[i]=maximum?(int)(rng_next(&seed)%1000000+1):(int)(i+1);
    int64_t expected=scan(array,0,n,maximum);
    if (!maximum) assert(expected==(int64_t)n*((int64_t)n+1)/2);
    const char *modes[]={"serial","threads-unbound","threads-spread","threads-same-cpu"};
    int workers=ncpus<MAX_WORKERS?ncpus:MAX_WORKERS;
    if (workers<2) workers=2;
    for (int mode=0; mode<4; ++mode) {
        double ms=measure(array,n,maximum,mode,workers,cpus,ncpus,expected);
        printf("%s,%zu,%s,%d,%.6f,%" PRId64 "\n",maximum?"max":"sum",n,modes[mode],mode?workers:1,ms,expected);
    }
    free(array);
}
int main(void) {
    int cpus[CPU_SETSIZE],ncpus=allowed_cpus(cpus);
    printf("# allowed_cpus="); for(int i=0;i<ncpus;++i)printf("%s%d",i?":":"",cpus[i]);
    puts("; each threaded measurement INCLUDES creation, affinity calls and join; initialization excluded");
    puts("operation,elements,mode,workers,median_ms,result");
    experiment(1000000,0,cpus,ncpus);
    experiment(10000,1,cpus,ncpus);
    experiment(10000000,1,cpus,ncpus);
    return 0;
}
