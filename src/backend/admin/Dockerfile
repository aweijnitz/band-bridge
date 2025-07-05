# ---- app builder ----
FROM node:20-bullseye AS app-builder

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ---- final image ----
FROM node:20-bullseye

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=app-builder /app/dist ./dist
COPY --from=app-builder /app/src ./src
COPY --from=app-builder /app/generated ./generated
COPY --from=app-builder /app/prisma ./prisma

EXPOSE 4002

CMD ["node", "dist/src/index.js"] 