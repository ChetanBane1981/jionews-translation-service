# 👥 Team Structure - Frontend & Backend Separation

## Project Organization

The JioNews Sentinel framework is split into **two independent projects** managed by separate teams:

```
jionews-sentinel/
├── backend/                    # Backend Team
│   ├── src/
│   ├── package.json
│   ├── README.md
│   └── ...
│
└── frontend/                   # Frontend Team
    ├── src/
    ├── package.json
    ├── README.md
    └── ...
```

---

## 🔧 Backend Team (API & Agent System)

**Location**: `jionews-translation-service/` (root folder)

### Responsibilities
- Agent development and orchestration
- Domain configuration management
- Generic content processing pipeline
- API endpoints (REST)
- Database models and migrations
- AI service integrations (Anthropic, Sarvam)
- Skill system development

### Tech Stack
- **Runtime**: Node.js 18+
- **Language**: JavaScript (ES modules)
- **Framework**: Express.js
- **Database**: MongoDB
- **Cache**: Redis
- **Queue**: Bull
- **AI**: Anthropic Claude API
- **Translation**: Sarvam AI API

### Key Files
```
src/
├── agents/           # 10 autonomous agents
│   ├── BaseAgent.js
│   ├── skills/       # 20+ agent skills
│   └── [agent-files]
├── orchestrator/     # Agent coordination
├── models/           # MongoDB schemas
│   ├── ContentItem.js
│   ├── DomainConfig.js
│   └── UserProfile.js
├── services/         # AI/Translation providers
├── managers/         # DomainManager
├── routes/           # API routes
│   ├── content.routes.js   # Generic content API
│   ├── domain.routes.js    # Domain management API
│   └── news.routes.js      # Legacy news routes
├── config/
│   └── domains/      # Domain configurations
│       ├── news.domain.json
│       ├── ecommerce.domain.json
│       └── social.domain.json
└── utils/
```

### Backend API Base URL
- **Development**: `http://localhost:3000`
- **Production**: `https://api.jionews.example.com`

### Running Backend
```bash
# Install dependencies
npm install

# Start MongoDB & Redis
npm run docker:up

# Start API server (development)
npm run api:dev

# Start API server (production)
npm run build
npm start
```

### Backend Environment Variables
```env
# .env
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/jionews

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# AI Services
ANTHROPIC_API_KEY=your_key_here
SARVAM_API_KEY=your_key_here

# CORS (Frontend URLs)
FRONTEND_URL=http://localhost:5173
```

---

## 🎨 Frontend Team (UI/UX)

**Location**: `frontend/` (separate folder at same level as backend)

### Proposed New Structure
```
frontend/
├── src/
│   ├── pages/           # Page components
│   │   ├── NewsFeed.tsx
│   │   ├── Dashboard.tsx
│   │   ├── ApprovalQueue.tsx
│   │   └── DomainSwitcher.tsx
│   ├── components/      # Reusable components
│   │   ├── ContentCard.tsx      # Generic content display
│   │   ├── DomainSelector.tsx
│   │   └── ...
│   ├── hooks/           # Custom React hooks
│   │   ├── useDomainConfig.ts
│   │   └── useContent.ts
│   ├── services/        # API client
│   │   ├── api.ts       # Axios/Fetch wrapper
│   │   ├── contentService.ts
│   │   └── domainService.ts
│   ├── types/           # TypeScript types
│   │   ├── content.ts
│   │   ├── domain.ts
│   │   └── index.ts
│   ├── contexts/        # React contexts
│   │   └── DomainContext.tsx
│   ├── utils/
│   └── App.tsx
├── public/
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

### Responsibilities
- User interface development
- Domain-specific theming and branding
- Content display (news, products, social posts)
- Human approval workflow UI
- Dashboard and analytics visualization
- Responsive design (mobile, tablet, desktop)

### Tech Stack
- **Framework**: React 18+
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State**: React Hooks + Context
- **HTTP Client**: Axios
- **Routing**: React Router

### Running Frontend
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Frontend Environment Variables
```env
# .env
VITE_API_BASE_URL=http://localhost:3000
VITE_API_TIMEOUT=30000
```

---

## 🔗 API Integration (Backend ↔ Frontend)

### Backend Provides
- **Base URL**: `http://localhost:3000/api`
- **CORS**: Enabled for frontend origin
- **Authentication**: (To be implemented)

### Frontend Consumes

#### 1. Content API
```typescript
// contentService.ts
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const contentService = {
  // List content for a domain
  async getContent(domain: string, filters?: ContentFilters) {
    const response = await axios.get(`${API_BASE}/api/content`, {
      params: { domain, ...filters }
    });
    return response.data;
  },

  // Get single content item
  async getById(id: string) {
    const response = await axios.get(`${API_BASE}/api/content/${id}`);
    return response.data;
  },

  // Get trending content
  async getTrending(domain: string, limit = 10) {
    const response = await axios.get(
      `${API_BASE}/api/content/domain/${domain}/trending`,
      { params: { limit } }
    );
    return response.data;
  },

  // Search content
  async search(query: string, domain?: string) {
    const response = await axios.post(`${API_BASE}/api/content/search`, {
      query,
      domain
    });
    return response.data;
  }
};
```

#### 2. Domain API
```typescript
// domainService.ts
export const domainService = {
  // List all domains
  async getAllDomains() {
    const response = await axios.get(`${API_BASE}/api/domains`);
    return response.data;
  },

  // Get domain config
  async getDomainConfig(domainId: string) {
    const response = await axios.get(
      `${API_BASE}/api/domains/${domainId}/config`
    );
    return response.data;
  },

  // Get domain categories
  async getCategories(domainId: string) {
    const response = await axios.get(
      `${API_BASE}/api/domains/${domainId}/categories`
    );
    return response.data;
  },

  // Get domain branding
  async getBranding(domainId: string) {
    const response = await axios.get(
      `${API_BASE}/api/domains/${domainId}/branding`
    );
    return response.data;
  }
};
```

