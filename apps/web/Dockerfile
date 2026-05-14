FROM node:20-alpine

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

COPY package.json ./package.json
COPY package-lock.json ./package-lock.json
COPY packages/contracts ./packages/contracts
COPY apps/web ./apps/web

RUN npm ci

WORKDIR /app/apps/web
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
