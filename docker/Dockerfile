FROM node:22.3-bookworm-slim as builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /ts-drp
COPY . .

RUN pnpm i
RUN chmod +x /ts-drp/docker/entrypoint.sh

ENTRYPOINT ["/bin/bash", "/ts-drp/docker/entrypoint.sh"]
