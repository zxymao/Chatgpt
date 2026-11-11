# 从已合并的 P2 + P3 框架完成 Project3 S-Core

本说明针对本次对话中的 Project2-Acore 底稿与老师 Project3 框架。实现范围是 Task1 进程管理和 shell，以及 Task2 的 barrier。

## 先结束当前合并

你显示的状态意味着冲突已处理并暂存，尚未创建合并提交。在 ~/zhangxiyuan24 中运行：

```bash
git diff --cached --stat
git commit -m "Merge Project3 S-Core framework"
```

merge_p3_score.py 可以保持未跟踪；本次不用 git add .。先提交框架，后续实现就可以单独查看、撤回和提交。以下代码是参考实现，尚未修改你通过 SSH 连接的工作树。

## 按依赖关系读写

| 顺序 | 文件 | 做什么 / 抓住哪一点 |
|---|---|---|
| 1 | Makefile | PROJECT_IDX=3；LAB_STAGE=4；全局 -DS_CORE；选定六个程序及搜索路径。大部分已由合并脚本完成。 |
| 2 | include/os/sched.h | 保留 kernel_sp、user_sp、trap_t0 的 ABI 顺序；加 used、task_id、barrier_idx；声明共享的初始栈函数。 |
| 3 | kernel/sched/sched.c | 先读 init_pcb_stack 和 do_exec，再读 do_scheduler；随后读 finish_process、do_exit、do_waitpid、do_kill 和 ps/getpid。 |
| 4 | include/os/lock.h、kernel/locking/lock.c | mutex_release_all 根据目标 PID 释放其所有锁；再实现 barrier 表、init/wait/destroy 和 kill 的等待者清理。 |
| 5 | init/main.c | 默认只启动 shell；接上新系统调用；k_write 按 task_id 查映像，不再用 pid-1。 |
| 6 | arch/riscv/crt0/crt0.S | main 返回后 call sys_exit，进程生命周期才能闭合。 |
| 7 | tiny_libc/syscall.c、tiny_libc/include/unistd.h | 用户包装通过 ecall 进入内核。合并脚本已补好，重点核对声明、宏和五参数接口。 |
| 8 | drivers/screen.c、test/shell.c | 驱动负责擦除字符；shell 限制不能删掉提示符，解析 ps/clear/exec/kill；前台 waitpid，& 后台。 |
| 9 | test/test_project3/waitpid.c、barrier.c | 只将原来的 -1 程序编号占位符填为 2、3、5，其他测试逻辑保持原样。 |

上表按理解依赖排序；相互调用的函数和声明需要成组补齐后再编译。原有 bootblock、loader、异常入口和 switch_to 继续复用。S-Core 此处采用单核，不需要实现 condition/mailbox/SMP。

## 把一次 exec 串起来

```text
shell -> sys_exec -> ecall -> 异常入口 -> handle_syscall
      -> k_exec -> do_exec -> 分配/复用 PCB 和栈 -> 放入 ready_queue
      -> do_scheduler -> switch_to -> ret_from_exception -> sret
      -> 用户 crt0 -> main -> sys_exit -> finish_process -> 唤醒 waitpid
```

exec 是“创建新进程”，返回新 PID；并不直接调用入口函数，也不替换 shell。初始用户寄存器：a0=argc、a1=arg0、a2=arg1、a3=arg2。程序 ID 不放入子程序参数。SPP=0 使首次 sret 进入 U 态；sw 的 ra 指向 ret_from_exception，sp 指向 switch 帧。

PID 标识一次进程，task_id 标识镜像里的程序，PCB 槽位用于存放进程状态。三者分开后，同一程序可启动多次、PCB 可以复用、旧 waitpid 不会误等新进程。当前进程退出时不能立刻复用它正在使用的内核栈。

## 编译、编号与验证

```bash
make list-tasks
make
make run
```

默认编号：0 shell，1 waitpid，2 ready_to_exit，3 wait_locks，4 barrier，5 test_barrier。使用其他工具链时给 make 和 make run 同样添加 CROSS_PREFIX=riscv64-linux-gnu-。更改 TASKS 顺序后必须更新测试里的三个编号。

在实验系统的 shell 中依次输入：

```text
ps
exec 1
clear
exec 4
exec 1 &
ps
```

exec 1 验证正常退出、等待和锁清理；exec 4 验证三个参与者的十轮 barrier。执行后台 waitpid 测试后，可用 ps 找出 ready_to_exit 的实际 PID，再 kill 该 PID，观察等待两把锁的进程继续。PID 随运行次数变化，不要照抄程序 ID。

本参考实现已经通过原课程地址布局的交叉编译、通用 QEMU 的真实串口/生命周期/十轮屏障测试，以及 P2 stage4 抢占、寄存器和锁回归。详细证据见源码包 docs/P3-VALIDATION.md；课程专用 QEMU/U-Boot、DASIC/loadbootd 和板端尚需在你的实验环境验收。

实现约定：PID 单调递增；waitpid 对已结束的有效 PID 立即返回，对 0/自身/未来 PID 返回 -1。barrier 销毁取消并唤醒等待者；kill 一个屏障等待者不会自动缩小目标人数。固定地址的映像仍采用课程共享内存模型，没有独立页表或每进程私有全局变量。

## 完整代码与应用方法

下面每个代码块都是对应文件的完整内容，可直接按路径核对。drivers/screen.c 和 tiny_libc/include/unistd.h 属于合并后应具备的代码，放在末尾便于核对；其余按上面的顺序给出。

若想将这版参考实现一次应用到已提交的框架，先下载 Project3-SCore-changes.tar.gz，查看列表后解压到仓库根目录：

```bash
cd ~/zhangxiyuan24
tar -tzf ~/Downloads/Project3-SCore-changes.tar.gz
tar -xzf ~/Downloads/Project3-SCore-changes.tar.gz -C .
git diff --stat
make
make run
```

将 ~/Downloads 替换成压缩包实际存放目录。覆盖包保留 .git，写入 CHANGES-P3-SCORE.txt 列出的文件。若此前又修改了这些文件，请先提交自己的更改。Project3-SCore-complete.tar.gz 则是供独立解压阅读的完整源码，不包含 Git 历史或 build 产物。

## 1. Makefile

保留 P2 的编译选项、ABI、镜像格式；增加 P3 程序，list-tasks 可查看实际程序编号。

