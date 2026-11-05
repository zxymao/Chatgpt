"""Classify every original TODO marker for the reader, including legacy markers."""
import re


def appendix_for(project, path, line):
    if path == "README.md":
        return "DOC"
    if path == "drivers/screen.c" or path == "test.S":
        return "OUT"
    if path == "tools/createimage.c" or path == "include/os/task.h":
        return "A1"
    if path == "arch/riscv/boot/bootblock.S":
        return "A2"
    if path in {"arch/riscv/kernel/head.S", "arch/riscv/crt0/crt0.S"}:
        return "A3"
    if path == "kernel/loader/loader.c":
        return "A4"
    if path == "include/os/list.h":
        return "A6"
    if path == "tiny_libc/syscall.c" or path == "kernel/syscall/syscall.c":
        return "A14"
    if path == "arch/riscv/kernel/trap.S" or path == "kernel/irq/irq.c":
        return "A19"
    if path == "kernel/sched/time.c":
        return "A18"
    if path == "init/main.c":
        if project == "P1":
            return "A4"
        if line in {45, 89}:
            return "A20"
        if line == 51:
            return "A4"
        if line in {60, 69}:
            return "A7"
        if line in {80, 83, 129}:
            return "A8"
        if line == 124:
            return "A19"
    if path == "kernel/locking/lock.c":
        if line <= 31:
            return "A11"
        return "A12" if line <= 42 else "A13"
    if path == "kernel/sched/sched.c":
        return "A18" if line in {26, 41} else "A9"
    if path == "arch/riscv/kernel/entry.S":
        if line in {55, 58}:
            return "A10"
        if line == 6:
            return "A15"
        if line in {18, 72, 75, 80}:
            return "A16"
        if line in {23, 66}:
            return "A17"
    raise AssertionError(f"Unclassified TODO: {project}:{path}:{line}")


def todo_block(lines, start):
    result = [lines[start - 1]]
    if "//" not in result[0] and "*/" not in result[0]:
        for line in lines[start:]:
            result.append(line)
            if "*/" in line:
                break
    return "\n".join(result)


def catalog(sources):
    records = []
    for key, text in sources.items():
        project, path = key.split(":", 1)
        if not (path.endswith((".c", ".h", ".S", ".lds")) or path == "README.md"):
            continue
        lines = text.splitlines()
        for number, line in enumerate(lines, 1):
            if "TODO" not in line:
                continue
            group = appendix_for(project, path, number)
            if group == "OUT":
                status = ("后续prj3退格扩展；完成版仍保留，当前A-Core范围外"
                          if path == "drivers/screen.c" else
                          "prj0汇编预实验；不属于当前prj1/prj2 A-Core主体")
            elif group == "DOC":
                status = "项目说明文档任务；应说明该版本的构建、设计与验证"
            elif project == "F2":
                status = "原框架待填；当前P2实现已补齐，按附录理解"
            elif path == "tools/createimage.c" and number == 230:
                status = "P1旧注释块；实际write_img_info见同文件267行起"
            else:
                status = "已实现但保留TODO标记；不能按标记判断为空"
            records.append({"source": key, "line": number,
                            "marker": line.strip(), "original_block": todo_block(lines, number),
                            "stage_tags": re.findall(r"\[([^\]]+)\]", todo_block(lines, number)),
                            "appendix": group, "status": status})
    return records
