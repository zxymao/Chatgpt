CROSS_PREFIX ?= riscv64-linux-gnu-
QEMU ?= qemu-system-riscv64
BIOS ?= default
MODE ?= student
STAGE ?= 1
ifeq ($(filter $(MODE),student reference),)
$(error MODE must be student or reference)
endif
ifeq ($(filter $(STAGE),1 2 3 4),)
$(error STAGE must be 1, 2, 3 or 4)
endif
LESSONS := $(if $(filter reference,$(MODE)),reference,exercises)
BUILD := ../build/project2-$(MODE)-$(STAGE)
CC := $(CROSS_PREFIX)gcc
CFLAGS := -std=gnu11 -O1 -g3 -Wall -Wextra -Werror -ffreestanding \
  -fno-builtin -fno-pie -fno-stack-protector -fno-common -mcmodel=medany \
  -msmall-data-limit=0 -mno-relax -march=rv64imac_zicsr_zifencei -mabi=lp64 \
  -I../include -Iinclude -DP2_STAGE=$(STAGE) -DP2_MODE_NAME='"$(MODE)"'
SOURCES := ../arch/boot.S ../arch/user.S ../kernel/platform.c \
  $(wildcard support/*.c support/*.S $(LESSONS)/*.c $(LESSONS)/*.S)
.PHONY: all check run
all: $(BUILD)/kernel.elf
$(BUILD)/kernel.elf: $(SOURCES) include/p2.h ../include/os.h ../linker.ld Makefile
	mkdir -p $(BUILD)
	$(CC) $(CFLAGS) -nostdlib -static -no-pie -Wl,--build-id=none \
	  -Wl,--no-relax -Wl,-T,../linker.ld $(SOURCES) -o $@
check: all
	python3 support/check.py --mode $(MODE) --stage $(STAGE) --qemu $(QEMU) --bios $(BIOS)
run: all
	$(QEMU) -machine virt -m 128M -smp 1 -bios $(BIOS) \
	  -kernel $(BUILD)/kernel.elf -display none -serial mon:stdio
