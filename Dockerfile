# Multi-stage build for Adobe Hackathon Finale
FROM python:3.10-slim as backend

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy backend requirements and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Create necessary directories
RUN mkdir -p uploads processed

# Frontend build stage
FROM node:18-alpine as frontend

WORKDIR /app

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source code
COPY frontend/ .

# Build the frontend
RUN npm run build

# Final stage
FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Python dependencies from backend stage
COPY --from=backend /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages
COPY --from=backend /usr/local/bin /usr/local/bin

# Copy backend code
COPY --from=backend /app .

# Prepare frontend runtime folder and copy artifacts
RUN mkdir -p /app/frontend
COPY --from=frontend /app/.next /app/frontend/.next
COPY --from=frontend /app/node_modules /app/frontend/node_modules
COPY --from=frontend /app/package.json /app/frontend/package.json

# Create necessary directories
RUN mkdir -p uploads processed

# Install Node.js for serving frontend
RUN apt-get update && apt-get install -y nodejs npm

# Expose port
EXPOSE 8080

# Create startup script
RUN echo '#!/bin/bash\n\
# Start backend\n\
python main.py &\n\
# Start frontend on 8080 using Next.js\n\
cd /app/frontend && npx next start -p 8080 &\n\
# Wait for both processes\n\
wait' > /app/start.sh && chmod +x /app/start.sh

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the application
CMD ["/app/start.sh"]
