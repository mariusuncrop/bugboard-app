# Builds the API and the frontend, then serves both from a single Node process.
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY web/package.json ./web/
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY web/package.json ./web/
RUN npm ci --omit=dev

COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/openapi.yaml ./server/openapi.yaml
COPY --from=build /app/web/dist ./web/dist

EXPOSE 4000
CMD ["node", "server/dist/index.js"]