```makefile
PROJECT_IDX = 3
SHELL = /bin/sh
.DEFAULT_GOAL := all
.NOTPARALLEL:
DIR_OSLAB ?= $(HOME)/OSLab-RISC-V
QEMU ?= $(DIR_OSLAB)/qemu/riscv64-softmmu/qemu-system-riscv64
UBOOT ?= $(DIR_OSLAB)/u-boot/u-boot
CROSS_PREFIX ?= riscv64-unknown-linux-gnu-
CC = $(CROSS_PREFIX)gcc
AR = $(CROSS_PREFIX)ar
OBJDUMP = $(CROSS_PREFIX)objdump
GDB = $(CROSS_PREFIX)gdb
HOST_CC ?= gcc
LAB_STAGE ?= 4
ifeq ($(filter $(LAB_STAGE),1 2 3 4),)
$(error LAB_STAGE must be 1, 2, 3 or 4)
endif
ifeq ($(LAB_STAGE),1)
TASKS ?= coop1 coop2
else ifeq ($(LAB_STAGE),2)
TASKS ?= mutex1 mutex2
else ifeq ($(LAB_STAGE),3)
TASKS ?= sleep coop_timer
else
TASKS ?= $(P3_TASKS)
endif
P3_TASKS = shell waitpid ready_to_exit wait_locks barrier test_barrier
COURSE_TASKS = fly lock1 lock2 print1 print2 sleep timer
VALIDATION_TASKS = coop1 coop2 mutex1 mutex2 coop_timer probe1 probe2 p3_probe p3_worker
VALID_TASKS = $(P3_TASKS) $(COURSE_TASKS) $(VALIDATION_TASKS)
ifneq ($(filter-out $(VALID_TASKS),$(TASKS)),)
$(error Unknown task: $(filter-out $(VALID_TASKS),$(TASKS)))
endif
ifeq ($(strip $(TASKS)),)
$(error TASKS must not be empty)
endif
ifneq ($(words $(TASKS)),$(words $(sort $(TASKS))))
$(error TASKS must not contain duplicates)
endif

RISCV_ARCH ?= rv64imac_zicsr_zifencei
CFLAGS = -O1 -g -Wall -Wextra -Wno-unused-parameter -ffreestanding -fno-builtin \
         -nostdlib -nostdinc -fno-pie -fno-stack-protector -fno-common \
         -mcmodel=medany -msmall-data-limit=0 -mno-relax \
         -march=$(RISCV_ARCH) -mabi=lp64 -DLAB_STAGE=$(LAB_STAGE)
CFLAGS += -DS_CORE
LDFLAGS = -static -no-pie -Wl,--build-id=none -Wl,--no-relax -T riscv.lds
KINC = -Iarch/riscv/include -Iinclude -Idrivers
UINC = -Itiny_libc/include
KERNEL_SRC = $(wildcard arch/riscv/kernel/*.S arch/riscv/bios/*.c drivers/*.c \
                        init/*.c kernel/*/*.c libs/*.c)
USER_SRC = $(wildcard tiny_libc/*.c)
USER_OBJ = $(patsubst tiny_libc/%.c,build/libc_%.o,$(USER_SRC))
USER_ELF = $(addprefix build/,$(TASKS))
HEADERS = $(shell find include arch/riscv/include drivers tiny_libc/include test/validation -name '*.h')
vpath %.c test test/test_project$(PROJECT_IDX) test/test_project2 test/validation

all: image asm

build:
	mkdir -p build
.PHONY: FORCE
FORCE:
build/config: FORCE | build
	@printf '%s\n' 'LAB_STAGE=$(LAB_STAGE)' 'TASKS=$(TASKS)' 'CC=$(CC)' 'CFLAGS=$(CFLAGS)' > build/config.tmp
	@cmp -s build/config.tmp $@ || cp build/config.tmp $@
	@rm build/config.tmp

build/bootblock: arch/riscv/boot/bootblock.S riscv.lds $(HEADERS) build/config
	$(CC) $(CFLAGS) $(KINC) $(LDFLAGS) -Wl,--defsym=TEXT_START=0x50200000 -Wl,-e,main -o $@ $<
build/main: $(KERNEL_SRC) riscv.lds $(HEADERS) build/config
	$(CC) $(CFLAGS) $(KINC) $(LDFLAGS) -Wl,--defsym=TEXT_START=0x50201000 -o $@ $(KERNEL_SRC)
build/crt0.o: arch/riscv/crt0/crt0.S $(HEADERS) build/config
	$(CC) $(CFLAGS) -Iarch/riscv/include -c $< -o $@
build/libc_%.o: tiny_libc/%.c $(HEADERS) build/config
	$(CC) $(CFLAGS) $(UINC) -c $< -o $@
build/libtinyc.a: $(USER_OBJ)
	$(AR) rcs $@ $^
build/%: %.c build/crt0.o build/libtinyc.a riscv.lds $(HEADERS) build/config
	$(CC) $(CFLAGS) $(UINC) $(LDFLAGS) -Wl,--defsym=TEXT_START=$$(python3 -c 'import sys; print(hex(0x52000000+sys.argv[2:].index(sys.argv[1])*0x10000))' '$*' $(TASKS)) -o $@ build/crt0.o $< -Lbuild -ltinyc
build/createimage: tools/createimage.c
	$(HOST_CC) -O2 -g -Wall -Wextra -Werror $< -o $@
elf: build/bootblock build/main $(USER_ELF)
image: elf build/createimage
	cd build && ./createimage --extended bootblock main $(TASKS)
asm: elf
	@for name in bootblock main $(TASKS); do $(OBJDUMP) -d build/$$name > build/$$name.txt; done

QEMU_LOG_FILE ?= $(CURDIR)/build/oslab-log.txt
QEMU_OPTS ?= -nographic -machine virt -m 256M -kernel $(UBOOT) -bios none \
             -drive if=none,format=raw,id=image,file=build/image \
             -device virtio-blk-device,drive=image -monitor none -serial stdio \
             -D $(QEMU_LOG_FILE) -d oslab
run: image
	$(QEMU) $(QEMU_OPTS)
debug: image
	$(QEMU) $(QEMU_OPTS) -s -S
gdb:
	$(GDB) build/main -ex 'target remote :1234'
clean:
	rm -rf build
.PHONY: all elf image asm run debug gdb clean

list-tasks:
	@python3 -c 'import sys; [print(i, name) for i, name in enumerate(sys.argv[1:])]' $(TASKS)
.PHONY: list-tasks
```

## 2. include/os/sched.h

trap_t0 必须保持在偏移 16，否则现有异常汇编会把临时寄存器写错位置。

```c
/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *  * * * * * * * * * * *
 *            Copyright (C) 2018 Institute of Computing Technology, CAS
 *               Author : Han Shukai (email : hanshukai@ict.ac.cn)
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *  * * * * * * * * * * *
 *        Process scheduling related content, such as: scheduler, process blocking,
 *                 process wakeup, process creation, process kill, etc.
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *  * * * * * * * * * * *
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *  * * * * * * * * * * */

#ifndef INCLUDE_SCHEDULER_H_
#define INCLUDE_SCHEDULER_H_

#include <type.h>
#include <os/list.h>

#define NUM_MAX_TASK 16

/* used to save register infomation */
typedef struct regs_context
{
    /* Saved main processor registers.*/
    reg_t regs[32];

    /* Saved special registers. */
    reg_t sstatus;
    reg_t sepc;
    reg_t sbadaddr;
    reg_t scause;
} regs_context_t;

/* used to save register infomation in switch_to */
typedef struct switchto_context
{
    /* Callee saved registers.*/
    reg_t regs[14];
} switchto_context_t;

typedef enum {
    TASK_BLOCKED,
    TASK_RUNNING,
    TASK_READY,
    TASK_EXITED,
} task_status_t;

/* Process Control Block */
typedef struct pcb
{
    /* register context */
    // NOTE: this order must be preserved, which is defined in regs.h!!
    reg_t kernel_sp;
    reg_t user_sp;
    reg_t trap_t0; /* offset 16: required by the P2 trap assembly */
    ptr_t kernel_stack_base;
    ptr_t user_stack_base;

    /* previous, next pointer */
    list_node_t list;
    list_head wait_list;

    /* process id */
    pid_t pid;

    /* BLOCK | READY | RUNNING */
    task_status_t status;

    /* cursor position */
    int cursor_x;
    int cursor_y;

    /* time(seconds) to wake up sleeping PCB */
    uint64_t wakeup_time; /* absolute rdtime ticks */

    /* A PCB slot and a program image have different lifetimes. */
    int used;
    int task_id;
    int barrier_idx; /* -1 unless queued at a barrier */

} pcb_t;

/* ready queue to run */
extern list_head ready_queue;

/* sleep queue to be blocked in */
extern list_head sleep_queue;

/* current running task PCB */
register pcb_t * current_running asm("tp");
extern pid_t process_id;

extern pcb_t pcb[NUM_MAX_TASK];
extern pcb_t pid0_pcb;
extern const ptr_t pid0_stack;

extern void switch_to(pcb_t *prev, pcb_t *next);
void do_scheduler(void);
void do_sleep(uint32_t);

void do_block(list_node_t *, list_head *queue);
void do_unblock(list_node_t *);

/************************************************************/
/* Do not touch this comment. Reserved for future projects. */
/************************************************************/


/* P3 process-management interfaces. */
#ifdef S_CORE
pid_t do_exec(int id, int argc, uint64_t arg0, uint64_t arg1, uint64_t arg2);
#else
pid_t do_exec(char *name, int argc, char *argv[]);
#endif
void do_exit(void);
int do_kill(pid_t pid);
int do_waitpid(pid_t pid);
void do_process_show(void);
pid_t do_getpid(void);

void init_process_table(void);
void init_pcb_stack(ptr_t ktop, ptr_t utop, ptr_t entry, pcb_t *task,
                    int argc, uint64_t arg0, uint64_t arg1, uint64_t arg2);

#endif
```

## 3. include/os/lock.h

owner 已在 P2 中存在；这里增加退出清理接口及 barrier 的状态字段。

