# ---- app builder ----
FROM node:20-bullseye AS app-builder

WORKDIR /app/src/backend/admin
COPY src/backend/admin/package*.json ./
RUN npm install

COPY src/backend/admin ./
COPY src/generated/prisma ./generated/prisma
RUN rm -f generated/prisma/index.ts
RUN npm run build

# ---- final image ----
FROM node:20-bullseye

WORKDIR /app

COPY src/backend/admin/package*.json ./
RUN npm install --omit=dev

COPY --from=app-builder /app/src/backend/admin/dist ./dist
COPY --from=app-builder /app/src/backend/admin/src ./src
COPY --from=app-builder /app/src/backend/admin/generated ./generated
COPY --from=app-builder /app/src/backend/admin/prisma ./prisma

EXPOSE 4002

CMD ["node", "dist/src/index.js"]
