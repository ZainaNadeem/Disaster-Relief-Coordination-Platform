FROM node:20-alpine

WORKDIR /app

# Install workspace dependencies using the root manifests
COPY package.json package-lock.json* ./
COPY client/package.json ./client/package.json

RUN npm install --workspace client

COPY client ./client

WORKDIR /app/client

EXPOSE 3000

CMD ["npm", "run", "dev"]