```c
/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *  * * * * * * * * * * *
 *            Copyright (C) 2018 Institute of Computing Technology, CAS
 *               Author : Han Shukai (email : hanshukai@ict.ac.cn)
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *  * * * * * * * * * * *
 *                                   Thread Lock
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *  * * * * * * * * * * *
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *  * * * * * * * * * * */

#ifndef INCLUDE_LOCK_H_
#define INCLUDE_LOCK_H_

#include <os/list.h>

#define LOCK_NUM 16

typedef enum {
    UNLOCKED,
    LOCKED,
} lock_status_t;

typedef struct spin_lock
{
    volatile lock_status_t status;
} spin_lock_t;

typedef struct mutex_lock
{
    spin_lock_t lock;
    list_head block_queue;
    int key;
    int used;
    pid_t owner;
} mutex_lock_t;

void init_locks(void);

void spin_lock_init(spin_lock_t *lock);
int spin_lock_try_acquire(spin_lock_t *lock);
void spin_lock_acquire(spin_lock_t *lock);
void spin_lock_release(spin_lock_t *lock);

int do_mutex_lock_init(int key);
void do_mutex_lock_acquire(int mlock_idx);
void do_mutex_lock_release(int mlock_idx);
void mutex_release_all(pid_t owner);

/************************************************************/
/* Do not touch this comment. Reserved for future projects. */
/************************************************************/

typedef struct barrier
{
    int used;
    int key;
    int goal;
    int arrived;
    unsigned generation;
    list_head wait_queue;
} barrier_t;

#define BARRIER_NUM 16

void init_barriers(void);
int do_barrier_init(int key, int goal);
void do_barrier_wait(int bar_idx);
void do_barrier_destroy(int bar_idx);
struct pcb;
void barrier_cancel_wait(struct pcb *task);

typedef struct condition
{
    // TODO [P3-TASK2 condition]
} condition_t;

#define CONDITION_NUM 16

void init_conditions(void);
int do_condition_init(int key);
void do_condition_wait(int cond_idx, int mutex_idx);
void do_condition_signal(int cond_idx);
void do_condition_broadcast(int cond_idx);
void do_condition_destroy(int cond_idx);

typedef struct semaphore
{
    // TODO [P3-TASK2 semaphore]
} semaphore_t;

#define SEMAPHORE_NUM 16

void init_semaphores(void);
int do_semaphore_init(int key, int init);
void do_semaphore_up(int sema_idx);
void do_semaphore_down(int sema_idx);
void do_semaphore_destroy(int sema_idx);

#define MAX_MBOX_LENGTH (64)

typedef struct mailbox
{
    // TODO [P3-TASK2 mailbox]
} mailbox_t;

#define MBOX_NUM 16
void init_mbox();
int do_mbox_open(char *name);
void do_mbox_close(int mbox_idx);
int do_mbox_send(int mbox_idx, void * msg, int msg_length);
int do_mbox_recv(int mbox_idx, void * msg, int msg_length);

/************************************************************/


#endif
```

## 4. kernel/sched/sched.c

所有队列变更在关闭本地中断时完成。当前进程切走前仍占用 PCB/栈；其他已结束槽位可以复用。

```c
#include <os/list.h>
#include <os/sched.h>
#include <os/time.h>
#include <os/mm.h>
#include <os/irq.h>
#include <os/lock.h>
#include <os/task.h>
#include <os/loader.h>
#include <os/string.h>
#include <os/config.h>
#include <printk.h>
#include <csr.h>
#include <assert.h>

extern int task_num;
extern void ret_from_exception(void);

pcb_t pcb[NUM_MAX_TASK];
const ptr_t pid0_stack = INIT_KERNEL_STACK + PAGE_SIZE;
pcb_t pid0_pcb = { .pid = 0, .kernel_sp = INIT_KERNEL_STACK + PAGE_SIZE,
                   .user_sp = INIT_KERNEL_STACK + PAGE_SIZE };
LIST_HEAD(ready_queue);
LIST_HEAD(sleep_queue);
pid_t process_id = 1;

/* Interrupts are masked. Never recycle the currently executing stack. */
static void reap_exited(void)
{
    for (int i = 0; i < NUM_MAX_TASK; ++i)
        if (&pcb[i] != current_running && pcb[i].used &&
            pcb[i].status == TASK_EXITED)
            pcb[i].used = 0;
}

void init_process_table(void)
{
    list_init(&ready_queue);
    list_init(&sleep_queue);
    bzero(pcb, sizeof(pcb));
    for (int i = 0; i < NUM_MAX_TASK; ++i) {
        pcb[i].status = TASK_EXITED;
        pcb[i].task_id = -1;
        pcb[i].barrier_idx = -1;
        list_init(&pcb[i].list);
        list_init(&pcb[i].wait_list);
    }
    list_init(&pid0_pcb.list);
    list_init(&pid0_pcb.wait_list);
    pid0_pcb.status = TASK_RUNNING;
    pid0_pcb.used = 1;
    pid0_pcb.task_id = -1;
    pid0_pcb.barrier_idx = -1;
    current_running = &pid0_pcb;
    process_id = 1;
    __asm__ volatile ("csrw sscratch, %0" :: "r"(current_running) : "memory");
}

void init_pcb_stack(ptr_t ktop, ptr_t utop, ptr_t entry, pcb_t *task,
                    int argc, uint64_t arg0, uint64_t arg1, uint64_t arg2)
{
    regs_context_t *regs = (regs_context_t *)(ktop - sizeof(*regs));
    switchto_context_t *sw = (switchto_context_t *)((ptr_t)regs - sizeof(*sw));
    bzero(regs, sizeof(*regs));
    bzero(sw, sizeof(*sw));
    regs->regs[2] = utop;
    regs->regs[10] = argc;
    regs->regs[11] = arg0;
    regs->regs[12] = arg1;
    regs->regs[13] = arg2;
    regs->sepc = entry;
#if LAB_STAGE >= 3
    regs->sstatus = SR_SPIE;
#else
    regs->regs[4] = (ptr_t)task;
    regs->sstatus = SR_SPP;
#endif
    sw->regs[0] = (ptr_t)ret_from_exception;
    sw->regs[1] = (ptr_t)sw;
    task->kernel_sp = (ptr_t)sw;
    task->user_sp = utop;
}

void do_scheduler(void)
{
    uint64_t flags = irq_save();
    reap_exited();
    check_sleeping();
    pcb_t *prev = current_running;
    if (prev->status == TASK_RUNNING && prev != &pid0_pcb) {
        prev->status = TASK_READY;
        list_add_tail(&prev->list, &ready_queue);
    }
    list_node_t *node = list_pop_front(&ready_queue);
    pcb_t *next = node ? list_entry(node, pcb_t, list) : &pid0_pcb;
    if (prev == &pid0_pcb && next != prev) prev->status = TASK_READY;
    next->status = TASK_RUNNING;
    if (prev != next) switch_to(prev, next);
    irq_restore(flags);
}

void do_sleep(uint32_t seconds)
{
    uint64_t flags = irq_save();
    if (!seconds) do_scheduler();
    else {
        current_running->wakeup_time = get_ticks() + (uint64_t)seconds * time_base;
        do_block(&current_running->list, &sleep_queue);
    }
    irq_restore(flags);
}

void do_block(list_node_t *node, list_head *queue)
{
    uint64_t flags = irq_save();
    assert(node == &current_running->list && current_running != &pid0_pcb);
    assert(list_empty(node));
    current_running->status = TASK_BLOCKED;
    list_add_tail(node, queue);
    do_scheduler();
    irq_restore(flags);
}

void do_unblock(list_node_t *node)
{
    uint64_t flags = irq_save();
    pcb_t *task = list_entry(node, pcb_t, list);
    assert(task->status == TASK_BLOCKED);
    list_del(node);
    task->status = TASK_READY;
    list_add_tail(node, &ready_queue);
    irq_restore(flags);
}

pid_t do_exec(int id, int argc, uint64_t arg0, uint64_t arg1, uint64_t arg2)
{
    uint64_t flags = irq_save();
    if (id < 0 || id >= task_num || argc < 0 || argc > 3 ||
        process_id == INT32_MAX) {
        irq_restore(flags);
        return -1;
    }
    reap_exited();
    pcb_t *task = NULL;
    int image_in_use = 0;
    for (int i = 0; i < NUM_MAX_TASK; ++i) {
        if (!pcb[i].used && !task) task = &pcb[i];
        if (pcb[i].used && pcb[i].status != TASK_EXITED && pcb[i].task_id == id)
            image_in_use = 1;
    }
    if (!task) {
        irq_restore(flags);
        return -1;
    }
    /* Flat shared images: do not overwrite another live instance's data. */
    ptr_t entry = image_in_use ? tasks[id].entrypoint :
                                load_task_img(tasks[id].task_name);
    if (!entry) {
        irq_restore(flags);
        return -1;
    }
    ptr_t kbase = task->kernel_stack_base;
    ptr_t ubase = task->user_stack_base;
    if (!kbase) kbase = allocKernelPage(1);
    if (!ubase) ubase = allocUserPage(1);
    bzero(task, sizeof(*task));
    task->kernel_stack_base = kbase;
    task->user_stack_base = ubase;
    task->task_id = id;
    task->barrier_idx = -1;
    list_init(&task->list);
    list_init(&task->wait_list);
    init_pcb_stack(kbase + PAGE_SIZE, ubase + PAGE_SIZE, entry,
                   task, argc, arg0, arg1, arg2);
    task->pid = process_id++;
    task->used = 1;
    task->status = TASK_READY;
    list_add_tail(&task->list, &ready_queue);
    pid_t pid = task->pid;
    irq_restore(flags);
    return pid;
}

static pcb_t *find_process(pid_t pid)
{
    for (int i = 0; i < NUM_MAX_TASK; ++i)
        if (pcb[i].used && pcb[i].pid == pid) return &pcb[i];
    return NULL;
}

/* One termination protocol for exit and kill; caller masks interrupts. */
static void finish_process(pcb_t *task)
{
    barrier_cancel_wait(task);
    if (!list_empty(&task->list)) list_del(&task->list);
    task->status = TASK_EXITED;
    mutex_release_all(task->pid);
    while (!list_empty(&task->wait_list)) do_unblock(task->wait_list.next);
    /* Reuse the slot's stacks only when no CPU is executing on them. */
    if (task != current_running) task->used = 0;
}

void do_exit(void)
{
    irq_save();
    assert(current_running != &pid0_pcb);
    finish_process(current_running);
    do_scheduler();
    assert(0);
}

int do_kill(pid_t pid)
{
    uint64_t flags = irq_save();
    pcb_t *task = find_process(pid);
    if (pid <= 0 || !task || task->status == TASK_EXITED) {
        irq_restore(flags);
        return -1;
    }
    int self = task == current_running;
    finish_process(task);
    if (self) {
        do_scheduler();
        assert(0);
    }
    irq_restore(flags);
    return pid;
}

int do_waitpid(pid_t pid)
{
    uint64_t flags = irq_save();
    if (pid <= 0 || pid >= process_id || pid == current_running->pid) {
        irq_restore(flags);
        return -1;
    }
    pcb_t *task = find_process(pid);
    /* Every earlier PID was created; PIDs are monotonic and never reused.
     * A completed PID can still be waited on after its PCB slot is recycled. */
    if (task && task->status != TASK_EXITED)
        do_block(&current_running->list, &task->wait_list);
    irq_restore(flags);
    return pid;
}

pid_t do_getpid(void)
{
    return current_running->pid;
}

void do_process_show(void)
{
    static const char *states[] = {"BLOCKED", "RUNNING", "READY", "EXITED"};
    uint64_t flags = irq_save();
    printk("PID  STATUS   PROGRAM\n");
    printk("0    %s idle\n", states[pid0_pcb.status]);
    for (int i = 0; i < NUM_MAX_TASK; ++i) {
        pcb_t *task = &pcb[i];
        if (task->used && task->status != TASK_EXITED)
            printk("%d    %s %s\n", task->pid, states[task->status],
                   tasks[task->task_id].task_name);
    }
    irq_restore(flags);
}
```

