## Campaigns Module

Authoritative schema implemented via migrations. Feature-flag: `FEATURE_CAMPAIGNS_V2`.

### Tables
- campaigns(id, user_id, name, status, timezone, send_window_start, send_window_end, created_at, updated_at)
- campaign_contacts(id, campaign_id, contact_id, status, last_step_index, next_step_at, error, created_at, updated_at)
- sequence_steps(id, campaign_id, step_index, delay_hours, from_email_account_id, subject_template, body_template, prompt_key?, enabled, created_at, updated_at)
- messages(id, campaign_id, contact_id, step_id?, direction, smtp_account_id?, provider_message_id?, status, timestamps jsonb, raw jsonb, created_at, updated_at)
- events(id, campaign_id, contact_id, type, meta jsonb, occurred_at, created_at)
- unsubscribe_tokens(token, campaign_id, contact_id, expires_at, created_at)

### Routes (behind FEATURE_CAMPAIGNS_V2)
- GET `/api/campaigns` – list campaigns for the authenticated user
- POST `/api/campaigns` – create campaign
- PATCH `/api/campaigns/:id/status` – update campaign status
#### Steps
- GET `/api/campaigns/:id/steps`
- POST `/api/campaigns/:id/steps` (bulk or single)
- PUT `/api/campaigns/:id/steps/:stepId`
- PATCH `/api/campaigns/:id/steps/reorder`
- DELETE `/api/campaigns/:id/steps/:stepId`

### How to verify
Ensure you have a user and JWT. Set env and restart server:

```bash
export FEATURE_CAMPAIGNS_V2=true
npm run build && npm run start
```

Create a campaign:
```bash
curl -X POST http://localhost:3007/api/campaigns \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"name":"September Launch","timezone":"UTC","send_window_start":"09:00","send_window_end":"17:00"}'
```

List campaigns:
```bash
curl -X GET http://localhost:3007/api/campaigns \
  -H "Authorization: Bearer $JWT"
```

Update status:
#### Steps examples (PowerShell)
Create two steps:
```powershell
$cid=1
$body=@(
  @{ delay_hours=0; subject_template="Intro"; body_template="Hi {{first_name}}"; enabled=$true },
  @{ delay_hours=48; subject_template="Followup"; body_template="Checking in"; enabled=$true }
) | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:3007/api/campaigns/$cid/steps" -Headers @{ Authorization="Bearer $jwt"; "Content-Type"="application/json" } -Body $body
```

Reorder steps:
```powershell
$body=@{ step_ids=@(2,1) } | ConvertTo-Json
Invoke-RestMethod -Method Patch -Uri "http://localhost:3007/api/campaigns/$cid/steps/reorder" -Headers @{ Authorization="Bearer $jwt"; "Content-Type"="application/json" } -Body $body
```

Update a step:
```powershell
$body=@{ delay_hours=24; subject_template="Intro (updated)" } | ConvertTo-Json
Invoke-RestMethod -Method Put -Uri "http://localhost:3007/api/campaigns/$cid/steps/2" -Headers @{ Authorization="Bearer $jwt"; "Content-Type"="application/json" } -Body $body
```

Delete a step:
```powershell
Invoke-RestMethod -Method Delete -Uri "http://localhost:3007/api/campaigns/$cid/steps/2" -Headers @{ Authorization="Bearer $jwt" }
```
```bash
curl -X PATCH http://localhost:3007/api/campaigns/1/status \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"status":"ready"}'
```

### Targeting examples (PowerShell)
Attach contacts (duplicates ignored):
```powershell
$cid=1
$body=@{ contact_ids=@(101,102,102,103) } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:3007/api/campaigns/$cid/contacts" -Headers @{ Authorization="Bearer $jwt"; "Content-Type"="application/json" } -Body $body
```

List attached contacts with search and pagination:
```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3007/api/campaigns/$cid/contacts?search=john&page=1&limit=20" -Headers @{ Authorization="Bearer $jwt" }
```

Delete attached contact:
```powershell
Invoke-RestMethod -Method Delete -Uri "http://localhost:3007/api/campaigns/$cid/contacts/101" -Headers @{ Authorization="Bearer $jwt" }
```
### Mobile demo script (Expo)
1) Ensure backend is running with `FEATURE_CAMPAIGNS_V2=true`.
2) In `mobile/`, run `npm install` then `npm run start`.
3) In app: Campaigns tab → “+ New” → set name/timezone/window → Save.
4) Open campaign → Steps tab: add two steps; delete one; refresh.
5) Contacts tab: search, attach IDs (with duplicates), remove one.
6) Overview shows Draft status. No sending yet.
### Notes
- All endpoints are idempotent-safe at DB layer via constraints. For HTTP layer idempotency keys, add in later milestone.
- Does not modify existing contacts or email account modules.

