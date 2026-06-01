FROM node:20-alpine

WORKDIR /app

# Install workspace dependencies using the root manifests.
COPY package.json package-lock.json* ./
COPY server/package.json ./server/package.json
# Copy the Prisma schema first so the `postinstall` hook can generate the client.
COPY server/prisma ./server/prisma

RUN npm install --workspace server

COPY server ./server

WORKDIR /app/server

EXPOSE 4000

# Apply any pending migrations, then start the dev server.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev"]
