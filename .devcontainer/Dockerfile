FROM oven/bun:1.3.14

USER root

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       python3 \
       make \
       g++ \
       git \
    && rm -rf /var/lib/apt/lists/*