## 5. kernel/locking/lock.c

release_owned_lock 把所有权直接交给第一个等待者；barrier 最后一个到达者清零本轮计数并唤醒整队。

```c
#include <os/lock.h>
#include <os/sched.h>
#include <os/irq.h>
#include <atomic.h>
#include <assert.h>

mutex_lock_t mlocks[LOCK_NUM];
void spin_lock_init(spin_lock_t *lock) { lock->status = UNLOCKED; }
int spin_lock_try_acquire(spin_lock_t *lock)
{
    return atomic_swap(LOCKED, (ptr_t)&lock->status) == UNLOCKED;
}
void spin_lock_acquire(spin_lock_t *lock)
{
    while (!spin_lock_try_acquire(lock)) __asm__ volatile ("nop");
}
void spin_lock_release(spin_lock_t *lock)
{
    atomic_swap(UNLOCKED, (ptr_t)&lock->status);
}
void init_locks(void)
{
    for (int i = 0; i < LOCK_NUM; ++i) {
        spin_lock_init(&mlocks[i].lock);
        list_init(&mlocks[i].block_queue);
        mlocks[i].used = 0;
        mlocks[i].owner = 0;
    }
}
int do_mutex_lock_init(int key)
{
    uint64_t flags = irq_save();
    int free_slot = -1;
    for (int i = 0; i < LOCK_NUM; ++i) {
        if (mlocks[i].used && mlocks[i].key == key) {
            irq_restore(flags);
            return i;
        }
        if (!mlocks[i].used && free_slot < 0) free_slot = i;
    }
    if (free_slot >= 0) {
        mlocks[free_slot].used = 1;
        mlocks[free_slot].key = key;
    }
    irq_restore(flags);
    return free_slot;
}
static mutex_lock_t *get_lock(int id)
{
    assert(id >= 0 && id < LOCK_NUM && mlocks[id].used);
    return &mlocks[id];
}
void do_mutex_lock_acquire(int id)
{
    uint64_t flags = irq_save();
    mutex_lock_t *lock = get_lock(id);
    assert(lock->owner != current_running->pid); /* non-recursive */
    if (spin_lock_try_acquire(&lock->lock)) {
        lock->owner = current_running->pid;
    } else {
        do_block(&current_running->list, &lock->block_queue);
        /* release handed ownership to us; no stealing by a new arrival. */
        assert(lock->owner == current_running->pid);
    }
    irq_restore(flags);
}
/* The owner has already been checked by the caller. */
static void release_owned_lock(mutex_lock_t *lock)
{
    if (!list_empty(&lock->block_queue)) {
        list_node_t *node = lock->block_queue.next;
        lock->owner = list_entry(node, pcb_t, list)->pid;
        do_unblock(node); /* lock remains LOCKED until this owner releases */
    } else {
        lock->owner = 0;
        spin_lock_release(&lock->lock);
    }
}

void do_mutex_lock_release(int id)
{
    uint64_t flags = irq_save();
    mutex_lock_t *lock = get_lock(id);
    assert(lock->owner == current_running->pid);
    release_owned_lock(lock);
    irq_restore(flags);
}

void mutex_release_all(pid_t owner)
{
    uint64_t flags = irq_save();
    for (int i = 0; i < LOCK_NUM; ++i)
        if (mlocks[i].used && mlocks[i].owner == owner)
            release_owned_lock(&mlocks[i]);
    irq_restore(flags);
}

static barrier_t barriers[BARRIER_NUM];

void init_barriers(void)
{
    for (int i = 0; i < BARRIER_NUM; ++i) {
        barriers[i].used = 0;
        barriers[i].arrived = 0;
        barriers[i].generation = 0;
        list_init(&barriers[i].wait_queue);
    }
}

int do_barrier_init(int key, int goal)
{
    uint64_t flags = irq_save();
    if (goal < 1 || goal > NUM_MAX_TASK) {
        irq_restore(flags);
        return -1;
    }
    int free_slot = -1;
    for (int i = 0; i < BARRIER_NUM; ++i) {
        if (barriers[i].used && barriers[i].key == key) {
            int result = barriers[i].goal == goal ? i : -1;
            irq_restore(flags);
            return result;
        }
        if (!barriers[i].used && free_slot < 0) free_slot = i;
    }
    if (free_slot >= 0) {
        barrier_t *bar = &barriers[free_slot];
        bar->used = 1;
        bar->key = key;
        bar->goal = goal;
        bar->arrived = 0;
        ++bar->generation;
        list_init(&bar->wait_queue);
    }
    irq_restore(flags);
    return free_slot;
}

static void wake_barrier_waiters(barrier_t *bar)
{
    while (!list_empty(&bar->wait_queue)) {
        list_node_t *node = bar->wait_queue.next;
        list_entry(node, pcb_t, list)->barrier_idx = -1;
        do_unblock(node);
    }
}

void do_barrier_wait(int id)
{
    uint64_t flags = irq_save();
    if (id < 0 || id >= BARRIER_NUM || !barriers[id].used) {
        irq_restore(flags);
        return;
    }
    barrier_t *bar = &barriers[id];
    if (++bar->arrived == bar->goal) {
        bar->arrived = 0;
        ++bar->generation;
        wake_barrier_waiters(bar);
    } else {
        current_running->barrier_idx = id;
        do_block(&current_running->list, &bar->wait_queue);
        current_running->barrier_idx = -1;
    }
    irq_restore(flags);
}

void do_barrier_destroy(int id)
{
    uint64_t flags = irq_save();
    if (id >= 0 && id < BARRIER_NUM && barriers[id].used) {
        barrier_t *bar = &barriers[id];
        bar->used = 0;
        bar->arrived = 0;
        ++bar->generation;
        wake_barrier_waiters(bar); /* Destroy cancels outstanding waits. */
    }
    irq_restore(flags);
}

/* Termination removes a waiting participant; it does not silently count that
 * participant as an arrival. The application can destroy/cancel the barrier. */
void barrier_cancel_wait(pcb_t *task)
{
    int id = task->barrier_idx;
    if (id >= 0 && id < BARRIER_NUM && barriers[id].used &&
        barriers[id].arrived > 0)
        --barriers[id].arrived;
    task->barrier_idx = -1;
}
```

## 6. init/main.c

仅有 syscall 编号和用户包装还不够，必须在 init_syscall 里登记处理函数；k_write 也要跟随动态 PID 修改。

