FROM node:25-trixie-slim

RUN apt update && apt install -y ffmpeg 

ENV CI=true

RUN npm install -g pnpm

WORKDIR /app

COPY pnpm-lock.yaml  pnpm-workspace.yaml ./
COPY backend/videoTranscoder/package.json  backend/videoTranscoder/package.json

RUN pnpm install --production

COPY backend/videoTranscoder backend/videoTranscoder

WORKDIR /app/backend/videoTranscoder

CMD ["sh", "-c", "pnpm start"]