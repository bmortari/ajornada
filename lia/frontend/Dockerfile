FROM node:20-alpine AS base

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Development stage
FROM base AS dev
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]

# Build stage
FROM base AS builder
ARG NEXT_PUBLIC_API_URL=https://lia.ajornada.top
ARG API_PROXY_URL=http://lia:8000
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV API_PROXY_URL=$API_PROXY_URL
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
