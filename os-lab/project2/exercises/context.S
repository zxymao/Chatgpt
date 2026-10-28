.section .text
.globl context_switch
context_switch:
    /* L8-9: a0=old context, a1=new context. Save then restore ra,sp,s0-s11.
     * struct context offsets: ra=0, sp=8, s0=16 ... s11=104. ret resumes
     * the restored ra. Caller already set tp to next PCB, don't undo it. */
    tail p2_missing_context