```c
#include <common.h>
#include <asm/regs.h>
#include <asm/unistd.h>
#include <os/config.h>
#include <os/irq.h>
#include <os/sched.h>
#include <os/lock.h>
#include <os/kernel.h>
#include <os/task.h>
#include <os/loader.h>
#include <os/string.h>
#include <os/mm.h>
#include <os/time.h>
#include <sys/syscall.h>
#include <screen.h>
#include <printk.h>
#include <assert.h>
#include <csr.h>

extern void ret_from_exception(void);
task_info_t tasks[TASK_MAXNUM];
int task_num;

_Static_assert(sizeof(regs_context_t) == OFFSET_SIZE, "trap ABI size");
_Static_assert(sizeof(switchto_context_t) == SWITCH_TO_SIZE, "switch ABI size");
_Static_assert(__builtin_offsetof(pcb_t, kernel_sp) == PCB_KERNEL_SP, "kernel_sp ABI");
_Static_assert(__builtin_offsetof(pcb_t, user_sp) == PCB_USER_SP, "user_sp ABI");
_Static_assert(__builtin_offsetof(pcb_t, trap_t0) == PCB_TRAP_T0, "trap scratch ABI");
_Static_assert(sizeof(task_info_t) == 48, "disk task metadata ABI");

/* Wrappers provide one uniform syscall ABI, including defined void returns. */
static long k_yield(long a, long b, long c, long d, long e)
{ do_scheduler(); return 0; }
static long k_write(long p, long b, long c, long d, long e)
{
    /* No page tables in P2. Validate the complete string against this task's
     * user image or user stack before dereferencing it, also for loadbootd. */
    uint64_t begin = (uint64_t)p, limit = 0;
    int id = current_running->task_id;
    if (id >= 0 && id < task_num && begin >= tasks[id].entrypoint &&
        begin < tasks[id].entrypoint + TASK_SIZE)
        limit = tasks[id].entrypoint + TASK_SIZE;
    if (begin >= current_running->user_stack_base &&
        begin < current_running->user_stack_base + PAGE_SIZE)
        limit = current_running->user_stack_base + PAGE_SIZE;
    if (!limit) return -14;
    char *text = (char *)p;
    uint64_t i = 0;
    while (begin + i < limit && text[i]) ++i;
    if (begin + i == limit) return -14;
    screen_write(text);
#if LAB_STAGE < 4
    screen_reflush();
#endif
    return 0;
}
static long k_cursor(long x, long y, long c, long d, long e)
{ screen_move_cursor(x, y); return 0; }
static long k_refresh(long a, long b, long c, long d, long e)
{ screen_reflush(); return 0; }
static long k_sleep(long s, long b, long c, long d, long e)
{ do_sleep((uint32_t)s); return 0; }
static long k_lock_init(long key, long b, long c, long d, long e)
{ return do_mutex_lock_init((int)key); }
static long k_lock_acq(long id, long b, long c, long d, long e)
{ do_mutex_lock_acquire((int)id); return 0; }
static long k_lock_rel(long id, long b, long c, long d, long e)
{ do_mutex_lock_release((int)id); return 0; }
static long k_timebase(long a, long b, long c, long d, long e)
{ return get_time_base(); }
static long k_ticks(long a, long b, long c, long d, long e)
{ return get_ticks(); }

static long k_putstr(long p, long b, long c, long d, long e)
{ port_write((char *)p); return 0; }
static long k_putchar(long ch, long b, long c, long d, long e)
{ port_write_ch(ch); return 0; }
static long k_getchar(long a, long b, long c, long d, long e)
{ return port_read_ch(); }
static long k_exec(long id, long argc, long a0, long a1, long a2)
{ return do_exec((int)id, (int)argc, a0, a1, a2); }
static long k_exit(long a, long b, long c, long d, long e)
{ do_exit(); return 0; }
static long k_kill(long pid, long b, long c, long d, long e)
{ return do_kill((pid_t)pid); }
static long k_waitpid(long pid, long b, long c, long d, long e)
{ return do_waitpid((pid_t)pid); }
static long k_ps(long a, long b, long c, long d, long e)
{ do_process_show(); return 0; }
static long k_getpid(long a, long b, long c, long d, long e)
{ return do_getpid(); }
static long k_clear(long a, long b, long c, long d, long e)
{ screen_clear(); return 0; }
static long k_barrier_init(long key, long goal, long c, long d, long e)
{ return do_barrier_init((int)key, (int)goal); }
static long k_barrier_wait(long id, long b, long c, long d, long e)
{ do_barrier_wait((int)id); return 0; }
static long k_barrier_destroy(long id, long b, long c, long d, long e)
{ do_barrier_destroy((int)id); return 0; }

static long k_sdread(long p, long n, long block, long d, long e)
{ return sd_read(p, n, block); }
static long k_sdwrite(long p, long n, long block, long d, long e)
{ return sd_write(p, n, block); }
static long k_logging(long p, long b, long c, long d, long e)
{ qemu_logging((char *)p); return 0; }
static long k_settimer(long ticks, long b, long c, long d, long e)
{ set_timer(ticks); return 0; }
static long k_fdt(long type, long b, long c, long d, long e)
{ return read_fdt(type); }

static void init_jmptab(void)
{
    long (**table)() = (long (**)())KERNEL_JMPTAB_BASE;
    table[CONSOLE_PUTSTR] = k_putstr;
    table[CONSOLE_PUTCHAR] = k_putchar;
    table[CONSOLE_GETCHAR] = k_getchar;
    table[SD_READ] = k_sdread;
    table[SD_WRITE] = k_sdwrite;
    table[QEMU_LOGGING] = k_logging;
    table[SET_TIMER] = k_settimer;
    table[READ_FDT] = k_fdt;
    table[MOVE_CURSOR] = k_cursor;
    table[PRINT] = k_write;
    table[YIELD] = k_yield;
    table[MUTEX_INIT] = k_lock_init;
    table[MUTEX_ACQ] = k_lock_acq;
    table[MUTEX_RELEASE] = k_lock_rel;
    table[REFLUSH] = k_refresh;
}

static void init_task_info(int count, uint32_t offset)
{
    assert(count > 0 && count <= TASK_MAXNUM && count <= NUM_MAX_TASK);
    task_num = count;
    load_img_bytes(offset, count * sizeof(task_info_t), tasks);
    for (int i = 0; i < count; ++i) {
        assert(tasks[i].task_name[TASK_NAME_LEN-1] == 0);
        assert(tasks[i].entrypoint == TASK_MEM_BASE + (ptr_t)i * TASK_SIZE);
        assert(tasks[i].size > 0 && tasks[i].size <= TASK_SIZE);
    }
}

static void init_pcb(void)
{
    init_process_table();
    for (int i = 0; i < task_num; ++i) {
        if (!strcmp(tasks[i].task_name, "shell")) {
            assert(do_exec(i, 0, 0, 0, 0) == 1);
            return;
        }
    }
    /* Keeps small P2 regression images usable when no shell is included. */
    for (int i = 0; i < task_num; ++i)
        assert(do_exec(i, 0, 0, 0, 0) > 0);
}

static void init_syscall(void)
{
    bzero(syscall, sizeof(long (*)()) * NUM_SYSCALLS);
    syscall[SYSCALL_YIELD] = k_yield;
    syscall[SYSCALL_WRITE] = k_write;
    syscall[SYSCALL_CURSOR] = k_cursor;
    syscall[SYSCALL_REFLUSH] = k_refresh;
    syscall[SYSCALL_SLEEP] = k_sleep;
    syscall[SYSCALL_LOCK_INIT] = k_lock_init;
    syscall[SYSCALL_LOCK_ACQ] = k_lock_acq;
    syscall[SYSCALL_LOCK_RELEASE] = k_lock_rel;
    syscall[SYSCALL_GET_TIMEBASE] = k_timebase;
    syscall[SYSCALL_GET_TICK] = k_ticks;
    syscall[SYSCALL_EXEC] = k_exec;
    syscall[SYSCALL_EXIT] = k_exit;
    syscall[SYSCALL_KILL] = k_kill;
    syscall[SYSCALL_WAITPID] = k_waitpid;
    syscall[SYSCALL_PS] = k_ps;
    syscall[SYSCALL_GETPID] = k_getpid;
    syscall[SYSCALL_READCH] = k_getchar;
    syscall[SYSCALL_CLEAR] = k_clear;
    syscall[SYSCALL_BARR_INIT] = k_barrier_init;
    syscall[SYSCALL_BARR_WAIT] = k_barrier_wait;
    syscall[SYSCALL_BARR_DESTROY] = k_barrier_destroy;
}

int main(int count, uint32_t app_offset)
{
    init_jmptab();
    init_task_info(count, app_offset);
    init_pcb();
    time_base = bios_read_fdt(TIMEBASE);
    assert(time_base > 0);
    init_locks();
    init_barriers();
    init_syscall();
    init_exception();
    init_screen();
    printk("[INIT] P3 S-Core, stage %d, %d images, timebase=%lu\n\r",
           LAB_STAGE, task_num, time_base);
#if LAB_STAGE >= 4
    bios_set_timer(get_ticks() + TIMER_INTERVAL);
    enable_preempt();
#endif
    /************************************************************/
    /* Do not touch this comment. Reserved for future projects. */
    /************************************************************/
    while (1) {
        disable_interrupt();
        do_scheduler();
#if LAB_STAGE >= 4
        /* WFI may wake on a pending individually enabled interrupt even
         * with global SIE clear. Enable after WFI to service it safely. */
        __asm__ volatile ("wfi");
        enable_interrupt();
#endif
        /* Stage 3 deliberately polls here when every task is asleep. */
    }
}
```

