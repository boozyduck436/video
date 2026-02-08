FROM node:trixie-slim

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Generate Client (With Dummy var to bypass validation)
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate
RUN npm prune --production

CMD ["sh", "-c", "npm start"]
