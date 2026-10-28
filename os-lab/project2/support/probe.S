.section .text
.globl p2_register_probe
p2_register_probe:
    addi sp, sp, -112
    sd ra, 0(sp)
    slli t1, a0, 8
    sd t1, 8(sp)
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
    li s0, 20736
    add s0, s0, t1
    li s1, 20737
    add s1, s1, t1
    li s2, 20738
    add s2, s2, t1
    li s3, 20739
    add s3, s3, t1
    li s4, 20740
    add s4, s4, t1
    li s5, 20741
    add s5, s5, t1
    li s6, 20742
    add s6, s6, t1
    li s7, 20743
    add s7, s7, t1
    li s8, 20744
    add s8, s8, t1
    li s9, 20745
    add s9, s9, t1
    li s10, 20746
    add s10, s10, t1
    li s11, 20747
    add s11, s11, t1
    call p2_yield
    ld t1, 8(sp)
    li t0, 20736
    add t0, t0, t1
    bne s0, t0, .Lbad_probe
    li t0, 20737
    add t0, t0, t1
    bne s1, t0, .Lbad_probe
    li t0, 20738
    add t0, t0, t1
    bne s2, t0, .Lbad_probe
    li t0, 20739
    add t0, t0, t1
    bne s3, t0, .Lbad_probe
    li t0, 20740
    add t0, t0, t1
    bne s4, t0, .Lbad_probe
    li t0, 20741
    add t0, t0, t1
    bne s5, t0, .Lbad_probe
    li t0, 20742
    add t0, t0, t1
    bne s6, t0, .Lbad_probe
    li t0, 20743
    add t0, t0, t1
    bne s7, t0, .Lbad_probe
    li t0, 20744
    add t0, t0, t1
    bne s8, t0, .Lbad_probe
    li t0, 20745
    add t0, t0, t1
    bne s9, t0, .Lbad_probe
    li t0, 20746
    add t0, t0, t1
    bne s10, t0, .Lbad_probe
    li t0, 20747
    add t0, t0, t1
    bne s11, t0, .Lbad_probe
    li a0, 0
    j .Lrestore_probe
.Lbad_probe:
    li a0, 1
.Lrestore_probe:
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
