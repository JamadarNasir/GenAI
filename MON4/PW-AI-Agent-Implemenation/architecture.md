# AI Test Automation Agent — Architecture & Folder Structure

> **Stack:** React 18 · Node.js + Express · Playwright + TypeScript · Cucumber.js · Playwright MCP · Allure Reports · OpenAI / Azure OpenAI / Ollama

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [High-Level Data Flow](#2-high-level-data-flow)
3. [Playwright MCP Integration](#3-playwright-mcp-integration)
4. [4-Tier Smart Locator Resolution](#4-4-tier-smart-locator-resolution)
5. [Project Folder Structure](#5-project-folder-structure)
6. [Frontend Structure](#6-frontend-structure)
7. [Backend Structure](#7-backend-structure)
8. [Automation Engine Structure](#8-automation-engine-structure)
9. [AI / LLM Layer](#9-ai--llm-layer)
10. [Reporting Structure](#10-reporting-structure)
11. [Component Responsibilities](#11-component-responsibilities)
12. [API Reference](#12-api-reference)
13. [Key Design Decisions](#13-key-design-decisions)

---

## 1. System Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                            │
│                React 18 + Vite + Tailwind CSS                │
│                                                              │
│  CSV Upload │ BDD Preview │ Code Viewer │ Run Dashboard      │
│             │ Live Logs   │ Allure Link │ Pipeline Context    │
└──────────────────────┬───────────────────────────────────────┘
                       │  REST / WebSocket
┌──────────────────────▼───────────────────────────────────────┐
│                    BACKEND LAYER                             │
│                Node.js + Express.js + TypeScript             │
│                                                              │
│  /api/upload        →  CSV Parser & Validator               │
│  /api/generate-bdd  →  LLM BDD Generator                   │
│  /api/generate-code →  Playwright Code Generator            │
│                        + Smart Locator Template Engine       │
│  /api/run           →  Playwright Execution Engine          │
│  /api/heal          →  AI Self-Heal Engine                  │
│  /api/report        →  Allure Report Publisher              │
│  /api/mcp/*         →  Playwright MCP Bridge                │
└──────────┬───────────────────────────┬───────────────────────┘
           │                           │
  ┌────────▼─────────┐    ┌───────────▼──────────────────────┐
  │   AI / LLM LAYER │    │   PLAYWRIGHT MCP SERVER          │
  │  OpenAI / Azure  │    │   @playwright/mcp (child proc)   │
  │  Ollama          │    │   JSON-RPC over stdio             │
  │                  │    │                                    │
  │  · BDD Gen       │    │   browser_navigate │ _click       │
  │  · Locator Res   │    │   browser_type │ _snapshot        │
  │  · Healing       │    │   browser_hover │ _screenshot     │
  └──────────────────┘    │   browser_tabs │ _evaluate        │
                          │   + 16 more tools                 │
                          └───────────┬──────────────────────┘
                                      │
┌─────────────────────────────────────▼────────────────────────┐
│                AUTOMATION ENGINE                              │
│           Playwright + TypeScript + Cucumber.js              │
│                                                               │
│  Chrome │ Firefox │ Edge  (headless / headed)                │
│                                                               │
│  Feature Files → Step Definitions → Page Objects → Hooks     │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │          4-TIER SMART LOCATOR RESOLUTION               │   │
│  │  Tier 1: Accessibility Snapshot (DOM walker)           │   │
│  │  Tier 2: Pattern-Based Resolution (7 strategies)       │   │
│  │  Tier 3: LLM Fallback (OpenAI/Azure/Ollama)           │   │
│  │  Tier 4: Healing / Auto-Repair + Static Fallback       │   │
│  └───────────────────────────────────────────────────────┘   │
│                       │                                       │
│                  Allure Results                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. High-Level Data Flow

```
[QA Engineer]
     │
     │  1. Upload CSV file via UI
     ▼
[Node.js Backend — CSV Parser & Validator]
     │  · Validates required headers
     │  · Normalizes rows into TestCase objects (in-memory)
     │
     │  2. Convert to BDD
     ▼
[LLM BDD Generator]
     │  · Sends test case context to OpenAI / Azure / Ollama
     │  · Receives Gherkin Feature files (in-memory string)
     │  · Falls back to template-based generation if LLM unavailable
     │
     │  3. Parse Steps → Action Model
     ▼
[Action Mapper + Step Parser]
     │  · Maps natural language steps to Playwright actions
     │  · click | fill | select | hover | assertVisible | assertText | goto | etc.
     │  · Extracts clean element names via extractTargetFromDescription()
     │
     │  4. Resolve Locators → Smart Locator Code
     ▼
[Locator Resolution Engine + Smart Locator Template]
     │  · Build-time: testId → role → label → text → css → xpath
     │  · Runtime: 4-Tier Smart Locator → Snapshot → Pattern → LLM → Heal
     │  · Generates smartClick(), smartFill(), smartAssertVisible() calls
     │
     │  5. Generate Playwright Code (writes 10+ files)
     ▼
[Code Generator — hooks-writer.service]
     │  · .feature files + step-definition .ts files + page objects
     │  · 6 support files:
     │    ├── hooks.ts, world.ts
     │    ├── accessibility-snapshot.ts, pattern-resolver.ts
     │    ├── llm-fallback-resolver.ts, smart-locator.ts
     │
     │  6. Execute Tests
     ▼
[Playwright + Cucumber Runner]
     │  · Child process with AI env vars passed through
     │  · Live stdout/stderr streamed via WebSocket
     │
     │  7. On Failure → 4-Tier Smart Locator or MCP Bridge
     ▼
[Smart Locator + Playwright MCP]
     │  · Pattern match → LLM fallback → Healing → Static fallback
     │  · Or: MCP snapshot → ref resolution → action execution
     │
     │  8. Publish Report
     ▼
[Allure Report Generator]  →  [QA views Allure Dashboard]
```

---

## 3. Playwright MCP Integration

The backend integrates **Playwright MCP (Model Context Protocol)** as a browser automation server. Instead of using Playwright as a library, it **spawns `@playwright/mcp` as a child process** and communicates via **JSON-RPC 2.0 over stdio**.

### Connection Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. POST /api/mcp/connect                                   │
│     └─→ spawn('npx', ['@playwright/mcp@latest'])            │
│                                                              │
│  2. JSON-RPC handshake over stdin/stdout                    │
│     └─→ initialize → notifications/initialized              │
│                                                              │
│  3. Discover tools                                          │
│     └─→ tools/list → 24 browser tools                       │
│                                                              │
│  4. Execute tools via HTTP API                              │
│     └─→ POST /api/mcp/execute { tool, args }               │
│     └─→ or convenience: /api/mcp/click, /navigate, etc.     │
│                                                              │
│  5. POST /api/mcp/disconnect                                │
│     └─→ kill child process                                   │
└─────────────────────────────────────────────────────────────┘
```

### Architecture Layers

```
┌──────────────────────────────────────────────────────┐
│  API Layer (Express controllers)                     │
│  mcp.controller.ts — HTTP handlers                   │
│  mcp.routes.ts — route definitions                   │
├──────────────────────────────────────────────────────┤
│  Service Layer                                       │
│  mcp-init.service.ts — registration + connect/       │
│    disconnect helpers                                │
├──────────────────────────────────────────────────────┤
│  Infrastructure Layer (MCP clients)                  │
│  IMcpClient — interface for ANY MCP server           │
│  McpClientFactory — singleton factory                │
│  RealPlaywrightMcpClient — real child process        │
│  PlaywrightMcpClient — mock for dev/testing          │
│  Individual tool wrappers (one file per tool)        │
├──────────────────────────────────────────────────────┤
│  Domain Layer (Pure models)                          │
│  McpToolDefinition, McpToolResult, McpContentBlock   │
└──────────────────────────────────────────────────────┘
```

### Available MCP Tools (24)

| MCP Tool Name | Description |
|---|---|
| `browser_navigate` | Navigate to a URL |
| `browser_navigate_back` | Go back in history |
| `browser_navigate_forward` | Go forward in history |
| `browser_click` | Click an element (by `element` + `ref` from snapshot) |
| `browser_type` | Type text into an input |
| `browser_snapshot` | Get the accessibility tree (for locator resolution) |
| `browser_take_screenshot` | Capture a screenshot |
| `browser_press_key` | Press a keyboard key |
| `browser_hover` | Hover over an element |
| `browser_drag` | Drag and drop between elements |
| `browser_select_option` | Select a dropdown option |
| `browser_fill_form` | Fill multiple form fields |
| `browser_handle_dialog` | Accept/dismiss dialogs |
| `browser_file_upload` | Upload files |
| `browser_evaluate` | Run JavaScript on the page |
| `browser_wait_for` | Wait for text/time/conditions |
| `browser_tabs` | List/create/close/select tabs |
| `browser_resize` | Resize the browser window |
| `browser_console_messages` | Get console logs |
| `browser_network_requests` | Get network activity |
| `browser_close` | Close the browser |
| `browser_install` | Install the browser binary |
| `browser_pdf_save` | Save page as PDF |
| `browser_add_cookies` | Add cookies |

### Snapshot → Element Ref Workflow

This is the core MCP locator resolution pattern:

```
1. Call browser_snapshot → get accessibility tree (roles, names, refs)
2. Search the tree for the target element (by role, name, text)
3. Extract the ref value from the matching node
4. Pass ref + element description to action tools (browser_click, browser_type, etc.)
```

If pattern matching fails, the system falls back to an **LLM** to analyze the snapshot and identify the correct element.

### Environment Variables

| Variable | Value | Purpose |
|---|---|---|
| `MCP_PLAYWRIGHT_ENABLED` | `true` / `false` | Enable the MCP Playwright integration |
| `USE_REAL_MCP` | `true` / `false` | Toggle real (spawned process) vs mock client |

---

## 4. 4-Tier Smart Locator Resolution

At **code generation time**, the backend generates `smartClick()`, `smartFill()`, etc. calls with search criteria. At **runtime**, these trigger a 4-tier resolution cascade:

```
┌─────────────────────────────────────────────────┐
│ TIER 1: Accessibility Snapshot                   │  accessibility-snapshot.ts
│ • page.evaluate() DOM walker                     │
│ • Builds AXNode tree (role, name, value, states) │
│ • flattenTree() for search, text for LLM prompt  │
└───────────────────┬─────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────┐
│ TIER 2: Pattern-Based Resolution                 │  pattern-resolver.ts
│ 7 strategies (NO API calls — instant):           │
│  1. getByTestId    5. getByPlaceholder           │
│  2. getByRole+name (exact)  6. getByText         │
│  3. getByRole+name (partial) 7. inferred role    │
│  4. getByLabel                                    │
│ Validates: element exists + isVisible()          │
└───────────────────┬─────────────────────────────┘
                    │ Failed?
                    ▼
┌─────────────────────────────────────────────────┐
│ TIER 3: LLM Fallback Resolution                 │  llm-fallback-resolver.ts
│ • Sends snapshot + criteria to OpenAI/Azure/Ollama│
│ • Parses: { locatorCode, confidence, alternatives }│
│ • eval() → Playwright Locator → validate         │
│ • Tries alternatives if primary fails             │
└───────────────────┬─────────────────────────────┘
                    │ Failed?
                    ▼
┌─────────────────────────────────────────────────┐
│ TIER 4: Healing / Auto-Repair                    │  smart-locator.ts
│ • a11y tree + raw outerHTML → healing prompt     │
│ • CSS selector suggestions when semantic fails   │
│ • buildHealPrompt() with error context           │
└───────────────────┬─────────────────────────────┘
                    │ Still failed?
                    ▼
┌─────────────────────────────────────────────────┐
│ STATIC FALLBACK (last resort)                    │
│ • page.getByText(name) or getByRole(role, name) │
│ • confidence: 0.3 — logged as warning            │
└─────────────────────────────────────────────────┘
```

### Smart Locator Helper Functions

| Function | Description |
|---|---|
| `smartLocate(page, criteria, action)` | Resolve a Playwright `Locator` via the 4-tier cascade |
| `smartClick(page, criteria)` | Locate + click |
| `smartFill(page, criteria, value)` | Locate + fill |
| `smartAssertVisible(page, criteria)` | Locate + assert visible |
| `smartAssertText(page, criteria, expected)` | Locate + assert text content |

---

## 5. Project Folder Structure

```
PW-AI-Agent-Implemenation/
│
├── frontend/                         # React 18 + Vite + Tailwind CSS
│   ├── public/
│   │   └── sample-tests.csv
│   └── src/
│       ├── App.tsx, index.tsx, index.css
│       ├── pages/                     # 5 route pages (Upload, BDD, Code, Run, Reports)
│       ├── components/layout/         # Sidebar, Header, Layout
│       ├── context/                   # PipelineContext (global state + localStorage)
│       ├── hooks/                     # useUpload, useExecution, useWebSocket
│       └── services/                  # API clients (6 service files)
│
├── backend/                          # Node.js + Express API server
│   ├── src/
│   │   ├── app.ts, index.ts
│   │   ├── routes/                   # 7 API route files (incl. mcp.routes)
│   │   ├── controllers/              # 7 request handlers (incl. mcp.controller)
│   │   ├── services/                 # csv, bdd, codegen, execution, heal, report, mcp-init
│   │   ├── infrastructure/           # ★ MCP client infrastructure
│   │   │   └── mcp/
│   │   │       ├── common/           # IMcpClient, McpClientFactory
│   │   │       └── playwright/       # Real + Mock clients, 15 tool wrappers
│   │   ├── actions/                  # Action registry + NL mapper
│   │   ├── templates/                # Code gen templates (5 files incl. smart-locator)
│   │   ├── middleware/               # Error handler, logger, CORS
│   │   ├── websocket/                # Live log streaming
│   │   ├── config/                   # Typed env config
│   │   └── types/                    # TypeScript type definitions
│   └── package.json
│
├── automation/                       # Playwright + Cucumber.js test engine
│   ├── tests/
│   │   ├── features/                 # Generated .feature files
│   │   ├── step-definitions/         # Generated step defs (smart locator imports)
│   │   ├── pages/                    # Generated page objects + BasePage
│   │   └── support/                  # 7 support files (hooks, world, smart locator suite)
│   ├── allure-results/
│   ├── allure-report/
│   ├── playwright.config.ts
│   ├── cucumber.config.js
│   └── tsconfig.json
│
├── ai/                               # LLM abstraction layer
│   ├── providers/                    # OpenAI, Azure, Ollama
│   ├── prompts/                      # System prompts & few-shot examples
│   ├── ai-client.ts, ai-client.factory.ts
│   └── index.ts
│
├── architecture.md                   # This file
├── todo.md                           # Implementation plan
├── README.md                         # Setup & usage guide
├── NewRequirment.md                  # Playwright MCP requirements spec
├── docker-compose.yml
└── package.json                      # Root workspace scripts
```

---

## 6. Frontend Structure

```
frontend/src/
├── index.tsx                         # Entry point
├── App.tsx                           # React Router — 5 routes
├── index.css                         # Tailwind imports
│
├── pages/
│   ├── Upload/index.tsx              # CSV drag-and-drop + parsed table preview
│   ├── BDDPreview/index.tsx          # Generated Gherkin feature viewer
│   ├── CodeViewer/index.tsx          # Syntax-highlighted TS code + file tree
│   ├── Execution/index.tsx           # Run controls + live WebSocket log stream
│   └── Reports/index.tsx             # Allure report iframe + run history
│
├── components/layout/
│   ├── Sidebar.tsx                   # Left nav (w-48): Upload → BDD → Code → Run → Reports
│   ├── Header.tsx                    # Top header bar
│   └── Layout.tsx                    # Wraps pages with sidebar + header
│
├── context/
│   └── PipelineContext.tsx            # Global pipeline state + localStorage persistence
│
├── hooks/
│   ├── useUpload.ts                  # CSV upload state & POST /api/upload
│   ├── useExecution.ts               # Trigger run, poll status
│   └── useWebSocket.ts              # Live log streaming hook
│
└── services/
    ├── api.ts                        # Axios base instance (VITE_API_URL)
    ├── csvService.ts                 # POST /api/upload
    ├── bddService.ts                # POST /api/generate-bdd
    ├── codeService.ts               # POST /api/generate-code
    ├── executionService.ts          # POST /api/run
    └── reportService.ts             # GET /api/report
```

> Each page is self-contained — sub-components (table previews, log panels, run controls) are inline within each page file.

---

## 7. Backend Structure

```
backend/src/
├── index.ts                          # Server entry: HTTP + WebSocket + AI + MCP init
├── app.ts                            # Express: CORS, routes (7 route files), middleware
│
├── routes/
│   ├── upload.routes.ts              # POST /api/upload
│   ├── bdd.routes.ts                # POST /api/generate-bdd
│   ├── code.routes.ts               # POST /api/generate-code
│   ├── run.routes.ts                # POST|GET /api/run, POST /api/run/stop
│   ├── heal.routes.ts               # POST /api/heal
│   ├── report.routes.ts             # GET /api/report, POST /api/report/generate
│   └── mcp.routes.ts                # ★ POST /api/mcp/connect|disconnect|execute|...
│
├── controllers/
│   ├── upload.controller.ts
│   ├── bdd.controller.ts
│   ├── code.controller.ts
│   ├── run.controller.ts
│   ├── heal.controller.ts
│   ├── report.controller.ts
│   └── mcp.controller.ts            # ★ 10 MCP handlers (connect, disconnect, status, etc.)
│
├── services/
│   ├── ai-init.service.ts            # AI client init bridge
│   ├── mcp-init.service.ts           # ★ MCP client registration + connect/disconnect helpers
│   │
│   ├── csv/                          # CSV parser + validator
│   ├── bdd/                          # BDD generator, Gherkin builder, tag mapper
│   ├── codegen/                      # Code generator, step parser, locator resolver,
│   │                                  #   step-def writer, page-object writer, hooks writer,
│   │                                  #   feature writer
│   ├── execution/                    # Runner, browser config, artifact collector
│   ├── heal/                         # Heal orchestrator, DOM snapshot, failure analyzer,
│   │                                  #   locator healer, retry runner
│   └── report/                       # Allure generator + server
│
├── infrastructure/                   # ★ MCP (Model Context Protocol) layer
│   └── mcp/
│       ├── common/
│       │   ├── McpClient.interface.ts    # IMcpClient — generic for ANY MCP server
│       │   ├── McpClientFactory.ts       # Singleton factory — register + get by type
│       │   └── index.ts
│       │
│       └── playwright/
│           ├── RealPlaywrightMcpClient.ts  # ★ Spawns @playwright/mcp, JSON-RPC over stdio
│           ├── PlaywrightMcpClient.ts      # Mock client for dev/testing
│           ├── index.ts
│           └── tools/                      # One file per tool wrapper
│               ├── BaseTool.ts             # Abstract base: toolName + execute(params)
│               ├── NavigateTool.ts         # browser_navigate, _back, _forward
│               ├── ClickTool.ts            # browser_click
│               ├── TypeTool.ts             # browser_type
│               ├── SnapshotTool.ts         # browser_snapshot (most important!)
│               ├── ScreenshotTool.ts       # browser_take_screenshot
│               ├── HoverTool.ts            # browser_hover
│               ├── DragTool.ts             # browser_drag
│               ├── SelectOptionTool.ts     # browser_select_option
│               ├── FillFormTool.ts         # browser_fill_form
│               ├── PressKeyTool.ts         # browser_press_key
│               ├── HandleDialogTool.ts     # browser_handle_dialog
│               ├── FileUploadTool.ts       # browser_file_upload
│               ├── EvaluateTool.ts         # browser_evaluate
│               ├── WaitForTool.ts          # browser_wait_for
│               ├── TabsTool.ts             # browser_tabs
│               ├── ResizeTool.ts           # browser_resize
│               ├── BrowserUtilTools.ts     # console, network, close, install
│               └── index.ts
│
├── actions/                          # Action registry + NL mapper
│
├── templates/                        # Code generation templates
│   ├── step-definition.template.ts   # Step def (smart locator imports)
│   ├── page-object.template.ts       # Page object (smart methods)
│   ├── hooks.template.ts             # Hooks + World + BasePage
│   ├── feature.template.ts           # Fallback Gherkin template
│   └── smart-locator.template.ts     # ★ 4 runtime files (1100+ lines)
│
├── middleware/                       # Error handler, logger, CORS
├── websocket/                        # Live log streaming
├── config/                           # Typed env config (incl. MCP vars)
└── types/                            # TypeScript type definitions
```

### Code Generation Pipeline

When `/api/generate-code` is called, `hooks-writer.service.ts` writes **6 support files** to `automation/tests/support/`:

| # | File | Generated By | Purpose |
|---|---|---|---|
| 1 | `hooks.ts` | `hooks.template.ts` | Cucumber Before/After, browser lifecycle, failure artifacts |
| 2 | `world.ts` | `hooks.template.ts` | PlaywrightWorld + ResolutionStats |
| 3 | `accessibility-snapshot.ts` | `smart-locator.template.ts` | Tier 1: DOM walker via page.evaluate() |
| 4 | `pattern-resolver.ts` | `smart-locator.template.ts` | Tier 2: 7-strategy pattern matching |
| 5 | `llm-fallback-resolver.ts` | `smart-locator.template.ts` | Tier 3: LLM API call |
| 6 | `smart-locator.ts` | `smart-locator.template.ts` | Tier 4: Orchestrator + helpers |

---

## 8. Automation Engine Structure

```
automation/
├── tests/
│   ├── features/                     # Generated .feature files
│   ├── step-definitions/             # Generated step defs (smart locator imports)
│   ├── pages/                        # Generated page objects + BasePage
│   └── support/                      # ★ 7 support files (auto-generated)
│       ├── hooks.ts                  # Cucumber hooks, browser lifecycle
│       ├── world.ts                  # PlaywrightWorld + ResolutionStats
│       ├── accessibility-snapshot.ts # Tier 1: DOM walker
│       ├── pattern-resolver.ts       # Tier 2: 7-strategy fast resolution
│       ├── llm-fallback-resolver.ts  # Tier 3: LLM call
│       ├── smart-locator.ts          # Tier 4: Orchestrator + smartClick/Fill/Assert
│       └── allure-reporter.ts        # Allure + Cucumber reporter
│
├── allure-results/                   # Raw test output
├── allure-report/                    # Generated HTML report
├── playwright.config.ts
├── cucumber.config.js
└── tsconfig.json                     # lib: ["ES2020", "DOM"]
```

---

## 9. AI / LLM Layer

```
ai/
├── index.ts                          # Barrel exports
├── ai-client.ts                      # Abstract AIClientProvider interface
├── ai-client.factory.ts              # Factory singleton
├── providers/
│   ├── openai.provider.ts            # OpenAI GPT-4o
│   ├── azure-openai.provider.ts      # Azure OpenAI
│   └── local-llm.provider.ts         # Ollama / self-hosted
└── prompts/
    ├── bdd-system-prompt.txt         # System prompt for BDD gen
    ├── bdd-few-shot.txt              # Few-shot examples
    ├── heal-system-prompt.txt        # System prompt for healing
    └── failure-context-builder.ts    # Build failure context for LLM
```

**AI is used in 3 places:**
1. **BDD Generation** (build-time): Convert CSV test cases → Gherkin
2. **Smart Locator LLM Fallback** (runtime): Tier 3 when pattern matching fails
3. **Self-Healing** (runtime): Repair broken locators with DOM context

---

## 10. Reporting Structure

```
automation/
├── allure-results/                   # cucumber-report.json, screenshots, videos
└── allure-report/                    # HTML report served via Express static
    ├── index.html
    ├── summary.json
    └── data/
```

---

## 11. Component Responsibilities

| Component | Technology | Responsibility |
|---|---|---|
| **Frontend** | React 18 + Vite + Tailwind | Upload CSV, preview BDD/code, trigger runs, view live logs, Allure report |
| **Pipeline Context** | React Context + localStorage | Persist pipeline state across page navigations |
| **Backend API** | Node.js + Express + TypeScript | Parse CSV, call LLM, generate code, spawn Playwright, serve report |
| **MCP Bridge** | `@modelcontextprotocol/sdk` | Spawn `@playwright/mcp`, JSON-RPC communication, tool execution |
| **MCP Factory** | TypeScript (infrastructure) | Interface-driven client creation, mock vs real toggle |
| **CSV Parser** | csv-parse | Validate & normalize CSV → `TestCase[]` |
| **BDD Generator** | Node.js + LLM | Convert test cases → Gherkin features (with template fallback) |
| **Code Generator** | Node.js + Templates | Write step defs, page objects, hooks + 4 smart locator files |
| **Smart Locator** | TypeScript (1100+ lines template) | Runtime 4-tier resolution: Snapshot → Pattern → LLM → Heal |
| **Execution Engine** | Playwright + Cucumber.js | Run tests on Chrome/Firefox/Edge with AI env passthrough |
| **Heal Engine** | Node.js + LLM | DOM snapshot → classify → LLM → healed locator → retry |
| **Report Service** | Allure CLI + Express | Generate & serve HTML reports |
| **AI Client** | OpenAI / Azure / Ollama | Unified LLM abstraction, provider swappable via `.env` |
| **WebSocket** | ws library | Stream live test runner output to frontend |

---

## 12. API Reference

| Endpoint | Method | Description | Request Body | Response |
|---|---|---|---|---|
| `/api/upload` | POST | Upload & parse CSV | `multipart/form-data` | `{ testCases }` |
| `/api/generate-bdd` | POST | Generate Gherkin features | `{ testCases }` | `{ features }` |
| `/api/generate-code` | POST | Generate Playwright code + smart locator | `{ features }` | `{ files, summary }` |
| `/api/run` | POST | Execute tests | `{ browser, tags, headless }` | `{ runId, status }` |
| `/api/run` | GET | Get run history | — | `Run[]` |
| `/api/run/:runId` | GET | Get execution status | — | `{ runId, status, results }` |
| `/api/run/stop` | POST | Stop running tests | — | `{ message }` |
| `/api/heal` | POST | Heal a failed locator | `{ error, oldLocator, stepText, dom }` | `{ healed, newLocator }` |
| `/api/report` | GET | Get Allure report status | — | `{ exists, url }` |
| `/api/report/generate` | POST | Generate Allure report | — | `{ reportUrl }` |
| `/api/mcp/connect` | POST | Connect to Playwright MCP server | — | `{ mode, toolCount }` |
| `/api/mcp/disconnect` | POST | Disconnect from MCP server | — | `{ message }` |
| `/api/mcp/status` | GET | Get MCP connection status | — | `{ enabled, connected, mode }` |
| `/api/mcp/tools` | GET | List available MCP tools | — | `{ tools }` |
| `/api/mcp/execute` | POST | Execute any MCP tool | `{ tool, args }` | `{ tool, result }` |
| `/api/mcp/snapshot` | POST | Get accessibility snapshot | — | `{ snapshot }` |
| `/api/mcp/navigate` | POST | Navigate browser | `{ url }` | `{ result }` |
| `/api/mcp/click` | POST | Click element | `{ element, ref }` | `{ result }` |
| `/api/mcp/type` | POST | Type into element | `{ element, ref, text }` | `{ result }` |
| `/api/mcp/screenshot` | POST | Take screenshot | `{ fullPage?, ref? }` | `{ result }` |

---

## 13. Key Design Decisions

### Stateless Backend — No Database

All state is in-memory or local filesystem. Generated code → `automation/tests/`, Allure results → `automation/allure-results/`.

### Playwright MCP — JSON-RPC over Stdio

Instead of importing Playwright as a library in the backend, we spawn `@playwright/mcp` as a child process and communicate via standardized JSON-RPC 2.0. This gives us:
- **Decoupled browser lifecycle** — browser runs in a separate process
- **Standard protocol** — any MCP-compatible client can connect
- **Tool discovery** — 24 tools auto-discovered via `tools/list`
- **Mock mode** — develop/test without a real browser

### Interface-Driven MCP Architecture

`IMcpClient` defines `connect()`, `disconnect()`, `executeTool()`, `listTools()`, `isConnected()`. Any MCP server plugs in by implementing this interface. `McpClientFactory` manages instances by type.

### 4-Tier Smart Locator — Runtime Resolution

Generated code emits `smartClick(criteria)` → runtime resolves dynamically through 4 tiers. Pattern matching handles 95% of cases without API calls. LLM is only used as fallback.

### AI Env Var Passthrough

`browser-config.service.ts` passes `OPENAI_API_KEY`, `AI_PROVIDER`, `AZURE_*`, `LOCAL_LLM_*` to the Cucumber child process for runtime smart locator LLM calls.

---

## Environment Variables

```env
# Backend Server
PORT=4000
NODE_ENV=development

# Frontend (Vite)
VITE_API_URL=http://localhost:4000

# AI Provider
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# Azure OpenAI (alternative)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_KEY=...
AZURE_OPENAI_DEPLOYMENT=gpt-4o

# Local LLM (alternative)
LOCAL_LLM_URL=http://localhost:11434
LOCAL_LLM_MODEL=llama3

# Playwright MCP
MCP_PLAYWRIGHT_ENABLED=true
USE_REAL_MCP=false

# Test Execution
BASE_URL=https://your-app-under-test.com
DEFAULT_BROWSER=chromium
HEADLESS=true
PARALLEL_WORKERS=4
```

---

*Architecture v3.0 — React 18 + Node.js + Playwright MCP + 4-Tier Smart Locator · No Database*
