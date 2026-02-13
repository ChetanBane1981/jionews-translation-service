# 📦 Migration Guide - Separating Frontend & Backend

## Current Structure (Before)
```
jionews-translation-service/
├── src/                    # Backend code
├── frontend/               # Frontend code (nested)
├── package.json            # Backend dependencies
└── ...
```

## Target Structure (After)

### Option A: Separate Repositories (Recommended)
```
jionews-backend/            # Separate repo
├── src/
├── package.json
└── README.md

jionews-frontend/           # Separate repo
├── src/
├── package.json
└── README.md
```

### Option B: Monorepo with Clear Separation
```
jionews-sentinel/
├── backend/                # Backend project
│   ├── src/
│   ├── package.json
│   └── README.md
└── frontend/               # Frontend project (at root level)
    ├── src/
    ├── package.json
    └── README.md
```

---

## 🔄 Migration Steps

### Step 1: Backend Team - No Action Needed (Already Correct)

Your backend code is already correctly organized:
```
jionews-translation-service/
├── src/                 # ✅ All backend code here
│   ├── agents/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── ...
├── package.json         # ✅ Backend dependencies
├── .env                 # ✅ Backend environment
└── README.md            # ✅ Backend documentation
```

**Backend team can continue working as-is.** No changes required.

---

### Step 2: Frontend Team - Extract to Separate Location

#### If Creating Separate Repo (Option A):

```bash
# 1. Create new frontend repo
mkdir jionews-frontend
cd jionews-frontend
git init

# 2. Copy frontend files from backend repo
cp -r ../jionews-translation-service/frontend/* .

# 3. Update package.json
# Change name, version, and scripts as needed

# 4. Create .env file
echo "VITE_API_BASE_URL=http://localhost:3000" > .env

# 5. Initialize git
git add .
git commit -m "Initial commit: Extract frontend from backend repo"
git remote add origin <your-frontend-repo-url>
git push -u origin main
```

#### If Using Monorepo (Option B):

```bash
# Frontend stays in same location, just ensure independence
cd frontend/

# Verify independent operation
npm install
npm run dev

# Frontend runs independently on localhost:5173
# Backend runs independently on localhost:3000
```

---

### Step 3: Update Frontend Configuration

#### Update `.env` (Frontend)
```env
# .env
VITE_API_BASE_URL=http://localhost:3000
VITE_API_TIMEOUT=30000
```

#### Update API Base URL in Frontend Code

**Before:**
```typescript
// Relative paths (won't work when separated)
const response = await fetch('/api/content');
```

**After:**
```typescript
// Use environment variable
const API_BASE = import.meta.env.VITE_API_BASE_URL;
const response = await fetch(`${API_BASE}/api/content`);
```

#### Create API Service Layer (Recommended)

**File: `frontend/src/services/api.ts`**
```typescript
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor (for auth tokens later)
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor (for error handling)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      console.error('Unauthorized access');
    }
    return Promise.reject(error);
  }
);
```

**File: `frontend/src/services/contentService.ts`**
```typescript
import { api } from './api';

export const contentService = {
  async getContent(domain: string, filters?: any) {
    const response = await api.get('/content', {
      params: { domain, ...filters }
    });
    return response.data;
  },

  async getById(id: string) {
    const response = await api.get(`/content/${id}`);
    return response.data;
  },

  async getTrending(domain: string, limit = 10) {
    const response = await api.get(`/content/domain/${domain}/trending`, {
      params: { limit }
    });
    return response.data;
  },

  async search(query: string, domain?: string) {
    const response = await api.post('/content/search', { query, domain });
    return response.data;
  },

  async approve(id: string, approver: string) {
    const response = await api.patch(`/content/${id}/approve`, { approver });
    return response.data;
  },

  async reject(id: string, approver: string, reason: string) {
    const response = await api.patch(`/content/${id}/reject`, { approver, reason });
    return response.data;
  }
};
```

**File: `frontend/src/services/domainService.ts`**
```typescript
import { api } from './api';

export const domainService = {
  async getAllDomains() {
    const response = await api.get('/domains');
    return response.data;
  },

  async getDomainConfig(domainId: string) {
    const response = await api.get(`/domains/${domainId}/config`);
    return response.data;
  },

  async getCategories(domainId: string) {
    const response = await api.get(`/domains/${domainId}/categories`);
    return response.data;
  },

  async getBranding(domainId: string) {
    const response = await api.get(`/domains/${domainId}/branding`);
    return response.data;
  }
};
```

---

### Step 4: Update Backend CORS Configuration

**File: `src/api/server.js`**
```javascript
import cors from 'cors';

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',           // Frontend dev
    'http://localhost:3000',           // Backend dev (for testing)
    process.env.FRONTEND_URL,          // Frontend prod URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

**Add to `.env` (Backend):**
```env
# Frontend URL for CORS
FRONTEND_URL=https://jionews.example.com
```

---

### Step 5: Register New Routes in Backend

**File: `src/api/server.js`** (Add these imports and routes)

```javascript
import contentRoutes from '../routes/content.routes.js';
import domainRoutes from '../routes/domain.routes.js';
import domainManager from '../managers/DomainManager.js';

