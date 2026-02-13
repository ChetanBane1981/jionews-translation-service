# JioNews Sentinel — Autonomous AI Newsroom
## Constitution v2.0 (Production-Grade)

**Last Updated**: 2026-02-13
**Status**: FINAL - Production Lock
**Version**: 2.0 (Production-Ready)

---

## Mission
Build a **fully autonomous**, **production-grade**, **scalable** AI newsroom with automated SDLC.

---

## Core Requirements

### 1. **Autonomy** (AI-First)
- ✅ AI executes **95%+ of newsroom operations**
- ✅ Humans supervise **only high-risk cases** (credibility <70%, fake risk=High)
- ✅ **10 autonomous agents** handle entire pipeline
- ✅ Auto-publish when quality thresholds met
- ✅ Self-recovery on failures (auto-retry)

### 2. **Production-Grade Quality**
- ✅ **TypeScript** for type safety (frontend + backend)
- ✅ **Error handling** at every layer
- ✅ **Health monitoring** with auto-alerts
- ✅ **Logging** with Winston (error tracking)
- ✅ **Database persistence** (MongoDB + Redis)
- ✅ **API rate limiting** and security
- ✅ **Unit + Integration tests** (>80% coverage)

### 3. **Scalability** (New in v2.0)
- ✅ **Load Balancer** (NGINX) for high availability
- ✅ **Horizontal scaling** (multiple API instances)
- ✅ **MongoDB Replica Set** for data redundancy
- ✅ **Redis Cluster** for queue reliability
- ✅ **Auto-scaling** based on traffic
- ✅ **99.9% uptime** SLA target
- ✅ Handle **10,000+ concurrent users**

### 4. **Multilingual & Personalization**
- ✅ **10 Indian languages** (Hindi, Tamil, Telugu, Bengali, etc.)
- ✅ **Sarvam AI** integration for quality translation
- ✅ **4 user types** (General, Finance, Politics, Tech)
- ✅ **Personalized feeds** per user segment
- ✅ **User preference learning**

### 5. **Agentic SDLC** (DevOps Excellence)
- ✅ **CI/CD Pipeline** (GitHub Actions)
- ✅ **Automated testing** on every commit
- ✅ **Automated deployment** on success
- ✅ **Auto-rollback** on failures
- ✅ **Health monitoring** with alerts
- ✅ **Continuous self-improvement**

### 6. **Human Oversight** (Minimal but Critical)
- ✅ **Approval Queue** for flagged content
- ✅ **Real-time monitoring** dashboard
- ✅ **Alert system** for critical issues
- ✅ **Manual override** capability
- ✅ **Audit trail** for all decisions

### 7. **Filtration & Governance**
- ✅ **Embedded in AI logic** (not manual)
- ✅ **Credibility scoring** (Claude AI)
- ✅ **Fake news detection** (multi-factor)
- ✅ **Source trust ranking**
- ✅ **Spam & duplicate detection**
- ✅ **Editorial policy enforcement**

### 8. **Demonstration-Ready** (UX/UI Excellence)
- ✅ **5 production pages** (Dashboard, News, Approval, Monitoring, Metrics)
- ✅ **Real-time updates** (WebSocket)
- ✅ **Responsive design** (mobile + desktop)
- ✅ **Professional UI** (Tailwind CSS)
- ✅ **Loading states** and error handling
- ✅ **Data visualization** (charts, graphs)

---

## Technical Architecture

### **Stack**
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + TypeScript + Express
- **Database**: MongoDB (Replica Set)
- **Queue**: Redis (Cluster)
- **Load Balancer**: NGINX
- **AI**: Claude (Anthropic) + Sarvam AI
- **Monitoring**: Winston + Health Checks
- **CI/CD**: GitHub Actions
- **Deployment**: Docker + Docker Compose (Kubernetes optional)

