# docker build for restmail.net repo. 

FROM node:20.11.1-bullseye-slim AS restmail-base
RUN set -x \
    && addgroup --gid 10001 app \
    && adduser --disabled-password \
    --gecos '' \
    --gid 10001 \
    --home /build \
    --uid 10001 \
    app

# Utilities for Restmail build
FROM restmail-base as restmail-build-utils
RUN apt-get update && apt-get install -y \
    git-core \
    python3-setuptools \
    python3-dev \
    build-essential \
    zip \
    jq \
    curl \
    netcat \
    && rm -rf /var/lib/apt/lists/*

# Utilities for fxa services
FROM restmail-base as restmail-utils
RUN apt-get update && apt-get install -y \
    openssl \
    jq \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Build mono repo
FROM restmail-build-utils as restmail-build
COPY --chown=app:app . /app
USER app
WORKDIR /app
RUN file="$(ls -1 .)" && echo $file
RUN echo $(ls -1 .)

RUN npm install


