FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json ./
ENV DATABASE_URL=postgresql://postgres:postgres@db:5432/eduplay?schema=public
RUN npm run prisma:generate

COPY src ./src
COPY scripts ./scripts

RUN npm run build

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["entrypoint.sh"]