## 7. arch/riscv/crt0/crt0.S

子程序 main 正常返回时也会执行 sys_exit，而不是永久 yield。

```asm
#include <asm.h>
.section ".entry_function","ax"
ENTRY(_start)
    /* The kernel already supplied a private aligned stack. */
    la t0, __bss_start
    la t1, __BSS_END__
1:  bgeu t0, t1, 2f
    sb zero, 0(t0)
    addi t0, t0, 1
    j 1b
2:  call main
    /* main's return value is not an exit status in this course interface. */
    call sys_exit
3:  call sys_yield
    j 3b
    /************************************************************/
    /* Do not touch this comment. Reserved for future projects. */
    /************************************************************/
ENDPROC(_start)
```

## 8. tiny_libc/syscall.c

保留 P2 的真实 ecall；合并时已有的其他档位包装保留，S-Core 内核只登记本次实现的功能。

```c
#include <syscall.h>
#include <stdint.h>
#include <kernel.h>
#include <unistd.h>

static long invoke_syscall(long number, long p0, long p1, long p2, long p3, long p4)
{
    register long a0 asm("a0") = p0;
    register long a1 asm("a1") = p1;
    register long a2 asm("a2") = p2;
    register long a3 asm("a3") = p3;
    register long a4 asm("a4") = p4;
    register long a7 asm("a7") = number;
    asm volatile ("ecall" : "+r"(a0) : "r"(a1), "r"(a2), "r"(a3),
                  "r"(a4), "r"(a7) : "memory");
    return a0;
}
void sys_yield(void)
{
#if LAB_STAGE < 3
    call_jmptab(YIELD, 0, 0, 0, 0, 0);
#else
    invoke_syscall(SYSCALL_YIELD, 0, 0, 0, 0, 0);
#endif
}
void sys_move_cursor(int x, int y)
{
#if LAB_STAGE < 3
    call_jmptab(MOVE_CURSOR, x, y, 0, 0, 0);
#else
    invoke_syscall(SYSCALL_CURSOR, x, y, 0, 0, 0);
#endif
}
void sys_write(char *buff)
{
#if LAB_STAGE < 3
    call_jmptab(PRINT, (long)buff, 0, 0, 0, 0);
#else
    invoke_syscall(SYSCALL_WRITE, (long)buff, 0, 0, 0, 0);
#endif
}
void sys_reflush(void)
{
#if LAB_STAGE < 3
    call_jmptab(REFLUSH, 0, 0, 0, 0, 0);
#else
    invoke_syscall(SYSCALL_REFLUSH, 0, 0, 0, 0, 0);
#endif
}
int sys_mutex_init(int key)
{
#if LAB_STAGE < 3
    return call_jmptab(MUTEX_INIT, key, 0, 0, 0, 0);
#else
    return invoke_syscall(SYSCALL_LOCK_INIT, key, 0, 0, 0, 0);
#endif
}
void sys_mutex_acquire(int id)
{
#if LAB_STAGE < 3
    call_jmptab(MUTEX_ACQ, id, 0, 0, 0, 0);
#else
    invoke_syscall(SYSCALL_LOCK_ACQ, id, 0, 0, 0, 0);
#endif
}
void sys_mutex_release(int id)
{
#if LAB_STAGE < 3
    call_jmptab(MUTEX_RELEASE, id, 0, 0, 0, 0);
#else
    invoke_syscall(SYSCALL_LOCK_RELEASE, id, 0, 0, 0, 0);
#endif
}
long sys_get_timebase(void)
{
    return invoke_syscall(SYSCALL_GET_TIMEBASE, 0, 0, 0, 0, 0);
}
long sys_get_tick(void)
{
    return invoke_syscall(SYSCALL_GET_TICK, 0, 0, 0, 0, 0);
}
void sys_sleep(uint32_t seconds)
{
    invoke_syscall(SYSCALL_SLEEP, seconds, 0, 0, 0, 0);
}
/************************************************************/
/* Do not touch this comment. Reserved for future projects. */
/************************************************************/

/* P3 user wrappers. S-Core handlers are registered by init_syscall(). */
#ifdef S_CORE
pid_t sys_exec(int id, int argc, uint64_t arg0, uint64_t arg1, uint64_t arg2)
{
    return invoke_syscall(SYSCALL_EXEC, id, argc, arg0, arg1, arg2);
}
#else
pid_t sys_exec(char *name, int argc, char **argv)
{
    return invoke_syscall(SYSCALL_EXEC, (long)name, argc, (long)argv, 0, 0);
}
#endif

void sys_exit(void)
{
    invoke_syscall(SYSCALL_EXIT, 0, 0, 0, 0, 0);
}

int sys_kill(pid_t pid)
{
    return invoke_syscall(SYSCALL_KILL, pid, 0, 0, 0, 0);
}

int sys_waitpid(pid_t pid)
{
    return invoke_syscall(SYSCALL_WAITPID, pid, 0, 0, 0, 0);
}

void sys_ps(void)
{
    invoke_syscall(SYSCALL_PS, 0, 0, 0, 0, 0);
}

pid_t sys_getpid(void)
{
    return invoke_syscall(SYSCALL_GETPID, 0, 0, 0, 0, 0);
}

int sys_getchar(void)
{
    return invoke_syscall(SYSCALL_READCH, 0, 0, 0, 0, 0);
}

void sys_clear(void)
{
    invoke_syscall(SYSCALL_CLEAR, 0, 0, 0, 0, 0);
}

int sys_barrier_init(int key, int goal)
{
    return invoke_syscall(SYSCALL_BARR_INIT, key, goal, 0, 0, 0);
}

void sys_barrier_wait(int bar_idx)
{
    invoke_syscall(SYSCALL_BARR_WAIT, bar_idx, 0, 0, 0, 0);
}

void sys_barrier_destroy(int bar_idx)
{
    invoke_syscall(SYSCALL_BARR_DESTROY, bar_idx, 0, 0, 0, 0);
}

int sys_condition_init(int key)
{
    return invoke_syscall(SYSCALL_COND_INIT, key, 0, 0, 0, 0);
}

void sys_condition_wait(int cond_idx, int mutex_idx)
{
    invoke_syscall(SYSCALL_COND_WAIT, cond_idx, mutex_idx, 0, 0, 0);
}

void sys_condition_signal(int cond_idx)
{
    invoke_syscall(SYSCALL_COND_SIGNAL, cond_idx, 0, 0, 0, 0);
}

void sys_condition_broadcast(int cond_idx)
{
    invoke_syscall(SYSCALL_COND_BROADCAST, cond_idx, 0, 0, 0, 0);
}

void sys_condition_destroy(int cond_idx)
{
    invoke_syscall(SYSCALL_COND_DESTROY, cond_idx, 0, 0, 0, 0);
}

int sys_semaphore_init(int key, int init)
{
    return invoke_syscall(SYSCALL_SEMA_INIT, key, init, 0, 0, 0);
}

void sys_semaphore_up(int sema_idx)
{
    invoke_syscall(SYSCALL_SEMA_UP, sema_idx, 0, 0, 0, 0);
}

void sys_semaphore_down(int sema_idx)
{
    invoke_syscall(SYSCALL_SEMA_DOWN, sema_idx, 0, 0, 0, 0);
}

void sys_semaphore_destroy(int sema_idx)
{
    invoke_syscall(SYSCALL_SEMA_DESTROY, sema_idx, 0, 0, 0, 0);
}

int sys_mbox_open(char *name)
{
    return invoke_syscall(SYSCALL_MBOX_OPEN, (long)name, 0, 0, 0, 0);
}

void sys_mbox_close(int mbox_id)
{
    invoke_syscall(SYSCALL_MBOX_CLOSE, mbox_id, 0, 0, 0, 0);
}

int sys_mbox_send(int mbox_idx, void *msg, int msg_length)
{
    return invoke_syscall(SYSCALL_MBOX_SEND, mbox_idx, (long)msg, msg_length, 0, 0);
}

int sys_mbox_recv(int mbox_idx, void *msg, int msg_length)
{
    return invoke_syscall(SYSCALL_MBOX_RECV, mbox_idx, (long)msg, msg_length, 0, 0);
}
```

## 9. test/shell.c

