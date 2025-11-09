# syntax=docker/dockerfile:1

###############################
# Stage 1: Build the frontend #
###############################
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies using package-lock if present
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy the rest of the project and build
COPY . .

# Vite builds to the build/ directory (see vite.config.ts)
ENV NODE_ENV=production
RUN npm run build

####################################
# Stage 2: Serve static files w/NGINX
####################################
FROM nginx:alpine AS runner

# Copy build output from the builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Use custom nginx configuration (handles SPA routing and .mjs MIME type)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
