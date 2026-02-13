# JioNews Sentinel - Autonomous AI Newsroom

> **Fully autonomous AI newsroom with agent-based architecture. Humans supervise only critical approvals.**

---

## 🎯 Mission

Build a fully autonomous AI newsroom with automated SDLC where:
- AI executes **majority of newsroom operations**
- Humans supervise **only high-risk or sensitive cases**
- Continuous **self-improvement via agentic SDLC loop**
- Production-grade **reliability, multi-user personalization, and multilingual support**

---

## 🏗️ Architecture

### Autonomous Agent Pipeline

```
Feed Ingestion → Breaking Detection → Clustering → Moderation
    ↓                                                  ↓
Publishing ← Personalization ← Translation ← Credibility
    ↓
Human Approval (Only if needed)
```

### Core Agents

| Agent | Purpose | Owner | Status |
|-------|---------|-------|--------|
| **Feed Agent** | Continuous news ingestion | Backend 1 | ✅ |
| **Detection Agent** | Breaking news detection (Claude) | AI Owner | ✅ |
| **Cluster Agent** | Deduplication & clustering | Backend 2 | ✅ |
| **Moderation Agent** | Auto-filtration & spam detection | Backend 2 | ✅ |
| **Credibility Agent** | Fake news & trust scoring | Backend 3 | ✅ |
| **Summary Agent** | Article generation (Claude) | Backend 3 | ✅ |
| **Translation Agent** | Multi-language (Sarvam AI) | Backend 3 | 🔄 |
| **Personalization Agent** | User-specific ranking | Backend 4 | ✅ |
| **Publishing Agent** | Auto-publish or flag for approval | Publishing | ✅ |
| **Orchestrator** | Central coordinator (Claude Brain) | AI Owner | ✅ |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB
- Redis
- Anthropic API Key (Claude)
- Sarvam AI API Key (optional for translation)

### Installation

```bash
# Clone repository
git clone https://github.com/ChetanBane1981/jionews-translation-service.git
cd jionews-translation-service

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your API keys

# Start MongoDB and Redis
# (Use Docker or local installation)

# Run orchestrator
npm start

# Or run in development mode
npm run dev
```

---

## 📁 Project Structure

```
jionews-translation-service/
├── src/
│   ├── agents/              # Autonomous agents
│   │   ├── BaseAgent.js     # Base class for all agents
│   │   ├── feed-agent.js    # Feed ingestion
│   │   ├── detection-agent.js
│   │   ├── cluster-agent.js
│   │   ├── moderation-agent.js
│   │   ├── credibility-agent.js
│   │   ├── summary-agent.js
│   │   ├── personalization-agent.js
│   │   └── publishing-agent.js
│   ├── orchestrator/        # Central coordinator
│   │   └── index.js
│   ├── models/              # Database models
│   ├── services/            # Business logic
│   ├── utils/               # Utilities (logger, etc.)
│   ├── monitoring/          # Monitoring & health checks
│   └── api/                 # REST API for frontend
├── config/                  # Configuration files
├── tests/                   # Test suites
├── logs/                    # Application logs
├── docs/                    # Documentation
│   ├── 00_PROJECT_CONSTITUTION.md
│   ├── 01_TEAM_STRUCTURE.md
│   ├── 02_FILTRATION_RULES.md
│   ├── 03_SYSTEM_ARCHITECTURE.md
│   └── ...
├── package.json
├── .env.example
└── README.md
```

---

## 🤖 Agent-Based Architecture

### How It Works

1. **Autonomous Operation**: Each agent operates independently, making decisions based on configured thresholds
2. **Event-Driven Communication**: Agents communicate via events and queues
3. **Human Oversight**: Minimal - only triggered when:
   - Credibility score < 70
   - Fake risk = High
   - Moderation violations detected
4. **Self-Recovery**: Agents automatically retry on failures
5. **Continuous Monitoring**: All agents report health metrics

### Creating a New Agent

```javascript
import { BaseAgent } from './BaseAgent.js';

export class MyAgent extends BaseAgent {
  constructor() {
    super('MyAgent', { autoRetry: true });
  }

  async execute(task) {
    // Your autonomous logic here
    return { result: 'success' };
  }
}
```

---

## 🔧 Configuration

### Environment Variables

```env
# API Keys
ANTHROPIC_API_KEY=your_key
SARVAM_API_KEY=your_key

# Database
MONGODB_URI=mongodb://localhost:27017/jionews
REDIS_URL=redis://localhost:6379

# Thresholds (Autonomous Decision Making)
CREDIBILITY_THRESHOLD=70
AUTO_PUBLISH_THRESHOLD=80
FAKE_RISK_THRESHOLD=medium

# Agent Configuration
FEED_POLL_INTERVAL=60000
MAX_CONCURRENT_AGENTS=10
```

---

## 📊 Monitoring

View agent health and system status:

```bash
# View orchestrator logs
tail -f logs/combined.log

# Monitor Redis queue
redis-cli MONITOR

# Check MongoDB
mongo jionews
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific agent tests
npm test -- feed-agent

# E2E testing
npm run test:e2e
```

---

## 📚 Documentation

- [Project Constitution](00_PROJECT_CONSTITUTION.md)
- [Team Structure](01_TEAM_STRUCTURE.md)
- [Filtration Rules](02_FILTRATION_RULES.md)
- [System Architecture](03_SYSTEM_ARCHITECTURE.md)
- [Agent Prompts](05_AGENT_PROMPTS.md)
- [Task Distribution](TASK_DISTRIBUTION.md)

---

## 👥 Team

- **AI/Architecture Owner**: System orchestration, Claude prompts, demo
- **Backend Team (4)**: Agent implementation, pipeline, APIs
- **Frontend Team (4)**: UI, monitoring, testing, demo

See [TASK_DISTRIBUTION.md](TASK_DISTRIBUTION.md) for detailed task assignments.

---

## 🎯 Current Status

**Phase**: Development (Staging Branch)

**Progress**:
- ✅ Base agent architecture
- ✅ 8 agents implemented
- ✅ Central orchestrator
- 🔄 Database integration
- 🔄 Frontend UI
- 🔄 Translation service
- 🔄 CI/CD pipeline

---

## 🤝 Contributing

1. Check [TASK_DISTRIBUTION.md](TASK_DISTRIBUTION.md) for assigned tasks
2. Create feature branch from `staging`
3. Implement your assigned agent/feature
4. Follow agent pattern in `BaseAgent.js`
5. Ensure minimal human touchpoints
6. Submit PR to `staging` branch

---

## 📄 License

MIT License - JioNews Sentinel Team

---

## 🚨 Important Notes

- **Autonomous First**: AI makes all decisions unless flagged
- **Human Approval**: Only for high-risk content (credibility < 70, fake risk = High)
- **Self-Recovery**: Agents retry automatically on failures
- **Monitoring**: All actions logged for transparency

---

**Built with ❤️ by the JioNews Sentinel Team**
