# 🔌 API Documentation - JioNews Sentinel Backend

**Base URL (Development)**: `http://localhost:3000/api`
**Base URL (Production)**: `https://api.jionews.example.com/api`

---

## 📚 Table of Contents

1. [Content API](#content-api)
2. [Domain API](#domain-api)
3. [Legacy News API](#legacy-news-api)
4. [Response Formats](#response-formats)
5. [Error Codes](#error-codes)
6. [Examples](#examples)

---

## 🗂️ Content API

Generic content endpoints that work for **all domains** (news, ecommerce, social, etc.)

### `GET /api/content`
List content items for a domain.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `domain` | string | No | `news` | Domain ID (news, ecommerce, social) |
| `category` | string | No | - | Filter by category |
| `type` | string | No | - | Content type (news, product, social_post) |
| `published` | boolean | No | - | Filter by publication status |
| `page` | number | No | `1` | Page number |
| `limit` | number | No | `20` | Items per page |
| `sortBy` | string | No | `publishedAt` | Sort field |
| `sortOrder` | string | No | `desc` | Sort order (asc/desc) |

**Example Request:**
```bash
GET /api/content?domain=news&category=technology&page=1&limit=10
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "abc123",
      "type": "news",
      "domain": "news",
      "title": "AI Breakthrough in Healthcare",
      "content": "...",
      "domainMetadata": {
        "category": "technology",
        "breaking": true
      },
      "processingResults": {
        "importance": { "score": 85 },
        "credibility": { "score": 92 }
      },
      "published": true,
      "publishedAt": "2026-02-13T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "pages": 15
  },
  "domain": "JioNews Sentinel"
}
```

---

### `GET /api/content/:id`
Get a single content item by ID.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Content item ID |

**Example Request:**
```bash
GET /api/content/abc123
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "type": "news",
    "domain": "news",
    "title": "AI Breakthrough in Healthcare",
    "content": "Full article content here...",
    "author": "Jane Smith",
    "url": "https://source.com/article",
    "imageUrl": "https://cdn.com/image.jpg",
    "domainMetadata": {
      "category": "technology",
      "breaking": true,
      "urgency": "High"
    },
    "processingResults": {
      "importance": {
        "score": 85,
        "level": "High",
        "reasoning": "Significant medical breakthrough"
      },
      "credibility": {
        "score": 92,
        "risk": "Low",
        "reasoning": "Reputable source, verified claims"
      },
      "sentiment": {
        "score": 45,
        "emotion": "joy",
        "tone": "informative"
      },
      "entities": {
        "people": ["Dr. John Doe"],
        "places": ["Boston", "USA"],
        "organizations": ["MIT", "Harvard Medical"]
      }
    },
    "published": true,
    "publishedAt": "2026-02-13T10:30:00Z"
  }
}
```

---

### `GET /api/content/domain/:domain/trending`
Get trending/high-importance content for a domain.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain` | string | Yes | Domain ID |

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | number | No | `10` | Number of items |

**Example Request:**
```bash
GET /api/content/domain/news/trending?limit=5
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "xyz789",
      "title": "Breaking: Major Policy Change",
      "processingResults": {
        "importance": { "score": 95 }
      },
      "publishedAt": "2026-02-13T12:00:00Z"
    }
  ],
  "domain": "JioNews Sentinel"
}
```

---

### `GET /api/content/domain/:domain/categories/:category`
Get content by category for a specific domain.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain` | string | Yes | Domain ID |
| `category` | string | Yes | Category ID |

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | `1` | Page number |
| `limit` | number | No | `20` | Items per page |

**Example Request:**
```bash
GET /api/content/domain/news/categories/politics?page=1&limit=20
```

---

### `POST /api/content/search`
Search content across domains.

**Request Body:**
```json
{
  "query": "artificial intelligence",
  "domain": "news",  // Optional
  "filters": {       // Optional
    "published": true,
    "domainMetadata.category": "technology"
  },
  "page": 1,
  "limit": 20
}
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "search1",
      "title": "AI Revolution in 2026",
      "content": "..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

### `GET /api/content/pending-approval`
Get content items pending human approval.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain` | string | No | Filter by domain |

**Example Request:**
```bash
GET /api/content/pending-approval?domain=news
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "pending1",
      "title": "Controversial Article",
      "requiresApproval": true,
      "approvalStatus": "pending",
      "processingResults": {
        "credibility": { "score": 65 }
      }
    }
  ],
  "count": 5
}
```

---

### `PATCH /api/content/:id/approve`
Approve a content item for publication.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Content item ID |

**Request Body:**
```json
{
  "approver": "admin@example.com"
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": "pending1",
    "approvalStatus": "approved",
    "approvedBy": "admin@example.com",
    "approvedAt": "2026-02-13T14:00:00Z"
  },
  "message": "Content approved"
}
```

---

### `PATCH /api/content/:id/reject`
Reject a content item.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Content item ID |

**Request Body:**
```json
{
  "approver": "admin@example.com",
  "reason": "Lacks credible sources"
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": "pending1",
    "approvalStatus": "rejected",
    "approvedBy": "admin@example.com",
    "approvalReason": "Lacks credible sources",
    "approvedAt": "2026-02-13T14:00:00Z"
  },
  "message": "Content rejected"
}
```

---

## 🌐 Domain API

Manage and query domain configurations.

### `GET /api/domains`
List all configured domains.

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "domainId": "news",
      "name": "JioNews Sentinel",
      "description": "Autonomous AI newsroom",
      "contentType": "news",
      "enabled": true,
      "categories": 8,
      "agents": 10,
      "branding": {
        "title": "JioNews Sentinel",
        "primaryColor": "#2563eb"
      }
    },
    {
      "domainId": "ecommerce",
      "name": "Product Intelligence Hub",
      "description": "AI-powered product discovery",
      "contentType": "product",
      "enabled": true,
      "categories": 8,
      "agents": 9
    }
  ],
  "count": 2
}
```

---

### `GET /api/domains/stats`
Get domain statistics.

**Example Response:**
```json
{
  "success": true,
  "data": {
    "totalDomains": 3,
    "enabledDomains": 2,
    "byContentType": {
      "news": 1,
      "product": 1,
      "social_post": 1
    },
    "domainList": [
      {
        "domainId": "news",
        "name": "JioNews Sentinel",
        "contentType": "news",
        "enabled": true,
        "agentCount": 10
      }
    ]
  }
}
```

---

### `GET /api/domains/:domainId/config`
Get full configuration for a domain.

**Example Request:**
```bash
GET /api/domains/news/config
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "domainId": "news",
    "name": "JioNews Sentinel",
    "contentType": "news",
    "categories": [...],
    "userSegments": [...],
    "agentPipeline": [...],
    "thresholds": {
      "credibilityMin": 70,
      "autoPublishMin": 80
    },
    "translation": {
      "enabled": true,
      "targetLanguages": [...]
    },
    "branding": {
      "title": "JioNews Sentinel",
      "subtitle": "Autonomous AI Newsroom",
      "primaryColor": "#2563eb"
    }
  }
}
```

---

### `GET /api/domains/:domainId/pipeline`
Get agent pipeline configuration.

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "feed",
      "name": "feed",
      "enabled": true,
      "order": 1,
      "skills": ["dataValidation", "cacheManagement"]
    },
    {
      "type": "detection",
      "name": "detection",
      "enabled": true,
      "order": 2,
      "skills": ["sentimentAnalysis", "entityExtraction"]
    }
  ],
  "count": 10
}
```

