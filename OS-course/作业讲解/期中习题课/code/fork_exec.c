#include "common.h"
#include <sys/wait.h>

int main(int argc, char **argv) {
    if (argc > 2 || (argc == 2 && strcmp(argv[1],"--ls"))) {
        fprintf(stderr,"usage: %s [--ls]\n",argv[0]); return 2;
    }
    int a[42];
    for (int i = 0; i < 42; ++i) a[i] = i + 1;
    fflush(NULL);
    pid_t pid = fork();
    if (pid < 0) { perror("fork"); return 1; }
    if (pid == 0) {
        int sum = 0;
        for (int i = 0; i < 42; ++i) sum += a[i];
        printf("child sum=%d\n",sum);
        if (fflush(stdout)) _exit(1);
        if (argc == 2) {
            execl("/bin/ls", "ls", "-l", "/usr/bin", (char *)NULL);
            perror("execl"); _exit(127);
        }
        _exit(sum == 903 ? 0 : 1);
    }
    int status;
    while (waitpid(pid,&status,0) < 0) {
        if (errno == EINTR) continue;
        perror("waitpid"); return 1;
    }
    if (!WIFEXITED(status) || WEXITSTATUS(status)) {
        fputs("child did not exit successfully\n",stderr); return 1;
    }
    puts("parent process finishes");
    return 0;
}
