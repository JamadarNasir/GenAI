# AI Test Automation Agent — Implementation Plan

> **Status Legend:** ✅ Done · 🟡 In Progress · ⬜ Not Started

---

## Phase 1: Backend Foundation (Node.js + Express + TypeScript) ✅

- [x] Initialize `backend/` project with TypeScript
- [x] Install core dependencies: `express`, `cors`, `dotenv`, `morgan`, `multer`, `csv-parse`, `ws`
- [x] Create `tsconfig.json`, `nodemon.json` for dev auto-reload
- [x] Create `backend/src/config/env.config.ts` — typed env variables with dotenv
- [x] Create `backend/src/app.ts` — Express setup: JSON body parser, CORS, morgan, route mounting
- [x] Create `backend/src/index.ts` — Server entry point + WebSocket init + AI init + MCP init
- [x] Create middleware: error handler, logger, CORS
- [x] Create type definitions: test-case, bdd, action, execution types
- [x] Create 7 route files (upload, bdd, code, run, heal, report, mcp)
- [x] Create 7 controller files (upload, bdd, code, run, heal, report, mcp)
- [x] Verify server starts on port 4000

---

## Phase 2: CSV Upload & Parsing Service ✅

- [x] Implement `csv-validator.service.ts` — validate required headers
- [x] Implement `csv-parser.service.ts` — parse CSV buffer → `TestCase[]`
- [x] Implement `upload.controller.ts` — accept multipart/form-data, validate, parse, respond
- [x] Wire up `upload.routes.ts` → controller
- [x] Test with sample CSV file

---

## Phase 3: AI / LLM Layer ✅

- [x] Create `ai/ai-client.ts` — abstract provider interface (`generateCompletion`, `generateJSON`)
- [x] Create `ai/providers/openai.provider.ts` — OpenAI GPT-4o
- [x] Create `ai/providers/azure-openai.provider.ts` — Azure OpenAI
- [x] Create `ai/providers/local-llm.provider.ts` — Ollama / self-hosted
- [x] Create `ai/ai-client.factory.ts` — factory picking provider from `AI_PROVIDER` env
- [x] Create `ai/index.ts` — barrel exports
- [x] Create prompt templates: bdd-system-prompt, bdd-few-shot, heal-system-prompt, failure-context-builder
- [x] Create `backend/src/services/ai-init.service.ts` — AI client init bridge

---

## Phase 4: BDD Generation Service ✅

- [x] Implement `tag-mapper.service.ts` — priority → @smoke / @regression tags
- [x] Implement `gherkin-builder.service.ts` — assemble Feature/Scenario syntax
- [x] Implement `bdd-generator.service.ts` — orchestrate LLM → Gherkin
- [x] Implement `bdd.controller.ts` — accept testCases, return features
- [x] Create `feature.template.ts` — fallback Gherkin template when LLM unavailable
- [x] Test: CSV upload → BDD generation end-to-end

---

## Phase 5: Code Generation Service ✅

- [x] Implement `action-registry.ts` + `action-mapper.ts` — supported Playwright actions + NL mapping
- [x] Implement `step-parser.service.ts` — parse Gherkin steps → Action Models
- [x] Implement `locator-resolver.service.ts` — locator priority + `buildSearchCriteria()` + `extractTargetFromDescription()`
- [x] Implement `step-def-writer.service.ts` — generate step definition `.ts` files with smart locator imports
- [x] Implement `page-object-writer.service.ts` — generate Page Object `.ts` files with smart methods
- [x] Implement `hooks-writer.service.ts` — writes 6 support files to automation/tests/support/
- [x] Implement `feature-writer.service.ts` — write .feature files
- [x] Implement `code-generator.service.ts` — main orchestrator
- [x] Create templates:
  - [x] `step-definition.template.ts` (with smart locator imports)
  - [x] `page-object.template.ts` (with smartClick/Fill/Assert)
  - [x] `hooks.template.ts` (hooks + world + BasePage)
  - [x] `feature.template.ts` (fallback Gherkin)
  - [x] `smart-locator.template.ts` (★ 4-tier smart locator suite — 1100+ lines, generates 4 runtime files)
