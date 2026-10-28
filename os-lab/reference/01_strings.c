#include "os.h"
size_t lab_strlen(const char *s) {
    size_t n = 0;
    while (s[n]) n++;
    return n;
}
int lab_streq(const char *a, const char *b) {
    while (*a && *a == *b) { a++; b++; }
    return *a == *b;
}