---

## 📋 API Contract (Documentation)

### Endpoints Backend Must Provide

#### Content Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/content` | List content (with filters) |
| GET | `/api/content/:id` | Get single item |
| GET | `/api/content/domain/:domain/trending` | Trending content |
| GET | `/api/content/domain/:domain/categories/:category` | By category |
| POST | `/api/content/search` | Search content |
| GET | `/api/content/pending-approval` | Approval queue |
| PATCH | `/api/content/:id/approve` | Approve content |
| PATCH | `/api/content/:id/reject` | Reject content |

#### Domain Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/domains` | List all domains |
| GET | `/api/domains/stats` | Domain statistics |
| GET | `/api/domains/:domainId/config` | Full config |
| GET | `/api/domains/:domainId/categories` | Categories |
| GET | `/api/domains/:domainId/branding` | Branding info |

### Response Format (Standard)

**Success Response:**
```json
{
  "success": true,
  "data": { /* ... */ },
  "pagination": {  // Optional, for list endpoints
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

**Error Response:**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

---

## 🚀 Deployment Strategy

### Backend Deployment
```bash
# Docker-based deployment
docker-compose -f docker-compose.prod.yml up -d

# Or PM2
pm2 start src/api/server.js --name jionews-api
```

**Backend URL**: `https://api.jionews.example.com`

### Frontend Deployment
```bash
# Build static assets
npm run build

# Deploy to CDN (Vercel, Netlify, S3 + CloudFront)
# dist/ folder contains static files
```

**Frontend URL**: `https://jionews.example.com`

---

## 🔐 CORS Configuration (Backend)

```javascript
// src/api/server.js
import cors from 'cors';

const corsOptions = {
  origin: [
    'http://localhost:5173',           // Frontend dev
    'https://jionews.example.com',     // Frontend prod
    process.env.FRONTEND_URL
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

---

## 📞 Communication Protocol

### Backend Team Responsibilities
1. ✅ Implement API endpoints as per contract
2. ✅ Provide OpenAPI/Swagger documentation
3. ✅ Handle CORS properly
4. ✅ Return consistent response formats
5. ✅ Notify frontend team of API changes
6. ✅ Provide sample API responses

### Frontend Team Responsibilities
1. ✅ Consume API endpoints via services
2. ✅ Handle loading states and errors gracefully
3. ✅ Implement domain-specific theming
4. ✅ Test against backend dev server
5. ✅ Notify backend team of new requirements
6. ✅ Document UI component library

### Communication Channels
- **API Changes**: Slack #api-changes channel
- **Bugs**: GitHub Issues (label: backend/frontend)
- **Features**: Weekly sync meeting
- **Documentation**: Shared Notion/Confluence

---

## 📦 Repository Structure Options

### Option 1: Monorepo (Current)
```
jionews-sentinel/
├── backend/
│   ├── src/
│   └── package.json
├── frontend/
│   ├── src/
│   └── package.json
└── README.md
```

**Pros**: Single repo, easier to coordinate
**Cons**: Shared commit history

### Option 2: Separate Repos (Recommended for teams)
```
jionews-backend/
├── src/
└── package.json

jionews-frontend/
├── src/
└── package.json
```

**Pros**: Independent versioning, separate CI/CD
**Cons**: Need to coordinate API versions

---

## 🔄 Development Workflow

### Local Development
1. **Backend team** runs API server on `localhost:3000`
2. **Frontend team** runs dev server on `localhost:5173`
3. Frontend points to backend via `VITE_API_BASE_URL=http://localhost:3000`

### Shared Dev Environment
- Backend deployed to: `https://dev-api.jionews.example.com`
- Frontend points to shared backend for testing

### Staging Environment
- Backend: `https://staging-api.jionews.example.com`
- Frontend: `https://staging.jionews.example.com`

### Production Environment
- Backend: `https://api.jionews.example.com`
- Frontend: `https://jionews.example.com`

---

## 📖 Documentation Responsibilities

### Backend Documentation
- ✅ API endpoint documentation (Swagger/Postman)
- ✅ Domain configuration schema
- ✅ Agent development guide
- ✅ Skill system documentation
- ✅ Database schema documentation

### Frontend Documentation
- ✅ Component library (Storybook)
- ✅ Design system
- ✅ State management patterns
- ✅ API service usage guide
- ✅ Theming and branding guide

---

## 🎯 Current Status

### Backend ✅
- Generic framework: **100% complete**
- API endpoints: **17 generic endpoints implemented**
- Domain configs: **3 domains ready (news, ecommerce, social)**
- Skills: **8 implemented, 12 framework ready**

### Frontend 🔧
- **Current**: Inside `frontend/` subfolder (needs extraction)
- **Target**: Independent project with domain-aware components
- **Todo**:
  1. Extract to separate folder/repo
  2. Implement domain switcher
  3. Update components to use generic API
  4. Add domain-based theming

---

## 🚀 Next Steps

### Backend Team
1. Register new routes in `src/api/server.js`
2. Initialize DomainManager on startup
3. Test all API endpoints
4. Generate API documentation (Swagger)
5. Set up staging environment

### Frontend Team
1. Extract frontend to independent structure
2. Create API service layer (contentService, domainService)
3. Implement domain switcher component
4. Update NewsFeed to use generic content API
5. Add domain-based theming/branding

---

**This separation allows both teams to work independently while maintaining a clean integration contract through the API.**
