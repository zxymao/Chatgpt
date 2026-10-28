.section .user.rodata, "a"
user_message: .ascii "[user] ecall reached S\n"
user_message_end:
.section .text
.globl run_user
run_user:
    addi sp, sp, -112
    sd ra, 0(sp)
    sd s0, 16(sp)
    sd s1, 24(sp)
    sd s2, 32(sp)
    sd s3, 40(sp)
    sd s4, 48(sp)
    sd s5, 56(sp)
    sd s6, 64(sp)
    sd s7, 72(sp)
    sd s8, 80(sp)
    sd s9, 88(sp)
    sd s10, 96(sp)
    sd s11, 104(sp)
    la t0, user_resume_sp
    sd sp, 0(t0)
    la t0, trap_stack_top
    csrw sscratch, t0
    la t0, user_entry
    csrw sepc, t0
    li t0, 256
    csrc sstatus, t0
    li t0, 32
    csrs sstatus, t0
    la sp, user_stack_top
    sret
.globl user_return
user_return:
    ld ra, 0(sp)
    ld s0, 16(sp)
    ld s1, 24(sp)
    ld s2, 32(sp)
    ld s3, 40(sp)
    ld s4, 48(sp)
    ld s5, 56(sp)
    ld s6, 64(sp)
    ld s7, 72(sp)
    ld s8, 80(sp)
    ld s9, 88(sp)
    ld s10, 96(sp)
    ld s11, 104(sp)
    addi sp, sp, 112
    ret

.section .user.text, "ax"
user_entry:
    li s2, 0x12345678
    li t2, 0x23456789
    la a0, user_message
    la a1, user_message_end
    sub a1, a1, a0
    li a7, 1 /* SYS_WRITE */
    ecall
    la t0, user_message_end
    la t1, user_message
    sub t0, t0, t1
    bne a0, t0, .Luser_fail
    li a0, 1 /* invalid user pointer: must return -EFAULT */
    li a1, 1
    li a7, 1
    ecall
    li t0, -14
    bne a0, t0, .Luser_fail
    li a7, 99 /* invalid syscall: must return -ENOSYS */
    ecall
    li t0, -38
    bne a0, t0, .Luser_fail
    li a7, 2 /* SYS_TIME */
    ecall
    blez a0, .Luser_fail
    li t0, 0x12345678
    bne s2, t0, .Luser_fail
    li t0, 0x23456789
    bne t2, t0, .Luser_fail
    li a0, 0
    j .Luser_exit
.Luser_fail:
    li a0, 1
.Luser_exit:
    li a7, 3 /* SYS_EXIT: teaching harness restores kernel continuation */
    ecall
    j .Luser_exit