- [x] Test: BDD features → generated Playwright TypeScript files

---

## Phase 6: Automation Engine Setup (Playwright + Cucumber) ✅

- [x] Initialize `automation/` project
- [x] Install: `@playwright/test`, `@cucumber/cucumber`, `ts-node`, `typescript`
- [x] Install Allure: `allure-cucumberjs`
- [x] Create `tsconfig.json` — `lib: ["ES2020", "DOM"]` for page.evaluate() DOM types
- [x] Create `playwright.config.ts`, `cucumber.config.js`
- [x] Generated support files (7 total):
  - [x] `hooks.ts` — Before/After with multi-browser, a11y snapshot on failure
  - [x] `world.ts` — PlaywrightWorld + ResolutionStats interface
  - [x] `accessibility-snapshot.ts` — Tier 1: DOM walker via page.evaluate()
  - [x] `pattern-resolver.ts` — Tier 2: 7-strategy pattern matching
  - [x] `llm-fallback-resolver.ts` — Tier 3: LLM API call with error surfacing
  - [x] `smart-locator.ts` — Tier 4: Orchestrator + helper functions
  - [x] `allure-reporter.ts` — Allure + Cucumber wiring

---

## Phase 7: Test Execution Engine + WebSocket ✅

- [x] Implement `browser-config.service.ts` — browser config + AI env var passthrough to child process
- [x] Implement `runner.service.ts` — spawn Cucumber.js child process, capture stdout/stderr
- [x] Implement `artifact-collector.service.ts` — screenshots, videos, traces
- [x] Implement `log-stream.ws.ts` — WebSocket server on same HTTP server
- [x] Implement `run.controller.ts` — accept run config, spawn runner, return runId
- [x] Test: trigger run → see live log stream via WebSocket

---

## Phase 8: AI Self-Healing Engine ✅

- [x] Implement `dom-snapshot.service.ts` — capture DOM at failure point
- [x] Implement `failure-analyzer.service.ts` — classify: locator/timing/assertion
- [x] Implement `locator-healer.service.ts` — LLM call → new locator suggestion
- [x] Implement `retry-runner.service.ts` — re-execute with healed locator
- [x] Implement `heal-orchestrator.service.ts` — coordinate full heal workflow
- [x] Implement `heal.controller.ts` + `heal.routes.ts`
- [x] 4-Tier Smart Locator at runtime provides built-in healing (Tier 4)

---

## Phase 9: Allure Reporting Service ✅

- [x] Implement `allure-generator.service.ts` — run `allure generate` CLI
- [x] Implement `allure-server.service.ts` — serve report via Express static
- [x] Implement `report.controller.ts` + `report.routes.ts`
- [x] Serve allure-report/ at `/report` endpoint

---

## Phase 10: Frontend (React.js + Vite + Tailwind CSS) ✅

- [x] Initialize `frontend/` with Vite + React + TypeScript
- [x] Configure Tailwind CSS + vite.config.ts
- [x] Create layout components: Sidebar (w-48), Header, Layout
- [x] Create `PipelineContext.tsx` — global state + localStorage persistence
- [x] Create 6 API service files: csv, bdd, code, execution, report, api base
- [x] Create 3 custom hooks: useUpload, useExecution, useWebSocket
- [x] Create 5 pages:
  - [x] **Upload** — CSV drag-and-drop + parsed table preview
  - [x] **BDD Preview** — generated Gherkin feature viewer
  - [x] **Code Viewer** — syntax-highlighted TS code + file tree
  - [x] **Execution** — run controls + live WebSocket log stream
  - [x] **Reports** — Allure report iframe + run history
- [x] React Router setup in App.tsx with all 5 routes

---

## Phase 11: Integration & DevOps ✅

- [x] End-to-end flow: CSV → BDD → Code → Run → Heal → Report
- [x] Create `docker-compose.yml` — Frontend (nginx) + Backend containers
- [x] Create root `package.json` with workspace scripts
- [x] Create `.gitignore`
- [x] Write `README.md`, `architecture.md`, `todo.md`

---

## Phase 12: Playwright MCP Integration ✅

