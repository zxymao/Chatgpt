# 原源码TODO任务清单

P1为实验一，F2为未填实现的实验二原框架，P2为完成版。每个标记都列出归属，已完成和后续项目的标记分别注明。

## P1:README.md

- [P1:README.md:1](源码索引.html#p1-readme-md-L1) · DOC · 项目说明文档任务；应说明该版本的构建、设计与验证

```text
TODO：请在此完成你自己项目的“说明书”。
```

## P1:arch/riscv/boot/bootblock.S

- [P1:arch/riscv/boot/bootblock.S:21](源码索引.html#p1-arch-riscv-boot-bootblock-s-L21) · A2 · 已实现但保留TODO标记；不能按标记判断为空

```text
	// TODO: [p1-task1] call BIOS to print string "It's bootblock!"
```

- [P1:arch/riscv/boot/bootblock.S:33](源码索引.html#p1-arch-riscv-boot-bootblock-s-L33) · A2 · 已实现但保留TODO标记；不能按标记判断为空

```text
	// TODO: [p1-task2] call BIOS to read kernel in SD card
```

- [P1:arch/riscv/boot/bootblock.S:43](源码索引.html#p1-arch-riscv-boot-bootblock-s-L43) · A2 · 已实现但保留TODO标记；不能按标记判断为空

```text
	// TODO: [p1-task4] load task-related arguments and pass them to kernel
```

- [P1:arch/riscv/boot/bootblock.S:50](源码索引.html#p1-arch-riscv-boot-bootblock-s-L50) · A2 · 已实现但保留TODO标记；不能按标记判断为空

```text
	// TODO: [p1-task2] jump to kernel to start UCAS-OS
```

## P1:arch/riscv/crt0/crt0.S

- [P1:arch/riscv/crt0/crt0.S:6](源码索引.html#p1-arch-riscv-crt0-crt0-s-L6) · A3 · 已实现但保留TODO标记；不能按标记判断为空

```text
    /* TODO: [p1-task3] setup C runtime environment for the user program */
```

- [P1:arch/riscv/crt0/crt0.S:22](源码索引.html#p1-arch-riscv-crt0-crt0-s-L22) · A3 · 已实现但保留TODO标记；不能按标记判断为空

```text
    /* TODO: [p1-task3] enter main function */
```

- [P1:arch/riscv/crt0/crt0.S:25](源码索引.html#p1-arch-riscv-crt0-crt0-s-L25) · A3 · 已实现但保留TODO标记；不能按标记判断为空

```text
    /* TODO: [p1-task3] finish task and return to the kernel, replace this in p3-task2! */
```

## P1:include/os/task.h

- [P1:include/os/task.h:15](源码索引.html#p1-include-os-task-h-L15) · A1 · 已实现但保留TODO标记；不能按标记判断为空

```text
/* TODO: [p1-task4] implement your own task_info_t! */
```

## P1:init/main.c

- [P1:init/main.c:41](源码索引.html#p1-init-main-c-L41) · A4 · 已实现但保留TODO标记；不能按标记判断为空

```text
    // TODO: [p1-task4] Init 'tasks' array via reading app-info sector
```

- [P1:init/main.c:86](源码索引.html#p1-init-main-c-L86) · A4 · 已实现但保留TODO标记；不能按标记判断为空

```text
    // TODO: Load tasks by either task id [p1-task3] or task name [p1-task4],
```

## P1:kernel/loader/loader.c

- [P1:kernel/loader/loader.c:38](源码索引.html#p1-kernel-loader-loader-c-L38) · A4 · 已实现但保留TODO标记；不能按标记判断为空

```text
     * TODO:
     * 1. [p1-task3] load task from image via task id, and return its entrypoint
     * 2. [p1-task4] load task via task name, thus the arg should be 'char *taskname'
     */
```

## P1:tools/createimage.c

- [P1:tools/createimage.c:24](源码索引.html#p1-tools-createimage-c-L24) · A1 · 已实现但保留TODO标记；不能按标记判断为空

```text
/* TODO: [p1-task4] design your own task_info_t */
```

- [P1:tools/createimage.c:86](源码索引.html#p1-tools-createimage-c-L86) · A1 · 已实现但保留TODO标记；不能按标记判断为空

```text
/* TODO: [p1-task4] assign your task_info_t somewhere in 'create_image' */
```

- [P1:tools/createimage.c:139](源码索引.html#p1-tools-createimage-c-L139) · A1 · 已实现但保留TODO标记；不能按标记判断为空

```text
         * TODO:
         * 1. [p1-task3] do padding so that the kernel and every app program
         *  occupies the same number of sectors
         * 2. [p1-task4] only padding bootblock is allowed!
         */
```

- [P1:tools/createimage.c:230](源码索引.html#p1-tools-createimage-c-L230) · A1 · P1旧注释块；实际write_img_info见同文件267行起

```text
    // TODO: [p1-task3] & [p1-task4] write image info to some certain places
```

## F2:README.md

- [F2:README.md:1](源码索引.html#f2-readme-md-L1) · DOC · 项目说明文档任务；应说明该版本的构建、设计与验证

```text
TODO：请在此完成你自己项目的“说明书”。
```

## F2:arch/riscv/boot/bootblock.S

- [F2:arch/riscv/boot/bootblock.S:19](源码索引.html#f2-arch-riscv-boot-bootblock-s-L19) · A2 · 原框架待填；当前P2实现已补齐，按附录理解

```text
	// TODO: [p1-task1] call BIOS to print string "It's bootblock!"
```

- [F2:arch/riscv/boot/bootblock.S:22](源码索引.html#f2-arch-riscv-boot-bootblock-s-L22) · A2 · 原框架待填；当前P2实现已补齐，按附录理解

```text
	// TODO: [p1-task2] call BIOS to read kernel in SD card
```

- [F2:arch/riscv/boot/bootblock.S:25](源码索引.html#f2-arch-riscv-boot-bootblock-s-L25) · A2 · 原框架待填；当前P2实现已补齐，按附录理解

```text
	// TODO: [p1-task4] load task-related arguments and pass them to kernel
```

- [F2:arch/riscv/boot/bootblock.S:28](源码索引.html#f2-arch-riscv-boot-bootblock-s-L28) · A2 · 原框架待填；当前P2实现已补齐，按附录理解

```text
	// TODO: [p1-task2] jump to kernel to start UCAS-OS
```

## F2:arch/riscv/crt0/crt0.S

- [F2:arch/riscv/crt0/crt0.S:6](源码索引.html#f2-arch-riscv-crt0-crt0-s-L6) · A3 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p1-task3] setup C runtime environment for the user program */
```

- [F2:arch/riscv/crt0/crt0.S:9](源码索引.html#f2-arch-riscv-crt0-crt0-s-L9) · A3 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p1-task3] enter main function */
```

- [F2:arch/riscv/crt0/crt0.S:12](源码索引.html#f2-arch-riscv-crt0-crt0-s-L12) · A3 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p1-task3] finish task and return to the kernel, replace this in p3-task2! */
```

## F2:arch/riscv/kernel/entry.S

- [F2:arch/riscv/kernel/entry.S:6](源码索引.html#f2-arch-riscv-kernel-entry-s-L6) · A15 · 原框架待填；当前P2实现已补齐，按附录理解

```text
  /* TODO: [p2-task3] save all general purpose registers here! */
```

- [F2:arch/riscv/kernel/entry.S:18](源码索引.html#f2-arch-riscv-kernel-entry-s-L18) · A16 · 原框架待填；当前P2实现已补齐，按附录理解

```text
  /* TODO: [p2-task3] save sstatus, sepc, stval and scause on kernel stack */
```

- [F2:arch/riscv/kernel/entry.S:23](源码索引.html#f2-arch-riscv-kernel-entry-s-L23) · A17 · 原框架待填；当前P2实现已补齐，按附录理解

```text
  /* TODO: Restore all general purpose registers and sepc, sstatus */
```

- [F2:arch/riscv/kernel/entry.S:55](源码索引.html#f2-arch-riscv-kernel-entry-s-L55) · A10 · 原框架待填；当前P2实现已补齐，按附录理解

```text
  /* TODO: [p2-task1] save all callee save registers on kernel stack,
   * see the definition of `struct switchto_context` in sched.h*/
```

- [F2:arch/riscv/kernel/entry.S:58](源码索引.html#f2-arch-riscv-kernel-entry-s-L58) · A10 · 原框架待填；当前P2实现已补齐，按附录理解

```text
  /* TODO: [p2-task1] restore all callee save registers from kernel stack,
   * see the definition of `struct switchto_context` in sched.h*/
```

- [F2:arch/riscv/kernel/entry.S:66](源码索引.html#f2-arch-riscv-kernel-entry-s-L66) · A17 · 原框架待填；当前P2实现已补齐，按附录理解

```text
  /* TODO: [p2-task3] restore context via provided macro and return to sepc */
```

- [F2:arch/riscv/kernel/entry.S:72](源码索引.html#f2-arch-riscv-kernel-entry-s-L72) · A16 · 原框架待填；当前P2实现已补齐，按附录理解

```text
  /* TODO: [p2-task3] save context via the provided macro */
```

- [F2:arch/riscv/kernel/entry.S:75](源码索引.html#f2-arch-riscv-kernel-entry-s-L75) · A16 · 原框架待填；当前P2实现已补齐，按附录理解

```text
  /* TODO: [p2-task3] load ret_from_exception into $ra so that we can return to
   * ret_from_exception when interrupt_help complete.
   */
```

- [F2:arch/riscv/kernel/entry.S:80](源码索引.html#f2-arch-riscv-kernel-entry-s-L80) · A16 · 原框架待填；当前P2实现已补齐，按附录理解

```text
  /* TODO: [p2-task3] call interrupt_helper
   * NOTE: don't forget to pass parameters for it.
   */
```

## F2:arch/riscv/kernel/head.S

- [F2:arch/riscv/kernel/head.S:17](源码索引.html#f2-arch-riscv-kernel-head-s-L17) · A3 · 原框架待填；当前P2实现已补齐，按附录理解

```text
  /* TODO: [p1-task2] clear BSS for flat non-ELF images */
```

- [F2:arch/riscv/kernel/head.S:20](源码索引.html#f2-arch-riscv-kernel-head-s-L20) · A3 · 原框架待填；当前P2实现已补齐，按附录理解

```text
  /* TODO: [p1-task2] setup C environment */
```

## F2:arch/riscv/kernel/trap.S

- [F2:arch/riscv/kernel/trap.S:6](源码索引.html#f2-arch-riscv-kernel-trap-s-L6) · A19 · 原框架待填；当前P2实现已补齐，按附录理解

```text
  /* TODO: [p2-task3] save exception_handler_entry into STVEC */
```

- [F2:arch/riscv/kernel/trap.S:8](源码索引.html#f2-arch-riscv-kernel-trap-s-L8) · A19 · 原框架待填；当前P2实现已补齐，按附录理解

```text
  /* TODO: [p2-task4] enable interrupts globally */
```

## F2:drivers/screen.c

- [F2:drivers/screen.c:49](源码索引.html#f2-drivers-screen-c-L49) · OUT · 后续prj3退格扩展；完成版仍保留，当前A-Core范围外

```text
        // TODO: [P3] support backspace here
```

## F2:include/os/list.h

- [F2:include/os/list.h:53](源码索引.html#f2-include-os-list-h-L53) · A6 · 原框架待填；当前P2实现已补齐，按附录理解

```text
/* TODO: [p2-task1] implement your own list API */
```

## F2:include/os/task.h

- [F2:include/os/task.h:14](源码索引.html#f2-include-os-task-h-L14) · A1 · 原框架待填；当前P2实现已补齐，按附录理解

```text
/* TODO: [p1-task4] implement your own task_info_t! */
```

## F2:init/main.c

- [F2:init/main.c:45](源码索引.html#f2-init-main-c-L45) · A20 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    // TODO: [p2-task1] (S-core) initialize system call table.
```

- [F2:init/main.c:51](源码索引.html#f2-init-main-c-L51) · A4 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    // TODO: [p1-task4] Init 'tasks' array via reading app-info sector
```

- [F2:init/main.c:60](源码索引.html#f2-init-main-c-L60) · A7 · 原框架待填；当前P2实现已补齐，按附录理解

```text
     /* TODO: [p2-task3] initialization of registers on kernel stack
      * HINT: sp, ra, sepc, sstatus
      * NOTE: To run the task in user mode, you should set corresponding bits
      *     of sstatus(SPP, SPIE, etc.).
      */
```

- [F2:init/main.c:69](源码索引.html#f2-init-main-c-L69) · A7 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task1] set sp to simulate just returning from switch_to
     * NOTE: you should prepare a stack, and push some values to
     * simulate a callee-saved context.
     */
```

- [F2:init/main.c:80](源码索引.html#f2-init-main-c-L80) · A8 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task1] load needed tasks and init their corresponding PCB */
```

- [F2:init/main.c:83](源码索引.html#f2-init-main-c-L83) · A8 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task1] remember to initialize 'current_running' */
```

- [F2:init/main.c:89](源码索引.html#f2-init-main-c-L89) · A20 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    // TODO: [p2-task3] initialize system call table.
```

- [F2:init/main.c:124](源码索引.html#f2-init-main-c-L124) · A19 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    // TODO: [p2-task4] Setup timer interrupt and enable all interrupt globally
```

- [F2:init/main.c:129](源码索引.html#f2-init-main-c-L129) · A8 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    // TODO: Load tasks by either task id [p1-task3] or task name [p1-task4],
```

## F2:kernel/irq/irq.c

- [F2:kernel/irq/irq.c:15](源码索引.html#f2-kernel-irq-irq-c-L15) · A19 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    // TODO: [p2-task3] & [p2-task4] interrupt handler.
```

- [F2:kernel/irq/irq.c:21](源码索引.html#f2-kernel-irq-irq-c-L21) · A19 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    // TODO: [p2-task4] clock interrupt handler.
```

- [F2:kernel/irq/irq.c:27](源码索引.html#f2-kernel-irq-irq-c-L27) · A19 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task3] initialize exc_table */
```

- [F2:kernel/irq/irq.c:30](源码索引.html#f2-kernel-irq-irq-c-L30) · A19 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task4] initialize irq_table */
```

- [F2:kernel/irq/irq.c:33](源码索引.html#f2-kernel-irq-irq-c-L33) · A19 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task3] set up the entrypoint of exceptions */
```

## F2:kernel/loader/loader.c

- [F2:kernel/loader/loader.c:9](源码索引.html#f2-kernel-loader-loader-c-L9) · A4 · 原框架待填；当前P2实现已补齐，按附录理解

```text
     * TODO:
     * 1. [p1-task3] load task from image via task id, and return its entrypoint
     * 2. [p1-task4] load task via task name, thus the arg should be 'char *taskname'
     */
```

## F2:kernel/locking/lock.c

- [F2:kernel/locking/lock.c:10](源码索引.html#f2-kernel-locking-lock-c-L10) · A11 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task2] initialize mlocks */
```

- [F2:kernel/locking/lock.c:15](源码索引.html#f2-kernel-locking-lock-c-L15) · A11 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task2] initialize spin lock */
```

- [F2:kernel/locking/lock.c:20](源码索引.html#f2-kernel-locking-lock-c-L20) · A11 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task2] try to acquire spin lock */
```

- [F2:kernel/locking/lock.c:26](源码索引.html#f2-kernel-locking-lock-c-L26) · A11 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task2] acquire spin lock */
```

- [F2:kernel/locking/lock.c:31](源码索引.html#f2-kernel-locking-lock-c-L31) · A11 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task2] release spin lock */
```

- [F2:kernel/locking/lock.c:36](源码索引.html#f2-kernel-locking-lock-c-L36) · A12 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task2] initialize mutex lock */
```

- [F2:kernel/locking/lock.c:42](源码索引.html#f2-kernel-locking-lock-c-L42) · A12 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task2] acquire mutex lock */
```

- [F2:kernel/locking/lock.c:47](源码索引.html#f2-kernel-locking-lock-c-L47) · A13 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task2] release mutex lock */
```

## F2:kernel/sched/sched.c

- [F2:kernel/sched/sched.c:26](源码索引.html#f2-kernel-sched-sched-c-L26) · A18 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    // TODO: [p2-task3] Check sleep queue to wake up PCBs
```

- [F2:kernel/sched/sched.c:32](源码索引.html#f2-kernel-sched-sched-c-L32) · A9 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    // TODO: [p2-task1] Modify the current_running pointer.
```

- [F2:kernel/sched/sched.c:35](源码索引.html#f2-kernel-sched-sched-c-L35) · A9 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    // TODO: [p2-task1] switch_to current_running
```

- [F2:kernel/sched/sched.c:41](源码索引.html#f2-kernel-sched-sched-c-L41) · A18 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    // TODO: [p2-task3] sleep(seconds)
```

- [F2:kernel/sched/sched.c:50](源码索引.html#f2-kernel-sched-sched-c-L50) · A9 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    // TODO: [p2-task2] block the pcb task into the block queue
```

- [F2:kernel/sched/sched.c:55](源码索引.html#f2-kernel-sched-sched-c-L55) · A9 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    // TODO: [p2-task2] unblock the `pcb` from the block queue
```

## F2:kernel/sched/time.c

- [F2:kernel/sched/time.c:36](源码索引.html#f2-kernel-sched-time-c-L36) · A18 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    // TODO: [p2-task3] Pick out tasks that should wake up from the sleep queue
```

## F2:kernel/syscall/syscall.c

- [F2:kernel/syscall/syscall.c:7](源码索引.html#f2-kernel-syscall-syscall-c-L7) · A14 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task3] handle syscall exception */
```

## F2:tiny_libc/syscall.c

- [F2:tiny_libc/syscall.c:11](源码索引.html#f2-tiny_libc-syscall-c-L11) · A14 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task3] implement invoke_syscall via inline assembly */
```

- [F2:tiny_libc/syscall.c:19](源码索引.html#f2-tiny_libc-syscall-c-L19) · A14 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task1] call call_jmptab to implement sys_yield */
```

- [F2:tiny_libc/syscall.c:20](源码索引.html#f2-tiny_libc-syscall-c-L20) · A14 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task3] call invoke_syscall to implement sys_yield */
```

- [F2:tiny_libc/syscall.c:25](源码索引.html#f2-tiny_libc-syscall-c-L25) · A14 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task1] call call_jmptab to implement sys_move_cursor */
```

- [F2:tiny_libc/syscall.c:26](源码索引.html#f2-tiny_libc-syscall-c-L26) · A14 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task3] call invoke_syscall to implement sys_move_cursor */
```

- [F2:tiny_libc/syscall.c:31](源码索引.html#f2-tiny_libc-syscall-c-L31) · A14 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task1] call call_jmptab to implement sys_write */
```

- [F2:tiny_libc/syscall.c:32](源码索引.html#f2-tiny_libc-syscall-c-L32) · A14 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task3] call invoke_syscall to implement sys_write */
```

- [F2:tiny_libc/syscall.c:37](源码索引.html#f2-tiny_libc-syscall-c-L37) · A14 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task1] call call_jmptab to implement sys_reflush */
```

- [F2:tiny_libc/syscall.c:38](源码索引.html#f2-tiny_libc-syscall-c-L38) · A14 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task3] call invoke_syscall to implement sys_reflush */
```

- [F2:tiny_libc/syscall.c:43](源码索引.html#f2-tiny_libc-syscall-c-L43) · A14 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task2] call call_jmptab to implement sys_mutex_init */
```

- [F2:tiny_libc/syscall.c:44](源码索引.html#f2-tiny_libc-syscall-c-L44) · A14 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task3] call invoke_syscall to implement sys_mutex_init */
```

- [F2:tiny_libc/syscall.c:50](源码索引.html#f2-tiny_libc-syscall-c-L50) · A14 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task2] call call_jmptab to implement sys_mutex_acquire */
```

- [F2:tiny_libc/syscall.c:51](源码索引.html#f2-tiny_libc-syscall-c-L51) · A14 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task3] call invoke_syscall to implement sys_mutex_acquire */
```

- [F2:tiny_libc/syscall.c:56](源码索引.html#f2-tiny_libc-syscall-c-L56) · A14 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task2] call call_jmptab to implement sys_mutex_release */
```

- [F2:tiny_libc/syscall.c:57](源码索引.html#f2-tiny_libc-syscall-c-L57) · A14 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task3] call invoke_syscall to implement sys_mutex_release */
```

- [F2:tiny_libc/syscall.c:62](源码索引.html#f2-tiny_libc-syscall-c-L62) · A14 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task3] call invoke_syscall to implement sys_get_timebase */
```

- [F2:tiny_libc/syscall.c:68](源码索引.html#f2-tiny_libc-syscall-c-L68) · A14 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task3] call invoke_syscall to implement sys_get_tick */
```

- [F2:tiny_libc/syscall.c:74](源码索引.html#f2-tiny_libc-syscall-c-L74) · A14 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    /* TODO: [p2-task3] call invoke_syscall to implement sys_sleep */
```

## F2:tools/createimage.c

- [F2:tools/createimage.c:20](源码索引.html#f2-tools-createimage-c-L20) · A1 · 原框架待填；当前P2实现已补齐，按附录理解

```text
/* TODO: [p1-task4] design your own task_info_t */
```

- [F2:tools/createimage.c:79](源码索引.html#f2-tools-createimage-c-L79) · A1 · 原框架待填；当前P2实现已补齐，按附录理解

```text
/* TODO: [p1-task4] assign your task_info_t somewhere in 'create_image' */
```

- [F2:tools/createimage.c:125](源码索引.html#f2-tools-createimage-c-L125) · A1 · 原框架待填；当前P2实现已补齐，按附录理解

```text
         * TODO:
         * 1. [p1-task3] do padding so that the kernel and every app program
         *  occupies the same number of sectors
         * 2. [p1-task4] only padding bootblock is allowed!
         */
```

- [F2:tools/createimage.c:216](源码索引.html#f2-tools-createimage-c-L216) · A1 · 原框架待填；当前P2实现已补齐，按附录理解

```text
    // TODO: [p1-task3] & [p1-task4] write image info to some certain places
```

## P2:drivers/screen.c

- [P2:drivers/screen.c:49](源码索引.html#p2-drivers-screen-c-L49) · OUT · 后续prj3退格扩展；完成版仍保留，当前A-Core范围外

```text
        // TODO: [P3] support backspace here
```

## P2:include/os/task.h

- [P2:include/os/task.h:15](源码索引.html#p2-include-os-task-h-L15) · A1 · 已实现但保留TODO标记；不能按标记判断为空

```text
/* TODO: [p1-task4] implement your own task_info_t! */
```

## P2:test.S

- [P2:test.S:5](源码索引.html#p2-test-s-L5) · OUT · prj0汇编预实验；不属于当前prj1/prj2 A-Core主体

```text
// TODO: [p0-task1] Add your code here!
```
