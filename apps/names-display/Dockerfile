FROM node:24-alpine

RUN corepack enable

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY sdk ./sdk
COPY apps ./apps

RUN pnpm install --frozen-lockfile

RUN pnpm names-display build

WORKDIR /workspace/apps/names-display

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["pnpm", "start"]
