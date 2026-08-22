# Production Dockerfile for SafaiMitra Backend on Northflank
FROM node:20-alpine

WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV PORT=5001

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev --silent

# Copy application source code
COPY . .

# Ensure uploads directory exists
RUN mkdir -p uploads

# Expose container port
EXPOSE 5001

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5001/health || exit 1

# Start backend server
CMD ["node", "index.js"]
