FROM node:25-trixie-slim

ENV CI=true

RUN npm install -g pnpm

WORKDIR /app

COPY pnpm-lock.yaml  pnpm-workspace.yaml ./
COPY backend/app/package.json  backend/app/package.json


RUN pnpm install

COPY backend/app backend/app

WORKDIR /app/backend/app

# Generate Client (With Dummy var to bypass validation)
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" pnpm exec prisma generate
RUN pnpm prune --prod

CMD ["sh", "-c", "pnpm start"]