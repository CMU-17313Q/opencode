FROM mcr.microsoft.com/devcontainers/base:ubuntu

USER root

RUN apt-get update \
    && apt-get install -y \
        curl \
        unzip \
        git \
        python3 \
        python3-pip \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

USER vscode

RUN curl -fsSL https://bun.sh/install | bash

ENV PATH="/home/vscode/.bun/bin:${PATH}"