OUTPUT_ARCH(riscv)
ENTRY(_start)
PHDRS {
    text PT_LOAD FLAGS(5);
    data PT_LOAD FLAGS(6);
}
SECTIONS {
    . = 0x80200000;
    .text : { KEEP(*(.text.boot)) *(.text .text.*) } :text
    . = ALIGN(4096);
    __user_start = .;
    .user : { *(.user.text) *(.user.rodata) } :text
    __user_end = .;
    .rodata : { *(.rodata .rodata.*) } :text
    . = ALIGN(4096);
    .data : { *(.data .data.*) *(.sdata .sdata.*) } :data
    .bss (NOLOAD) : {
        __bss_start = .;
        *(.bss .bss.*) *(.sbss .sbss.*) *(COMMON)
        . = ALIGN(16);
        __bss_end = .;
    } :data
    .stacks (NOLOAD) : {
        . = ALIGN(16);
        . += 16384;
        boot_stack_top = .;
        . += 8192;
        trap_stack_top = .;
        . += 8192;
        user_stack_top = .;
    } :data
    . = ALIGN(4096);
    __kernel_end = .;
    /DISCARD/ : { *(.eh_frame*) *(.comment) }
}
