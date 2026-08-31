FROM oven/bun:latest
RUN apt-get update && apt-get install -y python3 make g++ lcov curl xz-utils
RUN curl -fsSL https://qlty.sh -o /tmp/qlty.sh && bash /tmp/qlty.sh && ln -s /root/.qlty/bin/qlty /usr/local/bin/qlty