### **Infrastructure**
```
┌─────────────────────────────────────────┐
│         NGINX Load Balancer              │
│         (SSL, Health Checks)             │
└──────┬──────────┬──────────┬────────────┘
       │          │          │
   ┌───▼───┐  ┌───▼───┐  ┌───▼───┐
   │ API 1 │  │ API 2 │  │ API N │  (Auto-scale)
   └───┬───┘  └───┬───┘  └───┬───┘
       └──────────┴──────────┘
                  │
       ┌──────────┴──────────┐
       │                     │
   ┌───▼────┐        ┌───────▼──────┐
   │ MongoDB│        │ Redis Cluster│
   │Replica │        │   (Queue)    │
   └────────┘        └──────────────┘
                            │
                   ┌────────▼────────┐
                   │  Agent Workers  │
                   │  (10 Agents)    │
                   └─────────────────┘
```

---

## Performance Requirements

### **Response Times** (Production SLA)
- API Response: <200ms (p95)
- Page Load: <2s (p95)
- Agent Processing: <5s per item
- Queue Processing: <1min per item

### **Availability**
- Uptime: 99.9% (max 43 min downtime/month)
- Failover: <30s
- Recovery: Automatic

### **Capacity**
- Concurrent Users: 10,000+
- News Processing: 1,000+ items/hour
- API Requests: 10,000+ req/min
- Database: 100M+ documents

---

## Security Requirements

### **Must Have**
- ✅ HTTPS/SSL certificates
- ✅ API authentication (JWT)
- ✅ Rate limiting (per IP)
- ✅ Input validation
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ CORS configuration
- ✅ Environment variables (no hardcoded secrets)

### **Should Have**
- 🔄 DDoS protection (Cloudflare)
- 🔄 WAF (Web Application Firewall)
- 🔄 Intrusion detection
- 🔄 Regular security audits

---

## Monitoring & Alerts

### **Metrics to Track**
- ✅ API response times
- ✅ Error rates
- ✅ Queue depths
- ✅ Agent health
- ✅ Database performance
- ✅ Memory/CPU usage
- ✅ Disk space

### **Alerts**
- ✅ System down
- ✅ High error rate (>5%)
- ✅ Queue backup (>100 items)
- ✅ Agent failures
- ✅ Database issues
- ✅ High CPU/memory (>80%)

---

## Compliance & Governance

### **Data Privacy**
- ✅ GDPR compliance
- ✅ Data encryption at rest
- ✅ Data encryption in transit
- ✅ User data protection
- ✅ Right to deletion

### **Content Moderation**
- ✅ Fake news detection
- ✅ Hate speech filtering
- ✅ Copyright protection
- ✅ Editorial standards
- ✅ Human oversight for sensitive content

---

## Success Criteria

### **Technical**
- ✅ All 10 agents operational
- ✅ 99.9% uptime
- ✅ <200ms API response time
- ✅ Zero data loss
- ✅ Auto-scaling functional
- ✅ CI/CD pipeline active

### **Business**
- ✅ 95%+ automated processing
- ✅ <5% human intervention rate
- ✅ 10+ languages supported
- ✅ Multi-user personalization
- ✅ Real-time news delivery
- ✅ Professional UI/UX

### **Quality**
- ✅ TypeScript (100% coverage)
- ✅ Test coverage (>80%)
- ✅ Code quality (ESLint passing)
- ✅ Security audit passed
- ✅ Load testing passed (10k users)
- ✅ Documentation complete

---

## Non-Negotiables (Production Lock)

Once production:
- ❌ No architecture changes without review
- ❌ No breaking API changes
- ❌ No database schema changes without migration
- ❌ No security compromise
- ❌ No downtime without notice

---

## Version History

### **v1.0** (Development)
- Basic autonomous newsroom
- Single server architecture
- JavaScript codebase

### **v2.0** (Production) - **CURRENT**
- ✅ Load balancer added
- ✅ TypeScript migration
- ✅ Horizontal scaling
- ✅ High availability
- ✅ Production-grade quality
- ✅ Complete UI/UX
- ✅ CI/CD pipeline

---

## Approval

**Constitution Status**: ✅ **APPROVED FOR PRODUCTION**

**Key Changes in v2.0**:
1. ✅ Load Balancer requirement added
2. ✅ Scalability requirements defined
3. ✅ Performance SLAs specified
4. ✅ Security requirements enhanced
5. ✅ TypeScript made mandatory

**Impact**: Production-ready, enterprise-grade quality

---

**This is the FINAL version before production lock.**

**Once deployed, changes require formal review process.**

---

✅ **Constitution v2.0 - PRODUCTION READY**
