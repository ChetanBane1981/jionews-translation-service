# Final Team Structure (9 Members)

## 1. AI/Architecture Owner (You)
- Role: System architect, orchestrator, Claude prompt owner, demo presenter  
- Responsibilities: oversee all modules, governance, final decision during hackathon, integration, final demo explanation

## 2. Backend Team (4)
| Member | Focus | Responsibilities | Agent Ownership |
|--------|-------|-----------------|----------------|
| Backend 1 | Feed + Pipeline | Feed ingestion, continuous headline fetch, queue/pipeline integration, DB writes | Feed agent |
| Backend 2 | Clustering + Moderation | Deduplication, headline clustering, moderation service, approval routing | Cluster + Moderation agents |
| Backend 3 | Summaries + Translation + Quality | Claude summary, translation pipeline, Sarvam quality scoring, trending detection | Summarization + Translation + Quality agents |
| Backend 4 | Ranking + Personalization | Ranking logic, personalization engine, user memory, API to frontend | Ranking + Personalization agents |

## 3. Frontend Team (4)
| Member | Focus | Responsibilities |
|--------|-------|-----------------|
| Frontend 1 | Main UI Owner | Dashboard UI, news display, admin/editorial panel, personalization UI |
| Frontend 2 | Monitoring + Tester | Agent monitoring, pipeline status, error visibility, human approval panel |
| Frontend 3 | Testing + QA | End-to-end testing, summary validation, translation UI testing, edge-case testing |
| Frontend 4 | Demo + UX + Backup | Demo flow stability, UX polish, scenario testing, presentation support |

---

# Agent Responsibility Mapping
| Area | Owner |
|------|------|
Feed agent | Backend 1 |
Cluster/dedup | Backend 2 |
Moderation | Backend 2 |
Summarization (Claude) | Backend 3 |
Translation | Backend 3 |
Quality scoring (Sarvam) | Backend 3 |
Ranking | Backend 4 |
Personalization | Backend 4 |
Monitoring/testing agents | Frontend 2 + 3 |
Orchestrator prompts | AI/Architecture Owner |
