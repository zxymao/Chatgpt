#include "os.h"
int lab_parse_command(const char *line, const char **argument) {
    static const struct { const char *word; int code; } commands[] = {
        {"echo", CMD_ECHO}, {"mem", CMD_MEM}, {"threads", CMD_THREADS},
        {"user", CMD_USER}, {"ticks", CMD_TICKS}, {"sleep", CMD_SLEEP},
        {"preempt", CMD_PREEMPT}
    };
    while (*line == ' ') line++;
    const char *end = line;
    while (*end && *end != ' ') end++;
    const char *rest = end;
    while (*rest == ' ') rest++;
    *argument = rest;
    size_t size = (size_t)(end - line);
    for (size_t i = 0; i < sizeof(commands) / sizeof(commands[0]); ++i) {
        if (lab_strlen(commands[i].word) != size) continue;
        size_t j = 0;
        while (j < size && line[j] == commands[i].word[j]) j++;
        if (j == size && (commands[i].code == CMD_ECHO || !*rest)) return commands[i].code;
    }
    return CMD_UNKNOWN;
}
