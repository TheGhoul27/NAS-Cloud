FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build:all

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/express-server.js ./express-server.js
COPY --from=build /app/dist-drive ./dist-drive
COPY --from=build /app/dist-photos ./dist-photos
COPY --from=build /app/certs ./certs

EXPOSE 3000 3001

CMD ["node", "express-server.js"]