读取 UART 字符、回显、限制长度、退格、拆分命令和数字解析；前台与后台只差是否 waitpid。

```c
/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *  * * * * * * * * * * *
 *            Copyright (C) 2018 Institute of Computing Technology, CAS
 *               Author : Han Shukai (email : hanshukai@ict.ac.cn)
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *  * * * * * * * * * * *
 *                  The shell acts as a task running in user mode.
 *       The main function is to make system calls through the user's output.
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *  * * * * * * * * * * *
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
 * persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *  * * * * * * * * * * */

/* Project3 S-Core shell implementation. */
#include <stdio.h>
#include <stdint.h>
#include <unistd.h>
#include <string.h>

#define SHELL_BEGIN 20
#define LINE_SIZE 128
#define MAX_WORDS 8

static int number(const char *s, uint64_t *out)
{
    int negative = 0, base = 10, digits = 0;
    uint64_t value = 0;
    if (*s == '+' || *s == '-') { negative = *s == '-'; ++s; }
    if (s[0] == '0' && (s[1] == 'x' || s[1] == 'X')) {
        base = 16;
        s += 2;
    }
    uint64_t limit = negative ? (1ULL << 63) : ~0ULL;
    for (; *s; ++s) {
        unsigned digit;
        if (*s >= '0' && *s <= '9') digit = *s - '0';
        else if (*s >= 'a' && *s <= 'f') digit = *s - 'a' + 10;
        else if (*s >= 'A' && *s <= 'F') digit = *s - 'A' + 10;
        else return 0;
        if (digit >= (unsigned)base || value > (limit - digit) / base) return 0;
        value = value * base + digit;
        ++digits;
    }
    if (!digits) return 0;
    *out = negative ? 0 - value : value;
    return 1;
}

static int split(char *line, char **words)
{
    int count = 0;
    while (*line) {
        while (*line == ' ' || *line == '\t') ++line;
        if (!*line) break;
        if (count == MAX_WORDS) return -1;
        words[count++] = line;
        while (*line && *line != ' ' && *line != '\t') ++line;
        if (*line) *line++ = '\0';
    }
    return count;
}

static void banner(void)
{
    sys_move_cursor(0, SHELL_BEGIN);
    printf("------------------- COMMAND -------------------\n");
}

static void command(char *line)
{
    char *words[MAX_WORDS];
    int count = split(line, words);
    if (!count) return;
    if (count < 0) { printf("Too many arguments\n"); return; }
    if (!strcmp(words[0], "ps") && count == 1) sys_ps();
    else if (!strcmp(words[0], "clear") && count == 1) {
        sys_clear();
        banner();
    } else if (!strcmp(words[0], "help") && count == 1) {
        printf("ps | clear | exec ID [arg0 arg1 arg2] [&] | kill PID\n");
        printf("Use 'make list-tasks' in the Linux terminal to see program IDs.\n");
    } else if (!strcmp(words[0], "exec")) {
        int background = !strcmp(words[count - 1], "&");
        if (background) --count;
        uint64_t id, args[3] = {0};
        if (count < 2 || count > 5 || !number(words[1], &id) || id > INT32_MAX) {
            printf("Usage: exec ID [arg0 arg1 arg2] [&]\n");
            return;
        }
        for (int i = 2; i < count; ++i) {
            if (!number(words[i], &args[i - 2])) {
                printf("Invalid numeric argument\n");
                return;
            }
        }
        pid_t pid = sys_exec((int)id, count - 2, args[0], args[1], args[2]);
        if (pid < 0) printf("exec failed\n");
        else if (background) printf("[shell] started pid=%d\n", pid);
        else sys_waitpid(pid);
    } else if (!strcmp(words[0], "kill")) {
        uint64_t pid;
        if (count != 2 || !number(words[1], &pid) || pid == 0 || pid > INT32_MAX) {
            printf("Usage: kill PID\n");
            return;
        }
        if (sys_kill((pid_t)pid) < 0) printf("kill failed\n");
        else printf("[shell] killed pid=%d\n", (int)pid);
    } else printf("Unknown command\n");
}

int main(void)
{
    char line[LINE_SIZE];
    int length = 0, skip_lf = 0;
    banner();
    printf("> root@UCAS_OS: ");
    for (;;) {
        int ch = sys_getchar();
        if (ch < 0) { sys_yield(); continue; }
        if (skip_lf && ch == '\n') { skip_lf = 0; continue; }
        skip_lf = 0;
        if (ch == '\r' || ch == '\n') {
            skip_lf = ch == '\r';
            line[length] = '\0';
            printf("\n");
            command(line);
            length = 0;
            printf("> root@UCAS_OS: ");
        } else if (ch == '\b' || ch == 127) {
            if (length > 0) { --length; printf("\b"); }
        } else {
            if (ch == '\t') ch = ' ';
            if (ch >= 32 && ch <= 126 && length < LINE_SIZE - 1) {
                line[length++] = ch;
                printf("%c", ch);
            }
        }
    }
}
```

## 10. test/test_project3/waitpid.c

只填写 rte_id=2、wl_id=3。

```c
#include <stdio.h>
#include <unistd.h>
#include <stdlib.h>
#include <assert.h>

#define LOCK1_KEY 20
#define LOCK2_KEY 22

#define BUF_LEN 10

#ifdef S_CORE
int main(int argc, int arg0)
{
    int print_location = (argc == 1) ? 0 : arg0;

    // Init two mutex locks, and convert decimal handle to string via itoa
    int handle1 = sys_mutex_init(LOCK1_KEY);
    int handle2 = sys_mutex_init(LOCK2_KEY);


    // Launch two assistant processes, and pass mutex handles to them
    // TODO: [P3-TASK1 S-core] use your "ready_to_exit" id here
    int rte_id = 2;
    assert(rte_id != -1);
    pid_t pid1 = sys_exec(rte_id, 3, print_location + 1, handle1, handle2);

    sys_sleep(1);  // wait enough time for task1 to acquire locks
    

    // TODO: [P3-TASK1 S-core] use your "wait_locks" id here
    int wl_id = 3;
    assert(wl_id != -1);
    pid_t pid2 = sys_exec(wl_id, 3, print_location + 2, handle1, handle2);

    // Start to waitpid(pid1)
    sys_move_cursor(0, print_location);
    printf("> [TASK] I want to wait task (pid=%d) to exit.", pid1);
    sys_waitpid(pid1);

    // Finish waitpid(pid1)
    sys_move_cursor(0, print_location);
    printf("> [TASK] Task (pid=%d) has exited.                ", pid1);

    // Start to waitpid(pid2)
    sys_move_cursor(0, print_location);
    printf("> [TASK] I want to wait task (pid=%d) to exit.", pid2);
    sys_waitpid(pid2);

    // Finish waitpid(pid2)
    sys_move_cursor(0, print_location);
    printf("> [TASK] Task (pid=%d) has exited.                ", pid2);

    return 0;
}

#else
int main(int argc, char *argv[])
{
    assert(argc >= 1);
    int print_location = (argc == 1) ? 0 : atoi(argv[1]);


    // Init two mutex locks, and convert decimal handle to string via itoa
    int handle1 = sys_mutex_init(LOCK1_KEY);
    int handle2 = sys_mutex_init(LOCK2_KEY);

    char buf1[BUF_LEN];
    char buf2[BUF_LEN];
    assert(itoa(handle1, buf1, BUF_LEN, 10) != -1);
    assert(itoa(handle2, buf2, BUF_LEN, 10) != -1);

    // Launch two assistant processes, and pass mutex handles to them
    char location1[BUF_LEN];
    assert(itoa(print_location + 1, location1, BUF_LEN, 10) != -1);

    char *argv1[4] = {"ready_to_exit", location1, buf1, buf2};
    pid_t pid1 = sys_exec(argv1[0], 4, argv1);

    sys_sleep(1);  // wait enough time for task1 to acquire locks
    
    char location2[BUF_LEN];
    assert(itoa(print_location + 2, location2, BUF_LEN, 10) != -1);

    char *argv2[4] = {"wait_locks", location2, buf1, buf2};
    pid_t pid2 = sys_exec(argv2[0], 4, argv2);

    // Start to waitpid(pid1)
    sys_move_cursor(0, print_location);
    printf("> [TASK] I want to wait task (pid=%d) to exit.", pid1);
    sys_waitpid(pid1);

    // Finish waitpid(pid1)
    sys_move_cursor(0, print_location);
    printf("> [TASK] Task (pid=%d) has exited.                ", pid1);

    // Start to waitpid(pid2)
    sys_move_cursor(0, print_location);
    printf("> [TASK] I want to wait task (pid=%d) to exit.", pid2);
    sys_waitpid(pid2);

    // Finish waitpid(pid2)
    sys_move_cursor(0, print_location);
    printf("> [TASK] Task (pid=%d) has exited.                ", pid2);

    return 0;
}
#endif
```

