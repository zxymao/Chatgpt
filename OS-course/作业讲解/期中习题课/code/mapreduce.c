#include "common.h"
#include <sys/stat.h>
enum { MAPS=8, ELEMENTS=262144 };
typedef struct {
    pthread_mutex_t mutex;
    pthread_cond_t condition;
    int done;
    int32_t values[MAPS];
    int errors[MAPS];
} Monitor;
static Monitor monitor={.mutex=PTHREAD_MUTEX_INITIALIZER,.condition=PTHREAD_COND_INITIALIZER};
static pthread_barrier_t barrier;
static int use_monitor;
static int32_t local_max[MAPS],global_max;
static int errors[MAPS],failed;
typedef struct {int id;char path[PATH_MAX];} Arg;

static void wait_barrier(void) {
    int rc=pthread_barrier_wait(&barrier);
    if(rc && rc!=PTHREAD_BARRIER_SERIAL_THREAD) {fprintf(stderr,"barrier: %s\n",strerror(rc));exit(1);}
}
static void submit(int i,int32_t value,int error) {
    PCHECK(pthread_mutex_lock(&monitor.mutex));
    monitor.values[i]=value;monitor.errors[i]=error;
    if(++monitor.done==MAPS)PCHECK(pthread_cond_signal(&monitor.condition));
    PCHECK(pthread_mutex_unlock(&monitor.mutex));
}
static void wait_all(int32_t values[MAPS],int errs[MAPS]) {
    PCHECK(pthread_mutex_lock(&monitor.mutex));
    while(monitor.done<MAPS)PCHECK(pthread_cond_wait(&monitor.condition,&monitor.mutex));
    memcpy(values,monitor.values,sizeof(monitor.values));memcpy(errs,monitor.errors,sizeof(monitor.errors));
    PCHECK(pthread_mutex_unlock(&monitor.mutex));
}
static int read_max(const char *path,int32_t *result) {
    FILE *f=fopen(path,"rb");if(!f)return errno?errno:EIO;
    struct stat st;
    if(fstat(fileno(f),&st) || st.st_size!=(off_t)(ELEMENTS*sizeof(int32_t))) {
        fclose(f);return EINVAL;
    }
    int32_t buf[4096],maximum=INT32_MIN;size_t total=0,nread;
    while((nread=fread(buf,sizeof(*buf),4096,f))>0) {
        for(size_t i=0;i<nread;++i)if(buf[i]>maximum)maximum=buf[i];
        total+=nread;
    }
    int error=ferror(f)?EIO:0;
    if(fclose(f) && !error)error=EIO;
    if(total!=ELEMENTS && !error)error=EINVAL;
    *result=maximum;return error;
}
static void *map(void *ptr) {
    Arg *a=ptr;int32_t maximum=INT32_MIN;int error=read_max(a->path,&maximum);
    if(use_monitor)submit(a->id,maximum,error);
    else {local_max[a->id]=maximum;errors[a->id]=error;wait_barrier();}
    return NULL;
}
static void *reduce(void *unused) {
    (void)unused;int32_t values[MAPS];int errs[MAPS];
    if(use_monitor)wait_all(values,errs);
    else {wait_barrier();memcpy(values,local_max,sizeof(values));memcpy(errs,errors,sizeof(errs));}
    global_max=INT32_MIN;
    for(int i=0;i<MAPS;++i) {
        if(errs[i]){fprintf(stderr,"map[%d] failed: %s\n",i,strerror(errs[i]));failed=1;}
        else if(values[i]>global_max)global_max=values[i];
    }
    return NULL;
}
int main(int argc,char **argv) {
    if(argc!=3 || (strcmp(argv[1],"barrier") && strcmp(argv[1],"monitor"))) {
        fprintf(stderr,"usage: %s barrier|monitor DATA_DIRECTORY\n",argv[0]);return 2;
    }
    use_monitor=!strcmp(argv[1],"monitor");
    Arg args[MAPS];pthread_t maps[MAPS],reducer;
    for(int i=0;i<MAPS;++i) {
        args[i].id=i;
        int len=snprintf(args[i].path,sizeof(args[i].path),"%s/map-%d.bin",argv[2],i);
        if(len<0 || (size_t)len>=sizeof(args[i].path))return 2;
    }
    PCHECK(pthread_barrier_init(&barrier,NULL,MAPS+1));
    /* On thread-creation failure PCHECK terminates the whole process: no peers
       are left waiting forever at an under-populated barrier. */
    for(int i=0;i<MAPS;++i)PCHECK(pthread_create(&maps[i],NULL,map,&args[i]));
    PCHECK(pthread_create(&reducer,NULL,reduce,NULL));
    for(int i=0;i<MAPS;++i)PCHECK(pthread_join(maps[i],NULL));
    PCHECK(pthread_join(reducer,NULL));
    if(!failed) {
        int32_t reference=INT32_MIN;
        for(int i=0;i<MAPS;++i) {
            int32_t value;int error=read_max(args[i].path,&value);
            if(error){fprintf(stderr,"serial scan failed\n");failed=1;break;}
            if(value>reference)reference=value;
            int32_t actual=use_monitor?monitor.values[i]:local_max[i];assert(value==actual);
            printf("file=%d elements=%d local_max=%" PRId32 "\n",i,ELEMENTS,actual);
        }
        if(!failed){assert(reference==global_max);printf("mode=%s global_max=%" PRId32 " serial=%" PRId32 " PASS\n",argv[1],global_max,reference);}
    }
    PCHECK(pthread_barrier_destroy(&barrier));PCHECK(pthread_mutex_destroy(&monitor.mutex));
    PCHECK(pthread_cond_destroy(&monitor.condition));return failed?1:0;
}
