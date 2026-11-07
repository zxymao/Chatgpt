#include "common.h"
#include <stdatomic.h>
enum { BATCH=200 };
static int *data;
static size_t limit, index_counter;
static atomic_int interested[2], turn;
static pthread_mutex_t mutex=PTHREAD_MUTEX_INITIALIZER;
static const char *mode;
static void peterson_lock(int me) {
    int other=1-me;
    atomic_store_explicit(&interested[me],1,memory_order_seq_cst);
    atomic_store_explicit(&turn,other,memory_order_seq_cst);
    while (atomic_load_explicit(&interested[other],memory_order_seq_cst) &&
           atomic_load_explicit(&turn,memory_order_seq_cst)==other) {}
}
static void peterson_unlock(int me) {
    atomic_store_explicit(&interested[me],0,memory_order_seq_cst);
}
static void *writer(void *ptr) {
    int parity=*(int *)ptr;
    for (size_t base=0; base<limit/2; ) {
        size_t k=limit/2-base; if(k>BATCH) k=BATCH;
        if (!strcmp(mode,"atomic200")) {
            size_t end=__atomic_add_fetch(&index_counter,k,__ATOMIC_RELAXED);
            size_t start=end-k;
            for(size_t j=0;j<k;++j)data[start+j]=(int)(2*(base+j)) + parity;
        } else if (!strcmp(mode,"atomic1")) {
            for(size_t j=0;j<k;++j) {
                size_t pos=__atomic_add_fetch(&index_counter,1,__ATOMIC_RELAXED)-1;
                data[pos]=(int)(2*(base+j))+parity;
            }
        } else {
            if(!strcmp(mode,"peterson"))peterson_lock(parity);
            else PCHECK(pthread_mutex_lock(&mutex));
            for(size_t j=0;j<k;++j)data[index_counter++]=(int)(2*(base+j))+parity;
            if(!strcmp(mode,"peterson"))peterson_unlock(parity);
            else PCHECK(pthread_mutex_unlock(&mutex));
        }
        base+=k;
    }
    return NULL;
}
int main(int argc,char **argv) {
    if(argc!=2 || (strcmp(argv[1],"peterson") && strcmp(argv[1],"mutex") &&
                   strcmp(argv[1],"atomic1") && strcmp(argv[1],"atomic200"))) {
        fprintf(stderr,"usage: %s peterson|mutex|atomic1|atomic200\n",argv[0]);return 2;
    }
    mode=argv[1];limit=10000000;
    data=malloc(limit*sizeof(*data)); assert(data);
    int parity[2]={0,1};pthread_t t[2]; double start=seconds();
    for(int i=0;i<2;++i)PCHECK(pthread_create(&t[i],NULL,writer,&parity[i]));
    for(int i=0;i<2;++i)PCHECK(pthread_join(t[i],NULL));
    double ms=(seconds()-start)*1000;
    assert(index_counter==limit);
    unsigned char *seen=calloc(limit,1);assert(seen);
    int64_t largest=0;
    for(size_t i=0;i<limit;++i) {
        assert(data[i]>=0 && (size_t)data[i]<limit);
        assert(!seen[data[i]]); seen[data[i]]=1;
        if(i) {int64_t d=llabs((int64_t)data[i]-data[i-1]);if(d>largest)largest=d;}
    }
    for(size_t i=0;i<limit;++i)assert(seen[i]);
    printf("mode=%s count=%zu range=[0,%zu) max_adjacent_difference=%" PRId64 " elapsed_ms=%.3f coverage=PASS\n",
           mode,index_counter,limit,largest,ms);
    free(seen);free(data);PCHECK(pthread_mutex_destroy(&mutex));return 0;
}
