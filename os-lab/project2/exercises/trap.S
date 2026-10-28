.section .text
.balign 4
.globl trap_entry
trap_entry:
    /* L16-20: sscratch=0 in S; trap stack top in U. Acquire a kernel stack,
     * save all x1-x31 and sstatus,sepc,stval,scause into struct trapframe,
     * call trap_handler(sp), restore saved frame, then sret.
     * SAVE temporary registers BEFORE using them; x0 is always zero.
     * frame bytes=288; x[i]=8*i; sstatus=256,sepc=264,stval=272,scause=280.
     * A timer can interrupt kernel threads: handle both S and U origins. */
    tail p2_missing_trap
