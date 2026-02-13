# Agent-Specific Prompts

## Breaking Detection
Analyze news input. Return:
- Breaking: Yes/No  
- Importance Score 0-100  
- Reason

## Credibility & Filtration
Evaluate news against filters. Return:
- Credibility Score 0-100  
- Fake Risk: Low/Medium/High  
- Filter Failures (if any)  
- Auto-Publish: Yes/No

## Article Generation
Generate article:
- Headline  
- Summary  
- Full Article  
- Bullet Key Points  

## Personalization
Rewrite article for user type {finance/politics/general}  
Maintain factual accuracy

## Human Approval Decision
Return:
- Approval Required: Yes/No  
- Reason for override