// Initialize domain manager
await domainManager.initialize();

// Register generic routes
app.use('/api/content', contentRoutes);
app.use('/api/domains', domainRoutes);

// Existing news routes (backward compatibility)
app.use('/api/news', newsRoutes);
```

---

### Step 6: Testing the Separation

#### Backend Testing
```bash
# 1. Start backend
cd jionews-translation-service
npm run api:dev

# 2. Test API endpoints
curl http://localhost:3000/api/domains
curl http://localhost:3000/api/content?domain=news
curl http://localhost:3000/api/domains/news/config
```

#### Frontend Testing
```bash
# 1. Start frontend (separate terminal)
cd jionews-frontend  # or frontend/
npm run dev

# 2. Open browser
# http://localhost:5173

# 3. Verify API calls in Network tab
# Should see requests to http://localhost:3000/api/*
```

---

## 📋 Checklist

### Backend Team ✅
- [x] Generic routes created (`content.routes.js`, `domain.routes.js`)
- [ ] Routes registered in `server.js`
- [ ] DomainManager initialized on startup
- [ ] CORS configured for frontend origin
- [ ] Environment variables documented
- [ ] API documentation created (Swagger/Postman)

### Frontend Team 🔲
- [ ] Frontend extracted to independent location
- [ ] API service layer created (`api.ts`, `contentService.ts`, `domainService.ts`)
- [ ] Environment variables configured (`.env`)
- [ ] All API calls updated to use service layer
- [ ] Domain switcher component created
- [ ] Tested against backend API
- [ ] Error handling implemented

---

## 🔗 Integration Testing

### Test Scenario 1: List News Content
```bash
# Backend endpoint
GET http://localhost:3000/api/content?domain=news&limit=10

# Frontend usage
const news = await contentService.getContent('news', { limit: 10 });
```

### Test Scenario 2: Get Domain Branding
```bash
# Backend endpoint
GET http://localhost:3000/api/domains/news/branding

# Frontend usage
const branding = await domainService.getBranding('news');
// Use branding.title, branding.primaryColor, etc.
```

### Test Scenario 3: Search Content
```bash
# Backend endpoint
POST http://localhost:3000/api/content/search
Body: { "query": "technology", "domain": "news" }

# Frontend usage
const results = await contentService.search('technology', 'news');
```

---

## 🚀 Deployment

### Backend Deployment
```bash
# Build backend
npm run build

# Deploy using PM2
pm2 start dist/api/server.js --name jionews-api

# Or Docker
docker build -t jionews-api .
docker run -p 3000:3000 jionews-api
```

### Frontend Deployment
```bash
# Build frontend
npm run build

# Deploy to Vercel/Netlify
vercel --prod

# Or serve static files
npx serve -s dist -p 80
```

### Environment Variables (Production)

**Backend (`.env.production`):**
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://production-host:27017/jionews
REDIS_HOST=production-redis-host
FRONTEND_URL=https://jionews.example.com
ANTHROPIC_API_KEY=prod_key
SARVAM_API_KEY=prod_key
```

**Frontend (`.env.production`):**
```env
VITE_API_BASE_URL=https://api.jionews.example.com
```

---

## 💡 Best Practices

### For Backend Team:
1. ✅ Always enable CORS for frontend origin
2. ✅ Use consistent response formats (`{ success, data, error }`)
3. ✅ Version your API if making breaking changes (`/api/v1/`, `/api/v2/`)
4. ✅ Document all endpoints with examples
5. ✅ Notify frontend team of API changes in advance

### For Frontend Team:
1. ✅ Always use API service layer (never direct fetch/axios in components)
2. ✅ Handle loading states and errors gracefully
3. ✅ Test against actual backend (not mocked data)
4. ✅ Use environment variables for API URL (never hardcode)
5. ✅ Implement retry logic for failed requests

---

## 🆘 Troubleshooting

### CORS Errors
**Problem**: `Access-Control-Allow-Origin` error in browser console

**Solution**:
```javascript
// Backend: Add frontend origin to CORS
origin: ['http://localhost:5173', process.env.FRONTEND_URL]
```

### Network Error
**Problem**: Frontend can't reach backend

**Solution**:
1. Verify backend is running: `curl http://localhost:3000/health`
2. Check `VITE_API_BASE_URL` in frontend `.env`
3. Verify firewall not blocking port 3000

### API Returns 404
**Problem**: API endpoint not found

**Solution**:
1. Verify routes are registered in `server.js`
2. Check route path matches frontend call
3. Review backend logs for errors

---

## 📞 Support

- **Backend Issues**: Contact backend team lead
- **Frontend Issues**: Contact frontend team lead
- **Integration Issues**: Schedule sync meeting

---

**Migration Complete! Both teams can now work independently while maintaining seamless integration.**