## 11. test/test_project3/barrier.c

只填写 tb_id=5。

```c
#include <stdio.h>
#include <unistd.h>
#include <stdlib.h>
#include <assert.h>
#include <string.h>

#define NUM_TB 3
#define BARR_KEY 58
#define BUF_LEN 20

#ifdef S_CORE
int main(int argc, int arg0)
{
    int print_location = (argc == 1) ? 0 : arg0;

    // Initialize barrier
    int handle = sys_barrier_init(BARR_KEY, NUM_TB);

    // Launch child processes
    pid_t pids[NUM_TB];
    
    // Start three test programs
    for (int i = 0; i < NUM_TB; ++i)
    {
        // TODO: [P3-TASK2 S-core] use your "test_barrier" id here        
        int tb_id = 5;
        assert(tb_id != -1);
        pids[i] = sys_exec(tb_id, 2, print_location + i, handle, 0);       
    }

    // Wait child processes to exit
    for (int i = 0; i < NUM_TB; ++i)
    {
        sys_waitpid(pids[i]);
    }

    // Destroy barrier
    sys_barrier_destroy(handle);

    return 0;
}

#else
int main(int argc, char *argv[])
{
    assert(argc >= 1);
    int print_location = (argc == 1) ? 0 : atoi(argv[1]);

    // Initialize barrier
    int handle = sys_barrier_init(BARR_KEY, NUM_TB);

    // Launch child processes
    pid_t pids[NUM_TB];
    
    // Start three test programs
    for (int i = 0; i < NUM_TB; ++i)
    {
        char buf_location[BUF_LEN];
        char buf_handle[BUF_LEN];
        assert(itoa(print_location + i, buf_location, BUF_LEN, 10) != -1);
        assert(itoa(handle, buf_handle, BUF_LEN, 10) != -1);

        char *argv[3] = {"test_barrier", buf_location, buf_handle};
        pids[i] = sys_exec(argv[0], 3, argv);

    }

    // Wait child processes to exit
    for (int i = 0; i < NUM_TB; ++i)
    {
        sys_waitpid(pids[i]);
    }

    // Destroy barrier
    sys_barrier_destroy(handle);

    return 0;
}
#endif
```

## 12. drivers/screen.c

核对先移动光标，再把新位置写成空格；shell 决定是否允许退格。

```c
#include <screen.h>
#include <printk.h>
#include <os/string.h>
#include <os/sched.h>
#include <os/irq.h>
#include <os/kernel.h>

#define SCREEN_WIDTH    80
#define SCREEN_HEIGHT   50
#define SCREEN_LOC(x, y) ((y) * SCREEN_WIDTH + (x))

/* screen buffer */
char new_screen[SCREEN_HEIGHT * SCREEN_WIDTH] = {0};
char old_screen[SCREEN_HEIGHT * SCREEN_WIDTH] = {0};

/* cursor position */
static void vt100_move_cursor(int x, int y)
{
    // \033[y;xH
    printv("%c[%d;%dH", 27, y, x);
}

/* clear screen */
static void vt100_clear()
{
    // \033[2J
    printv("%c[2J", 27);
}

/* hidden cursor */
static void vt100_hidden_cursor()
{
    // \033[?25l
    printv("%c[?25l", 27);
}

/* write a char */
/* write a char */
void screen_write_ch(char ch)
{
    if (ch == '\n')
    {
        current_running->cursor_x = 0;
        if (current_running->cursor_y < SCREEN_HEIGHT - 1)
            current_running->cursor_y++;
    }
    else if (ch == '\b' || ch == '\177')
    {	
        int x = current_running->cursor_x;
        int y = current_running->cursor_y;
        if (x > 0) --x;
        else if (y > 0) { --y; x = SCREEN_WIDTH - 1; }
        else return;
        current_running->cursor_x = x;
        current_running->cursor_y = y;
        new_screen[SCREEN_LOC(x, y)] = ' ';
    }
    else
    {
        new_screen[SCREEN_LOC(current_running->cursor_x, current_running->cursor_y)] = ch;
        if (++current_running->cursor_x >= SCREEN_WIDTH)
        {
            current_running->cursor_x = 0;
            if (current_running->cursor_y < SCREEN_HEIGHT - 1)
                current_running->cursor_y++;
        }
    }
}



void init_screen(void)
{
    vt100_hidden_cursor();
    vt100_clear();
    screen_clear();
}

void screen_clear(void)
{
    int i, j;
    vt100_clear();
    for (i = 0; i < SCREEN_HEIGHT; i++)
    {
        for (j = 0; j < SCREEN_WIDTH; j++)
        {
            new_screen[SCREEN_LOC(j, i)] = ' ';
            old_screen[SCREEN_LOC(j, i)] = ' ';
        }
    }
    current_running->cursor_x = 0;
    current_running->cursor_y = 0;
    screen_reflush();
}

void screen_move_cursor(int x, int y)
{
    if (x >= SCREEN_WIDTH)
        x = SCREEN_WIDTH - 1;
    else if (x < 0)
        x = 0;
    if (y >= SCREEN_HEIGHT)
        y = SCREEN_HEIGHT - 1;
    else if (y < 0)
        y = 0;
    current_running->cursor_x = x;
    current_running->cursor_y = y;
    vt100_move_cursor(x + 1, y + 1);
}



void screen_write(char *buff)
{
    int i = 0;
    int l = strlen(buff);

    for (i = 0; i < l; i++)
    {
        screen_write_ch(buff[i]);
    }
}

/*
 * This function is used to print the serial port when the clock
 * interrupt is triggered. However, we need to pay attention to
 * the fact that in order to speed up printing, we only refresh
 * the characters that have been modified since this time.
 */
void screen_reflush(void)
{
    int i, j;

    /* here to reflush screen buffer to serial port */
    for (i = 0; i < SCREEN_HEIGHT; i++)
    {
        for (j = 0; j < SCREEN_WIDTH; j++)
        {
            /* We only print the data of the modified location. */
            if (new_screen[SCREEN_LOC(j, i)] != old_screen[SCREEN_LOC(j, i)])
            {
                vt100_move_cursor(j + 1, i + 1);
                bios_putchar(new_screen[SCREEN_LOC(j, i)]);
                old_screen[SCREEN_LOC(j, i)] = new_screen[SCREEN_LOC(j, i)];
            }
        }
    }

    /* recover cursor position */
    vt100_move_cursor(current_running->cursor_x + 1, current_running->cursor_y + 1);
}
```

## 13. tiny_libc/include/unistd.h

S-Core 用户和内核采用同一组五参数 exec 接口，sys_clear 声明与实现对应。

```c
#ifndef __UNISTD_H__
#define __UNISTD_H__

#include <stdint.h>
typedef int32_t pid_t;


void sys_sleep(uint32_t time);
void sys_yield(void);
void sys_write(char *buff);
void sys_move_cursor(int x, int y);
void sys_reflush(void);
long sys_get_timebase(void);
long sys_get_tick(void);
int sys_mutex_init(int key);
void sys_mutex_acquire(int mutex_idx);
void sys_mutex_release(int mutex_idx);

/************************************************************/
/* TODO: [P3 task1] ps, getchar */
void sys_ps(void);
int  sys_getchar(void);
void sys_clear(void);

/* TODO: [P3 task1] exec, exit, kill waitpid */
#ifdef S_CORE
pid_t sys_exec(int id, int argc, uint64_t arg0, uint64_t arg1, uint64_t arg2);
#else
pid_t sys_exec(char *name, int argc, char **argv);
#endif

void sys_exit(void);
int  sys_kill(pid_t pid);
int  sys_waitpid(pid_t pid);
pid_t sys_getpid(void);


/* TODO: [P3 task2] barrier */ 
int  sys_barrier_init(int key, int goal);
void sys_barrier_wait(int bar_idx);
void sys_barrier_destroy(int bar_idx);

/* TODO: [P3 task2] condition */ 
int sys_condition_init(int key);
void sys_condition_wait(int cond_idx, int mutex_idx);
void sys_condition_signal(int cond_idx);
void sys_condition_broadcast(int cond_idx);
void sys_condition_destroy(int cond_idx);

/* TODO: [P3 task2] mailbox */ 
int sys_mbox_open(char * name);
void sys_mbox_close(int mbox_id);
int sys_mbox_send(int mbox_idx, void *msg, int msg_length);
int sys_mbox_recv(int mbox_idx, void *msg, int msg_length);
/************************************************************/

#endif
```

## 附加验证文件

源码包还加入 test/validation/p3_shared.h、p3_probe.c、p3_worker.c 与 tools/host_qemu_p3.py；test/host-qemu/firmware.S 增加测试串口输入。这些文件用于验证真实内核行为，不属于老师的课程 BIOS 或必须提交的实验主体。
