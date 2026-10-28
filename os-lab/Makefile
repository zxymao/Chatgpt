CROSS_PREFIX ?= riscv64-linux-gnu-
CC := $(CROSS_PREFIX)gcc
OBJDUMP := $(CROSS_PREFIX)objdump
QEMU ?= qemu-system-riscv64
MODE ?= student
LAB ?= all
BIOS ?= default
BUILD := build/$(MODE)
ifeq ($(filter $(MODE),student reference),)
$(error MODE must be student or reference)
endif
LESSONS := $(if $(filter reference,$(MODE)),reference,exercises)
CFLAGS := -std=gnu11 -O1 -g3 -Wall -Wextra -Werror -ffreestanding \
          -fno-builtin -fno-pie -fno-stack-protector -fno-common \
          -mcmodel=medany -msmall-data-limit=0 -mno-relax \
          -march=rv64imac_zicsr_zifencei -mabi=lp64 -Iinclude
SOURCES := $(wildcard kernel/*.c arch/*.S $(LESSONS)/*.c)
HEADERS := $(wildcard include/*.h)

.PHONY: all run debug disasm check boot-check doctor clean
all: $(BUILD)/kernel.elf
$(BUILD)/kernel.elf: $(SOURCES) $(HEADERS) linker.ld Makefile
	mkdir -p $(BUILD)
	$(CC) $(CFLAGS) -nostdlib -static -no-pie -Wl,--build-id=none \
	  -Wl,--no-relax -Wl,-T,linker.ld -Wl,-Map,$(BUILD)/kernel.map \
	  $(SOURCES) -o $@
run: all
	$(QEMU) -machine virt -m 128M -smp 1 -bios $(BIOS) \
	  -kernel $(BUILD)/kernel.elf -display none -serial mon:stdio
debug: all
	$(QEMU) -machine virt -m 128M -smp 1 -bios $(BIOS) \
	  -kernel $(BUILD)/kernel.elf -display none -serial mon:stdio -s -S
disasm: all
	$(OBJDUMP) -dS $(BUILD)/kernel.elf > $(BUILD)/kernel.asm
check: all
	python3 tools/check.py --mode $(MODE) --lab $(LAB) --qemu $(QEMU) --bios $(BIOS)
boot-check: all
	python3 tools/check.py --mode $(MODE) --lab boot --qemu $(QEMU) --bios $(BIOS)
doctor:
	python3 tools/doctor.py --cross-prefix $(CROSS_PREFIX) --qemu $(QEMU)
clean:
	python3 -c 'import shutil; shutil.rmtree("build", ignore_errors=True)'
