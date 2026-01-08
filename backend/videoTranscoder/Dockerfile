FROM node:trixie-slim

RUN apt-get update && apt-get install -y ffmpeg 

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

CMD [ "npm","start" ]
