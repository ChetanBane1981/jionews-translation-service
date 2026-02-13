# 🚀 How to Run JioNews Sentinel

Complete setup guide for running the project on any system from scratch.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Install MongoDB & Redis](#install-mongodb--redis)
3. [Install Project Dependencies](#install-project-dependencies)
4. [Configure Environment](#configure-environment)
5. [Run the Application](#run-the-application)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Node.js**: v18+ and npm
- **Docker** (recommended) OR native installations

Check your versions:
```bash
node --version  # Should be v18+
npm --version
docker --version  # Optional, if using Docker
```

---

## Install MongoDB & Redis

Choose **Option A** (Docker - Recommended) OR **Option B** (Native Installation).

### Option A: Using Docker (Recommended)

#### 1. Install Docker

**Ubuntu/Debian:**
```bash
# Install Docker
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group (optional, to run without sudo)
sudo usermod -aG docker $USER
newgrp docker
```

**Windows/Mac:**
- Download and install Docker Desktop from https://www.docker.com/products/docker-desktop

#### 2. Start MongoDB Container

```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:latest
```

Verify MongoDB is running:
```bash
docker ps | grep mongodb
```

#### 3. Start Redis Container

```bash
docker run -d \
  --name redis \
  -p 6379:6379 \
  -v redis_data:/data \
  redis:latest
```

Verify Redis is running:
```bash
docker ps | grep redis
```

#### 4. Test Connections

```bash
# Test Redis
docker exec -it redis redis-cli ping
# Should output: PONG

# Test MongoDB
docker exec -it mongodb mongosh --eval "db.version()"
# Should output MongoDB version
```

---

### Option B: Native Installation

#### Install MongoDB (Ubuntu/Debian)

```bash
# Import MongoDB public key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add MongoDB repository
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify
sudo systemctl status mongod
```

#### Install Redis (Ubuntu/Debian)

```bash
# Install Redis
sudo apt update
sudo apt install -y redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify
sudo systemctl status redis-server

# Test
redis-cli ping
# Should output: PONG
```

---

## Install Project Dependencies

### 1. Clone or Navigate to Project

```bash
cd /path/to/jionews-translation-service
```

### 2. Install Backend Dependencies

```bash
npm install
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

---

## Configure Environment

### 1. Create `.env` File

Copy the example and edit:
```bash
cp .env.example .env
```

### 2. Edit `.env` File

Open `.env` in your editor and update:

```env
# API Keys (REQUIRED - Get from respective platforms)
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
SARVAM_API_KEY=your-actual-sarvam-key-here

# Database (Use these defaults if following this guide)
MONGODB_URI=mongodb://localhost:27017/jionews-sentinel
REDIS_URL=redis://localhost:6379

# System Configuration
NODE_ENV=development
PORT=3000
AGENT_MODE=autonomous

# Human Oversight Thresholds
CREDIBILITY_THRESHOLD=70
FAKE_RISK_THRESHOLD=medium
AUTO_PUBLISH_THRESHOLD=80

# Agent Configuration
FEED_POLL_INTERVAL=60000
MAX_CONCURRENT_AGENTS=10
AGENT_TIMEOUT=30000

# Monitoring
LOG_LEVEL=info
ENABLE_MONITORING=true
ALERT_EMAIL=supervisor@jionews.com
```

**Get API Keys:**
- **Anthropic API Key**: https://console.anthropic.com/
- **Sarvam API Key**: https://www.sarvam.ai/

---

## Run the Application

You need **TWO terminal windows**.

### Terminal 1: Start Backend API

```bash
npm run api:dev
```

**Expected output:**
```
Starting API server...
[info]: [Database] Connecting to MongoDB...
[info]: [Database] ✓ Connected to MongoDB
[info]: [QueueManager] Initialized 9 queues
[info]: Server started successfully
[info]: [API] Server running on port 3000
[info]: [API] Health check: http://localhost:3000/health
```

Backend is now running on: **http://localhost:3000**

---

### Terminal 2: Start Frontend

```bash
cd frontend
npm run dev
```

**Expected output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

Frontend is now running on: **http://localhost:5173**

---

## Verification

### 1. Check Backend Health

```bash
curl http://localhost:3000/health
```

Should return JSON with `"status":"healthy"`.

### 2. Check Frontend

Open browser: http://localhost:5173

You should see the JioNews Sentinel dashboard.

### 3. Verify Database Connections

```bash
# Check MongoDB
docker exec -it mongodb mongosh --eval "show dbs"
# OR (if native)
mongosh --eval "show dbs"

# Check Redis
docker exec -it redis redis-cli ping
# OR (if native)
redis-cli ping
```

---

## Troubleshooting

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9

# OR change port in .env
PORT=3001
```

### MongoDB Connection Failed

**Error:** `MongoServerError: connect ECONNREFUSED`

**Solution:**
```bash
# Check if MongoDB is running
docker ps | grep mongodb
# OR
sudo systemctl status mongod

# Restart MongoDB
docker restart mongodb
# OR
sudo systemctl restart mongod
```

### Redis Connection Failed

**Error:** `Error: Redis connection to localhost:6379 failed`

**Solution:**
```bash
# Check if Redis is running
docker ps | grep redis
# OR
sudo systemctl status redis-server

# Restart Redis
docker restart redis
# OR
sudo systemctl restart redis-server
```

### Missing Dependencies

```bash
# Reinstall backend dependencies
rm -rf node_modules package-lock.json
npm install

# Reinstall frontend dependencies
cd frontend
rm -rf node_modules package-lock.json
npm install
cd ..
```

---

## Quick Commands Cheat Sheet

### Start/Stop MongoDB & Redis (Docker)

```bash
# Start
docker start mongodb redis

# Stop
docker stop mongodb redis

# Check status
docker ps | grep -E "mongo|redis"

# View logs
docker logs mongodb
docker logs redis
```

### Start/Stop MongoDB & Redis (Native)

```bash
# Start
sudo systemctl start mongod redis-server

# Stop
sudo systemctl stop mongod redis-server

# Check status
sudo systemctl status mongod redis-server
```

### Run Application

```bash
# Backend (Terminal 1)
npm run api:dev

# Frontend (Terminal 2)
cd frontend && npm run dev
```

### Stop Application

Press `Ctrl+C` in both terminal windows.

---

## Summary

**Complete Setup from Scratch:**

```bash
# 1. Install Docker (if using Docker option)
sudo apt install -y docker.io docker-compose

# 2. Start MongoDB & Redis
docker run -d --name mongodb -p 27017:27017 mongo:latest
docker run -d --name redis -p 6379:6379 redis:latest

# 3. Install project dependencies
npm install
cd frontend && npm install && cd ..

# 4. Configure .env
cp .env.example .env
# Edit .env and add your API keys

# 5. Run backend (Terminal 1)
npm run api:dev

# 6. Run frontend (Terminal 2)
cd frontend && npm run dev

# 7. Access application
# Frontend: http://localhost:5173
# Backend: http://localhost:3000
# Health: http://localhost:3000/health
```

## Additional Information

### Available NPM Scripts

**Backend (Root Directory):**
```bash
npm run api:dev          # Start API in development mode (hot-reload)
npm run api              # Start API in production mode
npm run dev              # Start orchestrator with all agents
npm run build            # Compile TypeScript to JavaScript
npm run type-check       # Check TypeScript types
npm test                 # Run tests
npm run lint             # Run ESLint
```

**Frontend (frontend/ Directory):**
```bash
npm run dev              # Start Vite dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run type-check       # Check TypeScript types
npm test                 # Run tests
npm run lint             # Run ESLint
```

### Project URLs

- **Frontend Dashboard**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Health Check**: http://localhost:3000/health
- **API Documentation**: http://localhost:3000/api-docs (if enabled)

### Environment Variables Reference

```env
# === API Keys (Required) ===
ANTHROPIC_API_KEY=sk-ant-xxxxx    # Claude API key
SARVAM_API_KEY=xxxxx              # Sarvam AI translation key

# === Database ===
MONGODB_URI=mongodb://localhost:27017/jionews-sentinel
REDIS_URL=redis://localhost:6379

# === Server Config ===
NODE_ENV=development              # development | production
PORT=3000                         # API server port
AGENT_MODE=autonomous             # autonomous | supervised

# === AI Thresholds ===
CREDIBILITY_THRESHOLD=70          # Auto-approve if credibility > 70
AUTO_PUBLISH_THRESHOLD=80         # Auto-publish if score > 80
FAKE_RISK_THRESHOLD=medium        # low | medium | high

# === Agent Config ===
FEED_POLL_INTERVAL=60000          # Feed polling interval (ms)
MAX_CONCURRENT_AGENTS=10          # Max parallel agents
AGENT_TIMEOUT=30000               # Agent timeout (ms)

# === Monitoring ===
LOG_LEVEL=info                    # debug | info | warn | error
ENABLE_MONITORING=true
ALERT_EMAIL=supervisor@jionews.com
```

---

## For Developers

### Project Architecture

- **10 Autonomous Agents**: Feed, Detection, Cluster, Moderation, Credibility, Summary, Translation, Ranking, Personalization, Publishing
- **Event-Driven Architecture**: Agents communicate via events and message queues
- **Human-in-the-Loop**: Humans supervise and approve only flagged content
- **Production-Grade**: TypeScript, load balancing, CI/CD, monitoring

### Key Files

- `src/api/server.js` - REST API server
- `src/orchestrator/index.js` - Agent orchestrator
- `src/agents/` - All 10 agent implementations
- `src/models/` - MongoDB schemas
- `frontend/src/` - React frontend

### Testing Individual Agents

```bash
# Run specific agents standalone
npm run agent:feed           # Feed ingestion
npm run agent:detection      # Breaking news detection (needs API key)
npm run agent:credibility    # Fake news scoring (needs API key)
```

### Development Workflow

1. Make changes to code
2. Server auto-reloads (nodemon/Vite)
3. Test changes in browser
4. Check logs for errors
5. Commit when ready

### Useful Documentation

- `CLAUDE.md` - Development guide for working with Claude Code
- `TESTING_GUIDE.md` - Complete testing instructions
- `00_PROJECT_CONSTITUTION_V2.md` - Project requirements and principles

---

## Support & Resources

- **Documentation**: Check other `.md` files in the project root
- **Issues**: Report bugs or request features on GitHub
- **API Documentation**: Available at `/api-docs` when server is running
- **Team Communication**: Use project communication channels

---

**Last Updated:** 2026-02-13
**Version:** 1.0
**Maintained By:** JioNews Development Team

---

**🎉 You're all set! Start building with JioNews Sentinel!**
