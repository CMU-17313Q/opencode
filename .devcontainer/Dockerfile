FROM oven/bun:debian

# Config Bun
ENV PATH="~/.bun/bin:${PATH}"
RUN ln -s /usr/local/bin/bun /usr/local/bin/node

# Update packages
RUN if [ "debian" == "alpine" ] ; then apk update ; else apt-get update ; fi

# Install Git
RUN if [ "debian" == "alpine" ] ; then apk add git ; else apt-get install -y git ; fi

# Install curl
RUN if [ "debian" == "alpine" ] ; then apk add curl; else apt-get install -y curl ; fi
RUN if [ "debian" == "alpine" ] ; then apk add xz-utils; else apt-get install -y xz-utils ; fi

RUN curl https://qlty.sh | bash
