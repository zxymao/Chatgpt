#include "common.h"
static int data[5],version=0,expected;
static pthread_mutex_t m=PTHREAD_MUTEX_INITIALIZER;
static void *producer(void *unused) {
    (void)unused;uint32_t seed=20261107;
    for(int r=0;r<5;) {
        PCHECK(pthread_mutex_lock(&m));
        if(version==2*r) {
            expected=0;printf("write round=%d data=",r+1);
            for(int i=0;i<5;++i) {
                data[i]=(int)(rng_next(&seed)%20+1);expected+=data[i];
                printf("%s%d",i?",":"",data[i]);
            }
            printf(" expected=%d\n",expected);++version;++r;
        }
        PCHECK(pthread_mutex_unlock(&m));
    }
    return NULL;
}
static void *consumer(void *unused) {
    (void)unused;
    for(int r=0;r<5;) {
        PCHECK(pthread_mutex_lock(&m));
        if(version==2*r+1) {
            int sum=0;for(int i=0;i<5;++i)sum+=data[i];
            assert(sum==expected);
            printf("read  round=%d sum=%d PASS\n",r+1,sum);++version;++r;
        }
        PCHECK(pthread_mutex_unlock(&m));
    }
    return NULL;
}
int main(void) {
    pthread_t p,c;PCHECK(pthread_create(&p,NULL,producer,NULL));PCHECK(pthread_create(&c,NULL,consumer,NULL));
    PCHECK(pthread_join(p,NULL));PCHECK(pthread_join(c,NULL));assert(version==10);
    PCHECK(pthread_mutex_destroy(&m));puts("PASS: 5 matching write/read rounds, mutex and ordinary shared variables only");
    return 0;
}
