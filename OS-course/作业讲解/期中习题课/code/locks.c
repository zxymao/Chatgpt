#include "common.h"
#include <sys/resource.h>
static pthread_mutex_t mutex=PTHREAD_MUTEX_INITIALIZER;
static pthread_spinlock_t spin;
static pthread_barrier_t ready,go;
static uint64_t counter;
static size_t n,work;
static int use_spin;
typedef struct {int id,cpu;uint64_t checksum;} Arg;
static void barrier(pthread_barrier_t *b) {
    int rc=pthread_barrier_wait(b);
    if(rc!=0 && rc!=PTHREAD_BARRIER_SERIAL_THREAD) {fprintf(stderr,"barrier: %s\n",strerror(rc));exit(1);}
}
static void *worker(void *ptr) {
    Arg *a=ptr;uint64_t v=(uint64_t)a->id+1;
    pin_self(a->cpu);barrier(&ready);barrier(&go);
    for(size_t i=0;i<n;++i) {
        if(use_spin)PCHECK(pthread_spin_lock(&spin));else PCHECK(pthread_mutex_lock(&mutex));
        ++counter;
        for(size_t j=0;j<work;++j)v=(v^(uint64_t)(i+j+1))*UINT64_C(6364136223846793005)+1;
        if(use_spin)PCHECK(pthread_spin_unlock(&spin));else PCHECK(pthread_mutex_unlock(&mutex));
    }
    a->checksum=v;return NULL;
}
static double timeval_seconds(struct timeval t){return (double)t.tv_sec+t.tv_usec*1e-6;}
int main(int argc,char **argv) {
    if(argc!=5 || (strcmp(argv[1],"spin") && strcmp(argv[1],"mutex")) ||
       (strcmp(argv[4],"same") && strcmp(argv[4],"spread"))) {
        fprintf(stderr,"usage: %s mutex|spin N L same|spread\n",argv[0]);return 2;
    }
    use_spin=!strcmp(argv[1],"spin");n=strtoull(argv[2],NULL,10);work=strtoull(argv[3],NULL,10);
    if(!n || n>10000000 || work>1000000)return 2;
    int cpus[CPU_SETSIZE],ncpu=allowed_cpus(cpus);
    Arg a[2]={{0,cpus[0],0},{1,!strcmp(argv[4],"spread")?cpus[ncpu>1?1:0]:cpus[0],0}};
    pthread_t threads[2];PCHECK(pthread_spin_init(&spin,PTHREAD_PROCESS_PRIVATE));
    PCHECK(pthread_barrier_init(&ready,NULL,3));PCHECK(pthread_barrier_init(&go,NULL,3));
    for(int i=0;i<2;++i)PCHECK(pthread_create(&threads[i],NULL,worker,&a[i]));
    barrier(&ready);
    struct rusage before,after; if(getrusage(RUSAGE_SELF,&before)){perror("getrusage");return 1;}
    double start=seconds();barrier(&go);
    for(int i=0;i<2;++i)PCHECK(pthread_join(threads[i],NULL));
    double elapsed=seconds()-start;
    if(getrusage(RUSAGE_SELF,&after)){perror("getrusage");return 1;}
    assert(counter==2*n);
    double user=timeval_seconds(after.ru_utime)-timeval_seconds(before.ru_utime);
    double system=timeval_seconds(after.ru_stime)-timeval_seconds(before.ru_stime);
    printf("lock=%s N=%zu L=%zu CPUs=%d:%d wall_ms=%.3f user_ms=%.3f system_ms=%.3f counter=%" PRIu64 " checksum=%" PRIu64 "\n",
           argv[1],n,work,a[0].cpu,a[1].cpu,elapsed*1000,user*1000,system*1000,counter,a[0].checksum^a[1].checksum);
    PCHECK(pthread_barrier_destroy(&ready));PCHECK(pthread_barrier_destroy(&go));
    PCHECK(pthread_spin_destroy(&spin));PCHECK(pthread_mutex_destroy(&mutex));return 0;
}
