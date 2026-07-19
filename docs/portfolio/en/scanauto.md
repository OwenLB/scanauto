---
title: 'ScanAuto'
type: "Personal Project"
description: "AI-powered used-car analysis SaaS — multi-step Claude pipeline with SSE streaming, Supabase auth, BYOK encryption, and a Chrome extension."
git: [ "GitHub", "https://github.com/OwenLB/ScanAuto" ]
web: [ "scanauto.netlify.app", "https://scanauto.netlify.app" ]
stack: [
  "React 18",
  "Vite",
  "Tailwind CSS",
  "Django 4.2",
  "Django REST Framework",
  "Anthropic Claude API",
  "Supabase",
  "SSE",
  "Python Threading",
  "Firecrawl",
  "Chrome Extension MV3",
  "Gunicorn",
  "Netlify",
  "Render"
]
---

## Context

ScanAuto is a full-stack SaaS application that generates comprehensive analysis reports for used-car listings. The user pastes a URL or raw text — from leboncoin, lacentrale, or AutoScout24 — and receives within 60 seconds: a global score, engine reliability analysis, 5-year cost projection, and a data-backed negotiation strategy. The project was born from a simple observation: private buyers have no tooling to quickly assess whether a listing is honest or a trap.

## Stack & Architecture

- **React 18 + Vite** — SPA with hash-based routing (no server required), lazy-loaded pages, `useReducer` for analysis state management. Vite was chosen for its fast dev server and straightforward config compared to CRA.
- **Tailwind CSS 3 + CSS variables** — Monochrome color system defined as CSS variables (`--bg`, `--surface`, `--accent`…), dark/light switchable without JavaScript. Typography: Space Grotesk (display) + Inter (body).
- **Django 4.2 + DRF** — Stateless backend: no local database (`DATABASES = {}`), no migrations. Deliberate choice for a backend focused purely on API orchestration.
- **Supabase** — JWT auth + PostgreSQL with RLS (Row-Level Security). Every table filters on `user_id = auth.uid()` at the database layer — user isolation without application-level logic.
- **Anthropic Claude API (anthropic==0.40.0)** — Haiku 4.5 for fast/simpler steps (extraction, negotiation, practical info), Sonnet 4.6 for analytical depth (scoring, maintenance costs). Ephemeral prompt caching on all system prompts.
- **Firecrawl** — Markdown extraction from listing URLs. Handles anti-bot protections without manual HTML parsing; the resulting Markdown is injected directly into Claude.
- **Gunicorn** — 2 workers, 4 threads, 300s timeout for long SSE streams.
- **Chrome Extension MV3** — Content script on leboncoin.fr, side panel, service worker. No build step — plain JavaScript.

## Notable Technical Points

- **5-step pipeline with Python parallelism**: R1 (extraction) → R2+R5 in parallel via `threading.Thread` + `Queue` (scoring + practical info) → R3 (maintenance costs) → R4 (negotiation). Python's GIL doesn't block network I/O: the gain is real (~30% reduction in total pipeline time).

- **Server-side computations before any LLM call**: `km_per_year`, `vehicle_age`, `market_positioning_percentage`, kilometer projections at 2 and 5 years — all computed in Python and injected as immutable facts into the prompts. Eliminates LLM arithmetic errors on financially critical values.

- **Progressive SSE streaming**: each completed step emits an `event: r1|r2|…|complete` via SSE. The frontend dispatches each event into a reducer and reveals report sections incrementally. The user watches the report build in real time without waiting for the full pipeline.

- **Context slimming for R3 and R4**: these steps receive only the relevant fields from R1/R2 (not the full JSON), preventing token bloat on Sonnet. The savings are approximately 30–40% of input tokens on those two calls.

- **Encrypted BYOK (Bring Your Own Key)**: users' Anthropic keys are encrypted server-side with Fernet (Python `cryptography` lib), decrypted in memory only at call time. The backend never persists the key in plaintext; users keep full control over their quotas.

- **Chrome Extension MV3 — JSON-LD extraction**: the content script parses `@type:Vehicle` JSON-LD on leboncoin.fr first (reliable structured data), with 4 DOM fallback strategies for fields absent from JSON-LD (criteria, photos, description). Data flows through `chrome.storage.session` to the side panel, then to the app via URL prefill (`#/?prefill=<JSON>`).

- **Graceful degradation**: R3 and R4 can fail (timeout, API error) without blocking the report. The frontend displays a localized error state on the affected section; all previously completed sections remain visible.

## What I Built / Learned

