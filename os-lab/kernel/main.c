#include "os.h"

int getchar_os(void);
/* Boot-shell commands are scaffolding, deliberately independent of lab1/6. */
static bool equal(const char *a, const char *b) {
    while (*a && *a == *b) { a++; b++; }
    return *a == *b;
}
static void help(void) {
    puts_os("Built in: help | info | check 1..6 | check all | quit\n");
    puts_os("Lab6: echo TEXT | mem | threads | user | ticks | sleep | preempt\n");
    puts_os("These are UART commands inside YOUR kernel, not Linux commands.\n");
}
static void execute(const char *line) {
    if (equal(line, "help")) { help(); return; }
    if (equal(line, "info")) {
        puts_os("TinyRV: RV64, one hart, S-mode kernel, UART, OpenSBI, no paging\n");
        return;
    }
    if (equal(line, "quit")) { puts_os("Bye from TinyRV\n"); poweroff(0); }
    if (equal(line, "check all")) {
        int failed = 0;
        for (unsigned i = 1; i <= 6; ++i) failed |= check_lab(i);
        puts_os(failed ? "[CHECKS FAILED]\n" : "[ALL LABS PASS]\n");
        return;
    }
    if (line[0] == 'c' && line[1] == 'h' && line[2] == 'e' &&
        line[3] == 'c' && line[4] == 'k' && line[5] == ' ' &&
        line[6] >= '1' && line[6] <= '6' && !line[7]) {
        check_lab((unsigned)(line[6] - '0')); return;
    }
    const char *argument = NULL;
    switch (lab_parse_command(line, &argument)) {
    case CMD_ECHO: puts_os(argument); puts_os("\n"); break;
    case CMD_MEM: memory_demo(); break;
    case CMD_THREADS:
        if (!check_lab(3)) threads_demo(false);
        break;
    case CMD_USER:
        check_lab(4); break;
    case CMD_TICKS: print_u64(ticks); puts_os(" timer ticks\n"); break;
    case CMD_SLEEP:
        if (lab_timer_start()) puts_os("Complete lab5 first.\n");
        else { sleep_ticks(100); puts_os("awake after 100 timer ticks\n"); }
        break;
    case CMD_PREEMPT: check_lab(5); break;
    default: puts_os("Unknown command (complete lab6 for extra commands).\n");
    }
}
void shell(void) {
    char line[128] = {0};
    for (;;) {
        puts_os("tinyrv> ");
        size_t n = 0;
        for (;;) {
            int ch = getchar_os();
            if (ch == '\r' || ch == '\n') { putchar_os('\n'); break; }
            if ((ch == 8 || ch == 127) && n) { n--; puts_os("\b \b"); }
            else if (ch >= 32 && ch < 127 && n + 1 < sizeof(line)) {
                line[n++] = (char)ch; putchar_os(ch);
            }
        }
        line[n] = 0;
        if (n) execute(line);
        memset(line, 0, sizeof(line));
    }
}
void kernel_main(void) {
    puts_os("\n[TinyRV boot OK]\n");
    puts_os("You are running your own freestanding kernel. Type help.\n");
    shell();
}
