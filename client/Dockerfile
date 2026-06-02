FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

# NEXT_PUBLIC_ vars are inlined at build time, so set the API URL before building.
ENV NEXT_PUBLIC_API_URL=http://localhost:4000
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
