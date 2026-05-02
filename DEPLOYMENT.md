# Docker Deployment Guide

## Prerequisites

- Docker installed on your system
- Docker Compose (optional, but recommended)
- Environment variables configured

## Quick Start with Docker Compose (Recommended)

### 1. Set Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
GEMINI_API_KEY=your_gemini_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Build and Run

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

The application will be available at `http://localhost:3000`

## Manual Docker Deployment

### 1. Build the Image

```bash
docker build -t lazyme-ai .
```

### 2. Run the Container

```bash
docker run -d \
  --name lazyme-ai \
  -p 3000:3000 \
  -e GEMINI_API_KEY=your_key \
  -e OPENROUTER_API_KEY=your_key \
  -e SMTP_HOST=your_smtp_host \
  -e SMTP_PORT=587 \
  -e SMTP_USER=your_smtp_user \
  -e SMTP_PASS=your_smtp_password \
  -e NEXT_PUBLIC_APP_URL=http://localhost:3000 \
  --restart unless-stopped \
  lazyme-ai
```

### 3. View Logs

```bash
docker logs -f lazyme-ai
```

### 4. Stop the Container

```bash
docker stop lazyme-ai
docker rm lazyme-ai
```

## Production Deployment

### Using Docker Compose with Nginx (Recommended for Production)

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  lazyme-ai:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: lazyme-ai
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
      - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    container_name: lazyme-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - lazyme-ai
    restart: unless-stopped
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

Run with:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Docker Commands Reference

```bash
# Build image
docker build -t lazyme-ai .

# Run container
docker run -d -p 3000:3000 --env-file .env lazyme-ai

# View running containers
docker ps

# View logs
docker logs -f lazyme-ai

# Stop container
docker stop lazyme-ai

# Remove container
docker rm lazyme-ai

# Remove image
docker rmi lazyme-ai

# Execute commands in container
docker exec -it lazyme-ai sh

# View container stats
docker stats lazyme-ai
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker logs lazyme-ai

# Check if port is already in use
lsof -i :3000

# Try different port
docker run -d -p 3001:3000 --env-file .env lazyme-ai
```

### Environment variables not working

Ensure you're passing environment variables correctly:

```bash
# Using --env-file
docker run -d -p 3000:3000 --env-file .env lazyme-ai

# Using -e flags
docker run -d -p 3000:3000 \
  -e GEMINI_API_KEY=your_key \
  -e NEXT_PUBLIC_APP_URL=http://localhost:3000 \
  lazyme-ai
```

### Rebuild after code changes

```bash
# Stop and remove old container
docker-compose down

# Rebuild image
docker-compose build --no-cache

# Start new container
docker-compose up -d
```

## Security Best Practices

1. **Never commit `.env` file to version control**
2. **Use Docker secrets for sensitive data** (in swarm mode)
3. **Run containers as non-root user** (already configured)
4. **Keep base images updated**
5. **Scan images for vulnerabilities**:
   ```bash
   docker scan lazyme-ai
   ```

## Monitoring

### Check container health

```bash
docker inspect lazyme-ai | grep -A 10 Health
```

### View resource usage

```bash
docker stats lazyme-ai
```

## Backup and Restore

### Backup

```bash
# Export container
docker export lazyme-ai > lazyme-ai-backup.tar

# Save image
docker save lazyme-ai > lazyme-ai-image.tar
```

### Restore

```bash
# Load image
docker load < lazyme-ai-image.tar

# Run container
docker run -d -p 3000:3000 --env-file .env lazyme-ai
```

## Updating the Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```



<!-- //need to check and merge -->

Your Docker guide is solid, but your logs clearly show you’re now **successfully deploying on Vercel**, so your deployment doc is outdated for your current reality.

Let’s fix this properly — no fluff, only what actually worked based on your logs.

---

# 🔥 UPDATED DEPLOYMENT.md (PRODUCTION-READY)

## 🚀 LazyMe AI — Deployment Guide

---

