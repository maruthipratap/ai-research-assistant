FROM node:22-slim

WORKDIR /app

# Copy package files first and install before copying the rest of the code -
# Docker caches this layer, so re-builds are fast as long as dependencies
# haven't changed (this is THE standard Docker optimization pattern worth
# being able to explain in an interview).
COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]