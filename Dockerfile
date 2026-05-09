# vp入りのイメージを作成
FROM node:24-slim AS base

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates git \
  && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://vite.plus | bash

ENV PATH="/root/.vite-plus/bin:${PATH}"

# 依存関係のインストール
FROM base AS deps

COPY package.json pnpm-lock.yaml ./

RUN vp i --frozen-lockfile

# アプリケーションのビルド
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN vp run build

# 最終イメージの作成
FROM node:24-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN useradd -m botuser

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

USER botuser
CMD ["node", "dist/main.mjs"]
