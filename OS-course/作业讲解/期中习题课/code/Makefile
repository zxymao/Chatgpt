CC ?= gcc
CFLAGS := -std=c11 -O2 -g -Wall -Wextra -Werror
LDLIBS := -pthread
PROGRAMS := syscalls elf_layout fork_exec fork_tree threads odd_even alternating locks mapreduce
.PHONY: all clean
all: $(PROGRAMS)
$(filter-out elf_layout,$(PROGRAMS)): %: %.c common.h
	$(CC) $(CFLAGS) $< -o $@ $(LDLIBS)
elf_layout: elf_layout.c
	$(CC) -std=c11 -O0 -g -Wall -Wextra -Werror -fno-pie -no-pie $< -o $@
clean:
	rm -f $(PROGRAMS)
