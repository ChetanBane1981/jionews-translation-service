# 🤖 Claude Code Guide - JioNews Sentinel

**For Team Members Using Claude Code**

This guide helps you work effectively with Claude Code on the JioNews Sentinel project.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Codebase Navigation](#codebase-navigation)
3. [Development Workflow](#development-workflow)
4. [Key Conventions](#key-conventions)
5. [Common Tasks](#common-tasks)
6. [Architecture Patterns](#architecture-patterns)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

**JioNews Sentinel** is a fully autonomous AI newsroom with 10 specialized agents that handle the entire news pipeline from ingestion to publication, requiring human oversight only for high-risk content approval.

### **Key Architecture Principles**

- **Agent-Based**: 10 autonomous agents, each with specific responsibilities
- **Event-Driven**: Agents communicate via events and message queues
- **Human-in-the-Loop**: Humans supervise and approve only flagged content
- **Production-Grade**: TypeScript, load balancing, CI/CD, monitoring

### **Technology Stack**

- **Backend**: Node.js + TypeScript + Express
- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Database**: MongoDB (Replica Set for HA)
- **Cache**: Redis (Master-Replica for HA)
- **Queue**: Bull (Redis-based job queue)
- **Load Balancer**: NGINX
- **AI**: Anthropic Claude (via @anthropic-ai/sdk)
- **Translation**: Sarvam AI (Indian languages)
- **Deployment**: Docker + Docker Compose + GitHub Actions

---

## 🗺️ Codebase Navigation

### **Directory Structure**

```
jionews-translation-service/
├── src/
│   ├── agents/              # 10 autonomous agents
│   │   ├── BaseAgent.js     # Base class for all agents
│   │   ├── feed-agent.js    # News ingestion
│   │   ├── detection-agent.js   # Breaking news detection
│   │   ├── cluster-agent.js     # Deduplication
│   │   ├── moderation-agent.js  # Spam filtering
│   │   ├── credibility-agent.js # Fake news scoring
│   │   ├── summary-agent.js     # Article summarization
│   │   ├── translation-agent.js # Multi-language translation
│   │   ├── ranking-agent.js     # Trending detection
│   │   ├── personalization-agent.js # User feed ranking
│   │   └── publishing-agent.js  # Auto-publish or flag
│   ├── orchestrator/        # Agent coordination
│   │   └── index.js
│   ├── api/                 # REST API
│   │   └── server.js
│   ├── models/              # Database schemas
│   ├── config/              # Configuration
│   └── utils/               # Utilities
├── frontend/
│   ├── src/
│   │   ├── pages/           # 5 main pages
│   │   ├── components/      # Reusable components
│   │   ├── services/        # API services
│   │   └── types/           # TypeScript types
│   └── public/
├── docs/                    # Architecture documentation
├── .github/workflows/       # CI/CD pipelines
├── docker-compose.yml       # Development infrastructure
├── docker-compose.prod.yml  # Production infrastructure
├── nginx.conf               # Load balancer config
└── 00_PROJECT_CONSTITUTION_V2.md  # Project charter
```

### **Key Files to Know**

| File | Purpose |
|------|---------|
| `00_PROJECT_CONSTITUTION_V2.md` | Project requirements and principles |
| `src/agents/BaseAgent.js` | Agent base class with auto-retry, health monitoring |
| `src/orchestrator/index.js` | Agent registration and event coordination |
| `src/api/server.js` | REST API endpoints |
| `frontend/src/types/index.ts` | All TypeScript type definitions |
| `nginx.conf` | Load balancer configuration |
| `TESTING_GUIDE.md` | Complete testing instructions |
| `TESTING_PLAN.md` | Testing strategy and checklist |

---

## 🔄 Development Workflow

### **1. Starting Work on a Feature**

```bash
# Get latest code
git checkout staging
git pull origin staging

# Create feature branch
git checkout -b feature/your-feature-name

# Install dependencies (if needed)
npm install
cd frontend && npm install && cd ..
```

### **2. Running the System Locally**

```bash
# Start infrastructure (MongoDB + Redis)
npm run docker:up

# Verify services are running
docker ps

# Start backend API (development mode with hot reload)
npm run api:dev

# In another terminal, start frontend
cd frontend
npm run dev

# Access frontend at http://localhost:5173
# Access API at http://localhost:3000
```

### **3. Testing Your Changes**

```bash
# Type check
npm run type-check
cd frontend && npm run type-check && cd ..

# Run tests
npm test
cd frontend && npm test && cd ..

# Test specific agent
npm run agent:feed
npm run agent:detection
npm run agent:credibility
```

### **4. Committing Changes**

```bash
# Add changed files
git add src/agents/your-agent.js

# Commit with descriptive message
git commit -m "feat: add sentiment analysis to credibility agent

- Analyze article sentiment using Claude
- Adjust credibility score based on emotional tone
- Add unit tests for sentiment detection

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push to your branch
git push origin feature/your-feature-name
```

### **5. Creating Pull Request**

```bash
# Use GitHub CLI (recommended)
gh pr create --title "Add sentiment analysis to credibility agent" --body "
## Summary
- Adds sentiment analysis to credibility scoring
- Uses Claude API for emotion detection
- Adjusts score based on neutral vs. sensational tone

## Test Plan
- [ ] Unit tests pass
- [ ] Integration test with real articles
- [ ] Credibility scores accurate

🤖 Generated with [Claude Code](https://claude.com/claude-code)
"
```

---

## 📏 Key Conventions

### **Code Style**

- **TypeScript Strict Mode**: All new code must be TypeScript with strict mode
- **Naming**: camelCase for variables/functions, PascalCase for classes/types
- **Async/Await**: Prefer async/await over promises and callbacks
- **Error Handling**: Always use try-catch with proper error logging
- **Comments**: Only for complex logic; prefer self-documenting code

### **Agent Development**

All agents must:
1. **Extend BaseAgent**: Inherit from `src/agents/BaseAgent.js`
2. **Implement execute()**: Main processing logic
3. **Emit Events**: Use `this.emit()` for agent communication
4. **Track Metrics**: Update `this.metrics` for monitoring
5. **Handle Errors**: Graceful degradation with auto-retry

**Example Agent Structure:**

```javascript
import { BaseAgent } from './BaseAgent.js';

export class YourAgent extends BaseAgent {
  constructor(config) {
    super('your-agent', config);
    this.setupYourAgentSpecifics();
  }

  async execute(task) {
    // 1. Validate input
    if (!task.data) throw new Error('Missing data');

    // 2. Process task
    const result = await this.processData(task.data);

    // 3. Emit events
    this.emit('task:processed', { result });

    // 4. Return result
    return result;
  }

  async processData(data) {
    // Your agent logic here
  }
}
```

### **API Conventions**

- **RESTful Endpoints**: Follow REST principles
- **Status Codes**: Use correct HTTP status codes (200, 201, 400, 404, 500)
- **Error Responses**: Consistent error format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {...}
  }
}
```
- **Pagination**: Use `?page=1&limit=20` for lists
- **Filtering**: Use query params `?category=tech&breaking=true`

### **Frontend Conventions**

- **React Hooks**: Use functional components with hooks
- **TypeScript**: All components must be typed
- **API Calls**: Use `src/services/api.ts` functions
- **State Management**: React hooks (useState, useEffect) - no Redux yet
- **Styling**: TailwindCSS utility classes

---

## 🎯 Common Tasks

### **Adding a New Agent**

```bash
# 1. Create agent file
touch src/agents/your-agent.js

# 2. Implement agent class (extend BaseAgent)
# 3. Register agent in orchestrator
# Edit src/orchestrator/index.js and add:
import { YourAgent } from '../agents/your-agent.js';
orchestrator.registerAgent(new YourAgent(config));

# 4. Add npm script in package.json
"agent:your": "ts-node src/agents/your-agent.ts"

# 5. Test agent
npm run agent:your
```

### **Adding a New API Endpoint**

```javascript
// In src/api/server.js
app.get('/api/your-endpoint', async (req, res) => {
  try {
    const result = await yourFunction(req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});
```

### **Adding a New Frontend Page**

```bash
# 1. Create page component
touch frontend/src/pages/YourPage.tsx

# 2. Add route in App.tsx
import YourPage from './pages/YourPage';
// In Router:
<Route path="/your-page" element={<YourPage />} />

# 3. Add navigation link in Layout.tsx
```

### **Updating Database Schema**

```javascript
// In src/models/your-model.js
import mongoose from 'mongoose';

const yourSchema = new mongoose.Schema({
  field1: { type: String, required: true },
  field2: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export const YourModel = mongoose.model('YourModel', yourSchema);
```

### **Running Tests**

```bash
# All tests
npm test

# Specific test file
npm test -- src/agents/__tests__/feed-agent.test.ts

# Watch mode
npm run test:watch

# Coverage report
npm test -- --coverage
```

---

## 🏗️ Architecture Patterns

### **1. Agent Communication Pattern**

Agents communicate via **events**, not direct function calls:

```javascript
// ❌ DON'T: Direct coupling
const result = await otherAgent.process(data);

// ✅ DO: Event-driven
this.emit('data:ready', { data });
// Other agent listens:
orchestrator.on('data:ready', (payload) => {
  this.processData(payload.data);
});
```

### **2. Queue-Based Processing**

Use Bull queues for async tasks:

```javascript
import Queue from 'bull';

const translationQueue = new Queue('translation', redisConfig);

// Producer (push task)
await translationQueue.add('translate', {
  articleId: '123',
  targetLanguages: ['hi', 'ta', 'te']
});

// Consumer (process task)
translationQueue.process('translate', async (job) => {
  const { articleId, targetLanguages } = job.data;
  return await translateArticle(articleId, targetLanguages);
});
```

### **3. Error Handling Pattern**

```javascript
async function processWithRetry(task, maxRetries = 3) {
  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      return await this.execute(task);
    } catch (error) {
      attempts++;
      if (attempts >= maxRetries) {
        logger.error(`Failed after ${maxRetries} attempts`, error);
        throw error;
      }
      await this.delay(attempts * 1000); // Exponential backoff
    }
  }
}
```

### **4. Configuration Pattern**

```javascript
// Load config from environment
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4-5-20250929',
    maxTokens: 4096
  },
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/jionews',
    options: { useNewUrlParser: true }
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  }
};
```

---

## ✅ Best Practices

### **Working with Claude Code**

1. **Be Specific**: Give clear, detailed instructions
   - ❌ "Fix the agent"
   - ✅ "Fix the credibility agent to handle null scores by defaulting to 50"

2. **Review Changes**: Always review Claude's code changes before committing
   - Use `git diff` to see what changed
   - Verify logic is correct
   - Check for security issues

3. **Iterative Development**: Break large tasks into steps
   - ❌ "Build the entire translation system"
   - ✅ "First, create the translation agent skeleton, then add Sarvam API integration, then add caching"

4. **Test Incrementally**: Test after each change
   - Don't wait until everything is done
   - Run `npm run type-check` frequently
   - Test individual agents with `npm run agent:name`

5. **Document Decisions**: Update CLAUDE.md when you establish new patterns
   - If you solve a tricky problem, document it
   - If you change architecture, update this guide

### **Code Quality**

1. **Type Safety**: Use TypeScript strictly
   ```typescript
   // ❌ DON'T
   const data: any = await fetchData();

   // ✅ DO
   interface NewsData {
     title: string;
     content: string;
   }
   const data: NewsData = await fetchData();
   ```

2. **Error Messages**: Make errors actionable
   ```javascript
   // ❌ DON'T
   throw new Error('Invalid input');

   // ✅ DO
   throw new Error('Translation failed: Missing target language. Provide targetLanguage in request body.');
   ```

3. **Logging**: Use structured logging
   ```javascript
   // ❌ DON'T
   console.log('Processing article');

   // ✅ DO
   logger.info('Processing article', {
     articleId: article.id,
     agent: 'credibility',
     timestamp: new Date().toISOString()
   });
   ```

4. **Async Operations**: Always await or handle promises
   ```javascript
   // ❌ DON'T
   processArticle(article); // Fire and forget

   // ✅ DO
   await processArticle(article);
   // OR
   processArticle(article).catch(error => logger.error(error));
   ```

### **Security**

1. **Never Commit Secrets**: Use `.env` for sensitive data
   - API keys go in `.env` (not committed)
   - Use `.env.example` for templates

2. **Validate Input**: Sanitize all user input
   ```javascript
   // Validate and sanitize
   const articleId = req.params.id;
   if (!mongoose.Types.ObjectId.isValid(articleId)) {
     return res.status(400).json({ error: 'Invalid article ID' });
   }
   ```

3. **Rate Limiting**: Protect API endpoints
   - Already configured in `nginx.conf`
   - Monitor for abuse in logs

4. **CORS**: Only allow trusted origins
   ```javascript
   app.use(cors({
     origin: process.env.FRONTEND_URL || 'http://localhost:5173'
   }));
   ```

---

## 🐛 Troubleshooting

### **Common Issues**

#### **1. MongoDB Connection Failed**

```bash
# Check if MongoDB is running
docker ps | grep mongodb

# If not running, start it
npm run docker:up

# Check MongoDB logs
docker logs jionews-mongodb
```

#### **2. Redis Connection Failed**

```bash
# Check if Redis is running
docker ps | grep redis

# Test Redis connection
redis-cli ping
# Should return: PONG

# Restart if needed
docker restart jionews-redis
```

#### **3. Port Already in Use**

```bash
# Find process using port 3000 (API)
netstat -ano | findstr :3000

# Kill process on Windows
taskkill /PID <process_id> /F

# Or change port in .env
PORT=3001
```

#### **4. TypeScript Errors**

```bash
# Clear TypeScript cache
rm -rf node_modules/.cache

# Reinstall dependencies
npm install

# Check tsconfig.json is correct
npm run type-check
```

#### **5. Frontend Build Fails**

```bash
# Clear Vite cache
rm -rf frontend/node_modules/.vite

# Reinstall frontend dependencies
cd frontend
npm install

# Try building again
npm run build
```

#### **6. Agent Not Processing Tasks**

```bash
# Check orchestrator logs
# Ensure agent is registered in src/orchestrator/index.js

# Check queue connection
# Verify Redis is running

# Test agent individually
npm run agent:your-agent-name
```

### **Debug Mode**

Enable detailed logging:

```bash
# In .env
LOG_LEVEL=debug
NODE_ENV=development

# Restart services
npm run api:dev
```

### **Getting Help**

1. **Check Documentation**:
   - `TESTING_GUIDE.md` - Testing instructions
   - `00_PROJECT_CONSTITUTION_V2.md` - Requirements
   - `docs/` - Architecture documentation

2. **Review Logs**:
   - Backend: Check console output
   - Frontend: Check browser console (F12)
   - Docker: `docker logs <container-name>`

3. **Ask Claude Code**:
   - "Explain how the credibility agent works"
   - "Why is my API endpoint returning 500?"
   - "Show me how to add a new database field"

4. **Team Communication**:
   - Slack: #jionews-development
   - GitHub Issues: For bugs and feature requests
   - Daily Standup: Discuss blockers

---

## 🚀 Quick Reference

### **Essential Commands**

```bash
# Development
npm run api:dev              # Start backend with hot reload
cd frontend && npm run dev   # Start frontend dev server
npm run docker:up            # Start MongoDB + Redis

# Testing
npm run type-check           # TypeScript validation
npm run lint                 # Code linting
npm test                     # Run tests

# Production
npm run build                # Build TypeScript
docker-compose -f docker-compose.prod.yml up  # Start production stack

# Git
git checkout staging         # Switch to staging branch
git pull origin staging      # Get latest code
gh pr create                 # Create pull request
```

### **Important URLs**

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Health: http://localhost:3000/health
- MongoDB: mongodb://localhost:27017
- Redis: redis://localhost:6379

---

## 📞 Support

**Questions?** Ask Claude Code:
- "How do I add a new agent?"
- "Explain the translation agent workflow"
- "Show me how to fix this TypeScript error"

**Issues?**
- GitHub Issues: [repository]/issues
- Team Slack: #jionews-development

---

**Last Updated**: 2026-02-13
**Version**: 1.0
**Maintained By**: JioNews Development Team

---

**🎉 Happy Coding with Claude!**
