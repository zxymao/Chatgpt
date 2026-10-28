#include "os.h"
int lab_parse_command(const char *line, const char **argument) {
    (void)line;
    *argument = "";
    /* TODO(L6): skip leading spaces, match an entire command word.
     * echo takes the remaining text; mem/threads/user/ticks/sleep/preempt
     * take no arguments (trailing spaces allowed). Return enum command.
     * Empty or malformed input returns CMD_UNKNOWN. Do not modify line. */
    return CMD_UNKNOWN;
}
