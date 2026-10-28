.section .text.boot, "ax"
.globl _start
_start:
    /* OpenSBI passes hart ID in a0 and device-tree address in a1. */
    bnez a0, .Lpark
    la sp, boot_stack_top
    la t0, __bss_start
    la t1, __bss_end
.Lbss:
    bgeu t0, t1, .Lready
    sd zero, 0(t0)
    addi t0, t0, 8
    j .Lbss
.Lready:
    csrw sscratch, zero
    csrw sie, zero
    csrci sstatus, 2
    la t0, trap_entry
    csrw stvec, t0
    call kernel_main
.Lpark:
    wfi
    j .Lpark
