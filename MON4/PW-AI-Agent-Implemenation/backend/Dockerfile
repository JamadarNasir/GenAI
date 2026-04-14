# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install all deps (including devDependencies for tsc)
COPY package*.json ./
RUN npm install --ignore-scripts

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ---- Production stage ----
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --production --ignore-scripts

COPY --from=builder /app/dist ./dist

# Copy AI prompts directory (needed at runtime)
COPY ../ai/ /app/ai/

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/index.js"]
