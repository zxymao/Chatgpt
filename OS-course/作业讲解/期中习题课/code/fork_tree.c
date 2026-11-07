/* Instrumented version of homework 2.3. Keep LOOP=3 and the for-loop unchanged.
 * --expand omits the child's return. waitpid after the loop only reaps children.
 */
#include "common.h"
#include <sys/wait.h>
#define LOOP 3
int main(int argc, char **argv) {
    int expand=argc==2 && !strcmp(argv[1],"--expand");
    if (argc>2 || (argc==2 && !expand)) return 2;
    setvbuf(stdout,NULL,_IONBF,0);
    printf("ROOT pid=%ld expand=%d\n",(long)getpid(),expand);
    for (int loop=0; loop<LOOP; loop++) {
        pid_t pid=fork();
        if (pid<0) { perror("fork"); return 1; }
        else if (pid==0) {
            printf("CREATE pid=%ld parent=%ld iteration=%d\n",(long)getpid(),(long)getppid(),loop);
            if (!expand) return 0;
        } else {
            sleep(5);
        }
    }
    int status;
    while (waitpid(-1,&status,0)>0 || errno==EINTR) { errno=0; }
    return 0;
}
