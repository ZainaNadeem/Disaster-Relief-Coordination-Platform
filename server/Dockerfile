FROM node:20-alpine

WORKDIR /app

# Install dependencies. Copy the Prisma schema first so the `postinstall` hook
# (prisma generate) can find it during install.
COPY package.json ./
COPY prisma ./prisma
RUN npm install

# Copy the rest of the source and compile TypeScript to dist/.
COPY . .
RUN npm run build

EXPOSE 4000

# Apply any pending migrations, then start the compiled Express app.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