The core challenge was designing the orchestration pipeline: managing step dependencies, controlled parallelism, timeouts, and partial error propagation — all while maintaining smooth client-side streaming. This forced me to treat each prompt as a contractual interface: strict inputs, schematized JSON outputs, explicit business rules to prevent hallucinations on financial data.

---

## Diagrams

### Global Architecture

```mermaid
graph TD
    U[User] -->|URL or text| FE[Frontend React\nNetlify]
    FE -->|POST /api/analyze/ SSE| BE[Backend Django\nRender / Railway]
    FE -->|JWT Auth| SB[(Supabase\nPostgreSQL + Auth)]
    BE -->|supabase.auth.get_user| SB
    BE -->|Save analyses| SB
    BE -->|URL scraping| FC[Firecrawl API]
    BE -->|R1 Haiku 4.5| CA[Claude API\nAnthropic]
    BE -->|R2 Sonnet 4.6| CA
    BE -->|R3 Sonnet 4.6| CA
    BE -->|R4 Haiku 4.5| CA
    BE -->|R5 Haiku 4.5| CA
    EXT[Chrome Extension MV3\nleboncoin.fr] -->|prefill URL| FE
```

---

### Analysis Pipeline (Sequence)

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant BE as Django
    participant CA as Claude API
    participant SB as Supabase

    FE->>BE: POST /api/analyze/ (vehicle JSON)
    BE->>SB: create_analysis(user_id) → analysis_id
    BE->>CA: R1 — Haiku 4.5 (extraction)
    CA-->>BE: r1 JSON
    BE-->>FE: SSE event:r1
    BE->>SB: save r1

    par Parallel
        BE->>CA: R2 — Sonnet 4.6 (scoring)
        BE->>CA: R5 — Haiku 4.5 (practical info)
    end
    CA-->>BE: r2 JSON
    BE-->>FE: SSE event:r2
    CA-->>BE: r5 JSON
    BE-->>FE: SSE event:r5
    BE->>SB: save r2 + r5

    BE->>CA: R3 — Sonnet 4.6 (costs, slim context)
    CA-->>BE: r3 JSON
    BE-->>FE: SSE event:r3

    BE->>CA: R4 — Haiku 4.5 (negotiation, slim context)
    CA-->>BE: r4 JSON
    BE-->>FE: SSE event:r4
    BE->>SB: save r3 + r4 + status:complete
    BE-->>FE: SSE event:complete
```

---

### Chrome Extension → App Flow

```mermaid
flowchart LR
    A[leboncoin.fr/listing] -->|content.js runs| B[Parse JSON-LD\n+ DOM fallbacks]
    B --> C[chrome.storage.session]
    C -->|icon click| D[Side Panel\nsidepanel.js]
    D -->|Analyze| E[Open ScanAuto\n#/?prefill=JSON]
    E -->|VehicleForm mount| F[Pre-fill form]
    F -->|Submit| G[POST /api/analyze/]
```

---

### Model Selection per Step

```mermaid
graph LR
    R1["R1 — Extraction\nHaiku 4.5\n~1,500 tokens"] --> R2
    R1 --> R5
    R2["R2 — Scoring + Reliability\nSonnet 4.6\n~2,000 tokens"] --> R3
    R5["R5 — Practical Info\nHaiku 4.5\n~1,000 tokens"] --> R3
    R3["R3 — Maintenance Costs\nSonnet 4.6\n~3,000 tokens"] --> R4
    R4["R4 — Negotiation\nHaiku 4.5\n~1,500 tokens"]

    style R2 fill:#1a1a1a,color:#f2f2f2
    style R3 fill:#1a1a1a,color:#f2f2f2
```

---

### Frontend State Machine (Reducer)

```mermaid
stateDiagram-v2
    [*] --> idle
    idle --> loading : START
    loading --> loading : R1 / R2 / R3 / R4 / R5\n(sections revealed progressively)
    loading --> complete : COMPLETE
    loading --> error : ERROR (fatal)
    loading --> loading : error_r3 / error_r4\n(graceful degradation)
    complete --> idle : RESET
    error --> idle : RESET
```

---

### BYOK Security Architecture

```mermaid
flowchart TD
    U[User] -->|Enters Anthropic key| FE[Frontend]
    FE -->|HTTPS POST| BE[Django]
    BE -->|Fernet.encrypt| ENC[Encrypted key]
    ENC -->|Stored in| SB[(Supabase\nuser_profiles)]
    BE2[analyze request] -->|Fernet.decrypt\nin memory only| KEY[Plaintext key]
    KEY -->|anthropic.Anthropic client| CA[Claude API]
    KEY -.->|never logged\nnever persisted in plaintext| X[ ]
    SB -->|RLS: user_id = auth.uid| PRIV[Full per-user\nisolation]
```
