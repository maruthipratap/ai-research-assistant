# Stage 1: build the React app into static files
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Vite inlines environment variables into the built JS bundle AT BUILD TIME,
# not at container runtime - so this has to be a build ARG, not a regular
# docker-compose "environment:" entry (those only apply at runtime, which
# would be too late for Vite).
ARG VITE_API_URL=http://localhost:5000/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Stage 2: serve the built static files with nginx instead of Node -
# nginx is lighter, faster, and is what you'd actually use in production
# to serve a compiled React app (you don't need a JS runtime just to hand
# out static HTML/JS/CSS files).
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80