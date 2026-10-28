FROM buildpack-deps:trixie-curl

RUN sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates git sudo bash less procps python3 build-essential \
       gcc-riscv64-linux-gnu binutils-riscv64-linux-gnu \
       gdb-multiarch qemu-system-misc opensbi nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /bin/bash --uid 1000 vscode \
    && printf 'vscode ALL=(root) NOPASSWD:ALL\n' > /etc/sudoers.d/vscode \
    && chmod 0440 /etc/sudoers.d/vscode

USER vscode
ENV SHELL=/bin/bash
