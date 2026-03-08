FROM node:20-alpine AS base

# Configura o pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app

# Copia arquivos de configuração do root
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copia os package.json de cada app para instalar dependências com cache
COPY apps/webapp/package.json ./apps/webapp/
#COPY apps/e2e/package.json ./apps/e2e/

# Instala as dependências usando o store virtual do pnpm
RUN pnpm install --frozen-lockfile

# Copia o restante dos arquivos
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app/apps/webapp

EXPOSE 3000

CMD ["pnpm", "run", "dev"]