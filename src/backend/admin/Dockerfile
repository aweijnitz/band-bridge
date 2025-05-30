# ---- app builder ----
FROM node:20-bullseye AS app-builder

WORKDIR /app
#COPY prisma ./src/generated/prisma
COPY package*.json ./
RUN npm install

COPY . .

#RUN npx tsc --project tsconfig.json
RUN npm run build

# ---- final image ----
FROM node:20-bullseye

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=app-builder /app/dist ./dist
COPY --from=app-builder /app/src ./src
COPY --from=app-builder /app/.env .env
COPY --from=app-builder /app/generated ./generated

EXPOSE 4002

CMD ["node", "dist/index.js"] 