---

### `GET /api/domains/:domainId/categories`
Get categories for a domain.

**Example Response:**
```json
{
  "success": true,
  "data": [
    { "id": "politics", "name": "Politics", "icon": "⚖️" },
    { "id": "business", "name": "Business", "icon": "💼" },
    { "id": "technology", "name": "Technology", "icon": "💻" }
  ],
  "count": 8
}
```

---

### `GET /api/domains/:domainId/segments`
Get user segments for personalization.

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "general",
      "name": "General Audience",
      "description": "Broad interest in various topics",
      "interests": ["politics", "business", "technology"]
    },
    {
      "id": "tech",
      "name": "Tech Enthusiasts",
      "description": "Technology focused",
      "interests": ["technology", "science", "business"]
    }
  ],
  "count": 4
}
```

---

### `GET /api/domains/:domainId/thresholds`
Get processing thresholds.

**Example Response:**
```json
{
  "success": true,
  "data": {
    "credibilityMin": 70,
    "credibilityAutoReject": 30,
    "importanceMin": 50,
    "autoPublishMin": 80,
    "requireApprovalBelow": 80,
    "similarityThreshold": 0.85
  }
}
```

---

### `GET /api/domains/:domainId/branding`
Get branding information for UI theming.

**Example Response:**
```json
{
  "success": true,
  "data": {
    "title": "JioNews Sentinel",
    "subtitle": "Autonomous AI Newsroom",
    "logo": "/logo.png",
    "primaryColor": "#2563eb",
    "accentColor": "#7c3aed"
  }
}
```

---

### `POST /api/domains/:domainId/reload`
Reload domain configuration from file (hot-reload).

**Example Response:**
```json
{
  "success": true,
  "message": "Domain 'news' reloaded successfully"
}
```

---

### `PATCH /api/domains/:domainId/enable`
Enable or disable a domain.

**Request Body:**
```json
{
  "enabled": true
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Domain 'news' enabled"
}
```

---

### `GET /api/domains/:domainId/export`
Export domain configuration as JSON file.

**Response**: JSON file download

---

## 📋 Response Formats

### Success Response
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

### Error Response
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

---

## ❌ Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `DOMAIN_NOT_FOUND` | 404 | Specified domain does not exist |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `SEARCH_ERROR` | 500 | Search operation failed |
| `INTERNAL_ERROR` | 500 | Server error |
| `RELOAD_FAILED` | 500 | Failed to reload configuration |

---

## 📝 Examples

### Frontend React Hook Example

```typescript
// useContent.ts
import { useState, useEffect } from 'react';
import { contentService } from '../services/contentService';

export function useContent(domain: string, category?: string) {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchContent() {
      try {
        setLoading(true);
        const response = await contentService.getContent(domain, {
          category,
          limit: 20
        });
        setContent(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchContent();
  }, [domain, category]);

  return { content, loading, error };
}
```

### Frontend Component Example

```typescript
// NewsFeed.tsx
import { useContent } from '../hooks/useContent';

export function NewsFeed() {
  const { content, loading, error } = useContent('news', 'technology');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {content.map(item => (
        <ContentCard key={item.id} content={item} />
      ))}
    </div>
  );
}
```

---

## 🔒 Authentication (Future)

Currently, the API is open. Authentication will be added in future versions:

```bash
# With authentication (future)
GET /api/content
Authorization: Bearer <jwt-token>
```

---

## 📞 Support

- **Backend Team**: Contact for API issues
- **API Documentation**: This file
- **Live API Testing**: Use Postman collection (coming soon)

---

**API Version**: 1.0.0
**Last Updated**: 2026-02-13
