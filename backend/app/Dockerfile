FROM node:trixie-slim

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["sh", "-c", "npx prisma generate && npx prisma db push && npm start"]
