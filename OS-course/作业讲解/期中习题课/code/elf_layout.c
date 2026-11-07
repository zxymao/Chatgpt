#define _POSIX_C_SOURCE 200809L
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

int g_data = 7;
int g_bss;
int g_zero = 0;
static int s_data = 9;
static int s_bss;
const char ro_msg[] = "hello ELF";
char *sdata = "literal string";

int main(void) {
    int local = 11;
    int *p = malloc(5 * sizeof(*p));
    if (!p) { perror("malloc"); return 1; }
    for (int i = 0; i < 5; ++i) p[i] = i + 1;
    printf("pid=%ld\n",(long)getpid());
    printf("g_data=%p value=%d\n",(void *)&g_data,g_data);
    printf("s_data=%p value=%d\n",(void *)&s_data,s_data);
    printf("g_bss=%p value=%d\n",(void *)&g_bss,g_bss);
    printf("g_zero=%p value=%d\n",(void *)&g_zero,g_zero);
    printf("s_bss=%p value=%d\n",(void *)&s_bss,s_bss);
    printf("ro_msg=%p value=%s\n",(const void *)ro_msg,ro_msg);
    printf("&sdata=%p sdata=%p\n",(void *)&sdata,(void *)sdata);
    printf("local=%p &p=%p p=%p heap_first=%d\n",(void *)&local,(void *)&p,(void *)p,p[0]);
    free(p);
    return 0;
}
