FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install

# Development image (hot-reload)
# FROM node:20-alpine
# WORKDIR /app
# COPY package.json ./
# RUN npm install
# COPY . .
# CMD ["npm", "run", "dev"]

# Production multi-stage build
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:stable-alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