## LLM Gateway & Prompt Library
### Settings
- GET `/api/settings/llm-keys` → { providers: ['openai'?] }
- PUT `/api/settings/llm-keys` → { provider } with body `{ provider: 'openai', api_key: 'sk-...' }`

Keys are encrypted at rest. Raw keys are never returned or logged.

### Prompts
- GET `/api/prompts` → merged defaults + user overrides
- POST `/api/prompts` with `{ action: 'restore_defaults' }` → clears overrides

Default prompts:
- key: `sequence_subject`
```
Subject: Following up with {{contact.first_name}} about {{company.name}}
```
- key: `sequence_body`
```
Hi {{contact.first_name}},

I'm {{user.name}} from {{company.name}}. {{campaign.purpose}}

Best,
{{user.name}}
```

## AI Step Generation
### Endpoint
- POST `/api/campaigns/:id/generate-steps`

Body:
```json
{
  "num_steps": 3,
  "tone": "friendly",
  "CTA": "book a demo",
  "prompt_overrides": { "sequence_subject": "Subject: Quick chat with {{company.name}}" }
}
```

Behavior:
- Loads prompt templates, applies variables `{user, company, contact(persona), campaign}`.
- If no steps exist: creates `num_steps` default steps with 0h, 48h, 96h delays.
- If steps exist: updates subject/body for existing steps.

PowerShell example:
```powershell
$cid=1
$body=@{ num_steps=2; tone="friendly"; CTA="book a demo" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:3007/api/campaigns/$cid/generate-steps" -Headers @{ Authorization="Bearer $jwt"; "Content-Type"="application/json" } -Body $body
```

## State Machine
### Endpoints
- POST `/api/campaigns/:id/validate`
- POST `/api/campaigns/:id/launch`
- POST `/api/campaigns/:id/pause`
- POST `/api/campaigns/:id/resume`
- POST `/api/campaigns/:id/cancel`

Rules:
- validate: requires ≥1 step, ≥1 contact, at least one step has from_email_account
- transitions: draft|ready → running; running → paused; paused → running; any → cancelled
- guards: illegal transitions return 409

Examples (PowerShell):
```powershell
$cid=1
Invoke-RestMethod -Method Post -Uri "http://localhost:3007/api/campaigns/$cid/validate" -Headers @{ Authorization="Bearer $jwt" }
Invoke-RestMethod -Method Post -Uri "http://localhost:3007/api/campaigns/$cid/launch" -Headers @{ Authorization="Bearer $jwt" }
Invoke-RestMethod -Method Post -Uri "http://localhost:3007/api/campaigns/$cid/pause" -Headers @{ Authorization="Bearer $jwt" }
Invoke-RestMethod -Method Post -Uri "http://localhost:3007/api/campaigns/$cid/resume" -Headers @{ Authorization="Bearer $jwt" }
Invoke-RestMethod -Method Post -Uri "http://localhost:3007/api/campaigns/$cid/cancel" -Headers @{ Authorization="Bearer $jwt" }
```

## Sequencer Worker
Queues
- `schedule-campaign` — computes `next_step_at` for contacts and marks them scheduled
- `send-email` — renders and sends (placeholder), advances step index

Run locally (separate terminal):
```bash
npm run build
node dist/workers/sequencer.js
```

Idempotency
- Jobs table has unique `idempotency_key`. Launch enqueues `schedule:${campaign_id}` once.

Test quickly
- Launch a campaign → observe worker logs; contacts get `scheduled` with `next_step_at`.

## SMTP & Rendering
- Rendering: Handlebars templates support {user, company, contact, campaign, step}
- Headers: List-Unsubscribe added (mailto + https link)
- Optional tracking pixel enabled by `FEATURE_TRACKING_PIXEL=true`

Local SMTP (ethereal or real):
1) Create an email account in the app with valid SMTP.
2) Ensure at least one step has a From account.
3) Launch campaign with worker running; see outbound rows in `messages` and `events` with type `sent` or `failed`.

Curl test to force send-email job (advanced):
```sql
-- enqueue a send-email job manually
INSERT INTO jobs(queue,payload,idempotency_key) VALUES ('send-email', '{"campaign_id":1,"contact_id":101,"step_index":0}', '1:101:0');
```

Unsubscribe
- Worker injects List-Unsubscribe with mailto and `GET /api/unsubscribe/:token`.
- To test manually:
```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3007/api/unsubscribe/TOKEN_HERE"
```


