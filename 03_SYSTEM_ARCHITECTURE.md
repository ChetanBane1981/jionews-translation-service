# System Architecture

## 1. Full System Architecture
```mermaid
flowchart TD
A[News APIs / RSS / Social] --> B[Feed Ingestion Engine]
B --> C[Breaking News Detection AI]
C --> D[Credibility Engine]
D --> E[Article Generator]
E --> F[Personalization Engine]
F --> G[Publishing Engine]

D --> H[Human Supervisor]
H -->|Approve/Override| G


## 2. Autonomous Newsroom Flow
```mermaid
flowchart LR
A[Incoming News] --> B[Detect Breaking News]
B --> C[Credibility Check]
C --> D{High Risk?}
D -- Yes --> E[Human Approval]
D -- No --> F[Generate Article]
E --> F
F --> G[Personalize]
G --> H[Publish]


## 3. Multi-LLM Flow
```mermaid
flowchart LR
A[News Input] --> B[LLM Detection]
B --> C[Credibility Scoring]
C --> D[Article Generation]
D --> E[Personalization]
E --> F[Multilingual Output (Sarvam)]
F --> G[Publish]


## 4. Autonomous CI/CD Flow
```mermaid
flowchart TD
A[Model/Prompt Update] --> B[Automated Testing]
B --> C[Bias & Fake News Check]
C --> D[Quality Score]
D --> E{Pass?}
E -- Yes --> F[Deploy]
E -- No --> G[Rollback]
F --> H[Monitoring]
H --> A