- [x] Install `@modelcontextprotocol/sdk` in backend
- [x] Create MCP common interface layer:
  - [x] `McpClient.interface.ts` — `IMcpClient` with connect/disconnect/executeTool/listTools
  - [x] `McpClientFactory.ts` — singleton factory (register + get by server type)
- [x] Create Playwright MCP clients:
  - [x] `RealPlaywrightMcpClient.ts` — spawns `@playwright/mcp` child process, JSON-RPC over stdio
  - [x] `PlaywrightMcpClient.ts` — mock client with 24 simulated tools for dev/testing
- [x] Create 15 tool wrappers (one file per tool or group):
  - [x] `BaseTool.ts` — abstract base class
  - [x] `NavigateTool.ts` — navigate, back, forward
  - [x] `ClickTool.ts` — click with button, modifiers
  - [x] `TypeTool.ts` — type text, submit, slowly
  - [x] `SnapshotTool.ts` — ★ accessibility tree (most important)
  - [x] `ScreenshotTool.ts` — capture with element/fullPage support
  - [x] `HoverTool.ts` — hover over element
  - [x] `DragTool.ts` — drag and drop
  - [x] `SelectOptionTool.ts` — dropdown selection
  - [x] `FillFormTool.ts` — fill multiple fields
  - [x] `PressKeyTool.ts` — keyboard key press
  - [x] `HandleDialogTool.ts` — accept/dismiss dialogs
  - [x] `FileUploadTool.ts` — file upload
  - [x] `EvaluateTool.ts` — run JavaScript
  - [x] `WaitForTool.ts` — wait for text/time
  - [x] `TabsTool.ts` — tab management
  - [x] `ResizeTool.ts` — resize browser
  - [x] `BrowserUtilTools.ts` — console, network, close, install
- [x] Create `mcp-init.service.ts` — register clients, connect/disconnect helpers
- [x] Create `mcp.controller.ts` — 10 HTTP handlers:
  - [x] POST /api/mcp/connect, /disconnect
  - [x] GET /api/mcp/status, /tools
  - [x] POST /api/mcp/execute (generic tool execution)
  - [x] POST /api/mcp/snapshot, /navigate, /click, /type, /screenshot
- [x] Create `mcp.routes.ts` — route definitions
- [x] Wire MCP routes into `app.ts`
- [x] Add MCP init to `index.ts` with graceful shutdown
- [x] Add `MCP_PLAYWRIGHT_ENABLED`, `USE_REAL_MCP` env vars to `env.config.ts`
- [x] TypeScript compilation passes with zero errors

---

## Bug Fixes Applied

| Issue | Root Cause | Fix |
|---|---|---|
| `page.accessibility` not on type `Page` | Removed from Playwright types | `page.evaluate()` DOM walker |
| `Cannot find name 'Element'` / `document` | Missing DOM lib | Added `"DOM"` to tsconfig lib |
| `HTMLCollection` not iterable | ES2020 target | `Array.from(el.children)` |
| LLM returns 0 chars silently | API error body swallowed | `if (json.error)` check + log |
| Full Gherkin step as element name | buildSearchCriteria fallback | `extractTargetFromDescription()` |
| `baseUrl` deprecation in TS 7.0 | Old tsconfig option | Removed baseUrl + paths |

---

## Implementation Order

```
Phase 1  →  Backend Foundation          ✅
Phase 2  →  CSV Upload & Parsing        ✅
Phase 3  →  AI / LLM Layer              ✅
Phase 4  →  BDD Generation              ✅
Phase 5  →  Code Generation             ✅ (incl. 4-tier smart locator template)
Phase 6  →  Automation Engine           ✅ (incl. 7 support files)
Phase 7  →  Execution Engine            ✅ (incl. AI env passthrough)
Phase 8  →  Self-Healing Engine         ✅ (incl. runtime healing in smart locator)
Phase 9  →  Allure Reporting            ✅
Phase 10 →  Frontend                    ✅ (5 pages, context, hooks, services)
Phase 11 →  Integration & DevOps        ✅ (Docker, root scripts)
Phase 12 →  Playwright MCP              ✅ (interface, factory, real+mock clients, 15 tools, API)
```

---

*Last updated: April 14, 2026*
