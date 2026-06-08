FROM node:20-alpine

ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
ARG NEXT_PUBLIC_ENABLE_MOCK_FALLBACK=false
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_ENABLE_MOCK_FALLBACK=$NEXT_PUBLIC_ENABLE_MOCK_FALLBACK

WORKDIR /app

COPY package.json ./package.json
COPY package-lock.json ./package-lock.json
COPY integration/contracts ./integration/contracts
COPY frontend/web ./frontend/web

RUN npm ci

WORKDIR /app/frontend/web
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