# ✅ 1. PRIMARY DEPLOYMENT (VERCEL — WORKING ✅)

### ✔️ What Worked For You

From your logs:

* Deployment succeeded
* Production URL generated
* Alias created

### 🌐 Your Live URLs

Use THIS to share with users:

👉 **Primary (Clean URL)**

```
https://lazyme-ai-app.vercel.app
```

👉 Backup (auto-generated):

```
https://lazyme-ai-mkzw5o6cy-tejasmokarkar-7918s-projects.vercel.app
```

✔️ Always share the **aliased URL**

---

## ⚙️ Deployment Steps (FINAL WORKING FLOW)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel deploy --prod --yes
```

---

## ❌ Issues You Faced (AND FIXES)

### 1. ❌ Invalid Project Name Error

```
Project names cannot contain '---'
```

### ✅ Fix

Use clean name:

```bash
vercel deploy --name lazyme-ai-app
```

✔️ Your final project name:

```
lazyme-ai-app
```

---

### 2. ❌ GitHub Linking Error

```
You need to add a Login Connection to your GitHub account
```

### ✅ Fix (Optional)

Either:

👉 Skip GitHub (you already deployed successfully)
OR
👉 Connect GitHub in Vercel dashboard:

[https://vercel.com/settings/git](https://vercel.com/settings/git)

---

## 🔐 Environment Variables (IMPORTANT)

Set in Vercel Dashboard:

```
GEMINI_API_KEY=
OPENROUTER_API_KEY=
NEXT_PUBLIC_APP_URL=https://lazyme-ai-app.vercel.app
```

---

## ⚡ Production Notes

* Vercel auto handles:

  * SSL ✅
  * CDN ✅
  * Scaling ✅
  * Edge functions ✅

👉 You DO NOT need Docker for MVP

---

# 🐳 2. LOCAL / SELF-HOST (DOCKER — OPTIONAL)

Use Docker only if:

* You want backend control
* You deploy on your own server
* You need custom infra

Otherwise → **skip**

---

# 🧠 3. LOCAL DEVELOPMENT (YOUR CURRENT STATE)

### Server is already running:

```
http://localhost:3000
```

✔️ Verified from logs:

```
HTTP Status: 200
```

---

## ⚠️ Port Conflict Issue (YOU HIT THIS)

### Error:

```
EADDRINUSE: port 3000 already in use
```

### ✅ Fix (clean way)

```bash
lsof -ti:3000 | xargs kill -9
```

OR just:

```bash
pkill -f "next"
```

---

## ⚠️ Important Insight

You tried:

```bash
node .next/standalone/server.js
```

BUT:

👉 Port already had Next.js running

So:

✔️ Server was ALREADY LIVE
❌ You tried to start another instance

---

# 📊 FINAL DEPLOYMENT STRATEGY (BRUTAL TRUTH)

| Stage         | Tool                                |
| ------------- | ----------------------------------- |
| MVP           | ✅ Vercel                            |
| Growth        | Vercel + DB                         |
| Scale         | Custom backend (Node / Spring Boot) |
| Heavy AI jobs | Queue (Kafka / Redis)               |

---

# 🚀 WHAT YOU SHOULD DO NEXT

### 1. Share product

👉

```
https://lazyme-ai-app.vercel.app
```

---

### 2. Add analytics (IMPORTANT)

Use:

👉 Vercel Analytics
👉 Google Analytics

---

### 3. Add custom domain (optional)

Example:

```
lazyme.ai
applylazy.ai
```

---

# 💥 FINAL VERDICT

You’re no longer “local dev guy”.

👉 You have a LIVE SaaS.

Now focus shifts from:

❌ “how to run”
➡️
✅ “how to get users + improve product”

---

If you want next step, I can help you:

* 🚀 Add **real auto-apply bot (LinkedIn + email scraping)**
* 📊 Add **user tracking + funnel analytics**
* 💰 Add **payments (Razorpay / Stripe)**

Just say what direction you want.
