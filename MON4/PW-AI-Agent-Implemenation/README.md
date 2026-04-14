# 🤖 AI Test Automation Agent

> Upload a CSV of test cases → AI generates BDD features → Playwright code is auto-generated → Tests execute in real-time via Playwright MCP → Self-healing on failure → Allure reports published.

**Stack:** React 18 · Node.js + Express · Playwright + TypeScript · Cucumber.js · Playwright MCP · Allure Reports · OpenAI / Azure OpenAI / Ollama

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Playwright MCP Integration](#playwright-mcp-integration)
- [4-Tier Smart Locator](#4-tier-smart-locator)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Docker](#docker)
- [Scripts](#scripts)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)

---

## Features

| Feature | Description |
|---|---|
| 📄 **CSV Upload & Parse** | Drag-and-drop CSV with test case columns — parsed and validated in-memory |
| 🧠 **AI BDD Generation** | LLM converts test cases to Gherkin `.feature` files with proper tags |
| ⚡ **Playwright Code Gen** | Auto-generates step definitions, page objects, hooks, and 4-tier smart locator files |
| 🎭 **Multi-Browser Execution** | Run on Chromium, Firefox, or WebKit — headless or headed |
| 🔌 **Playwright MCP** | Browser automation via `@playwright/mcp` child process + JSON-RPC over stdio |
| 🎯 **4-Tier Smart Locator** | Accessibility Snapshot → Pattern Matching → LLM Fallback → Auto-Healing |
| 🔄 **AI Self-Healing** | Failed locators are healed via LLM using DOM snapshots — retries automatically |
| 📊 **Allure Reporting** | Beautiful HTML reports with screenshots, videos, and traces |
| 🔗 **WebSocket Live Logs** | Real-time test execution streaming to the browser |
| 🐳 **Docker Ready** | One-command startup with `docker-compose up` |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│            React.js Frontend (Vite)             │
│  CSV Upload │ BDD Preview │ Code │ Run │ Report │
└────────────────────┬────────────────────────────┘
                     │ REST / WebSocket
┌────────────────────▼────────────────────────────┐
│          Node.js + Express Backend              │
│  /upload → /generate-bdd → /generate-code       │
│  /run → /heal → /report → /mcp/*               │
└─────┬──────────────────┬──────────────┬─────────┘
      │                  │              │
 ┌────▼─────┐   ┌───────▼────────┐  ┌──▼──────────────┐
 │ AI / LLM │   │ Playwright +   │  │ Playwright MCP   │
 │ OpenAI   │   │ Cucumber.js    │  │ @playwright/mcp  │
 │ Azure    │   │ Chrome/FF/WK   │  │ JSON-RPC stdio   │
 │ Ollama   │   │ Allure Results │  │ 24 browser tools │
 └──────────┘   └────────────────┘  └──────────────────┘
```

See [architecture.md](architecture.md) for the full system design.

---

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Allure CLI** (optional): `npm install -g allure-commandline`
- **Docker & Docker Compose** (optional, for containerised deployment)
- An **OpenAI API key** (or Azure OpenAI / Ollama for local LLM)

---

## Quick Start

### 1. Clone & Install

```bash
git clone <repo-url>
cd PW-AI-Agent-Implemenation

# Install all dependencies (root + backend + frontend + automation)
npm run install:all
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
PORT=4000
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o
BASE_URL=https://your-app-under-test.com

# Playwright MCP
MCP_PLAYWRIGHT_ENABLED=true
USE_REAL_MCP=false          # false = mock mode (no real browser)
```

### 3. Start Development

```bash
# Start both backend (port 4000) and frontend (port 5173)
npm run dev
```

Or start individually:

```bash
npm run dev:backend    # Express API on :4000
npm run dev:frontend   # Vite dev server on :5173
```

### 4. Open the App

Navigate to **http://localhost:5173** in your browser.

---

## Project Structure

```
├── frontend/              # React 18 + Vite + Tailwind
│   └── src/
│       ├── pages/         # Upload, BDDPreview, CodeViewer, Execution, Reports
│       ├── components/    # Layout (Sidebar, Header)
│       ├── context/       # PipelineContext (global state + localStorage)
│       ├── services/      # API clients (6 service files)
│       └── hooks/         # useUpload, useExecution, useWebSocket
│
├── backend/               # Express + TypeScript API
│   └── src/
│       ├── routes/        # 7 API routes (incl. mcp.routes)
│       ├── controllers/   # 7 request handlers (incl. mcp.controller)
│       ├── services/      # csv, bdd, codegen, execution, heal, report, mcp-init
│       ├── infrastructure/  # ★ MCP client infrastructure
│       │   └── mcp/
│       │       ├── common/      # IMcpClient interface + McpClientFactory
│       │       └── playwright/  # Real + Mock clients + 15 tool wrappers
│       ├── actions/       # Action registry + NL mapper
│       ├── templates/     # Code gen templates (5 files incl. smart-locator)
│       ├── middleware/     # Error handler, logger, CORS
│       └── websocket/     # Live log streaming
│
├── automation/            # Playwright + Cucumber.js engine
│   └── tests/
│       ├── features/      # Generated .feature files
│       ├── step-definitions/  # Generated step defs (smart locator)
│       ├── pages/         # Generated page objects + BasePage
│       └── support/       # 7 files: hooks, world, smart locator suite
│
├── ai/                    # LLM abstraction layer
│   ├── providers/         # OpenAI, Azure, Ollama
│   └── prompts/           # System prompts & few-shot examples
│
├── docker-compose.yml
├── architecture.md        # Full system design
├── todo.md                # Implementation plan (12 phases, all ✅)
└── package.json           # Root scripts
```

---

## Playwright MCP Integration

The backend integrates **Playwright MCP (Model Context Protocol)** as a browser automation server:

- **`@playwright/mcp`** is spawned as a child process via `npx @playwright/mcp@latest`
- **`@modelcontextprotocol/sdk`** is a direct dependency for the MCP TypeScript client
- Communication happens via **JSON-RPC 2.0 over stdio**
- Toggled by `MCP_PLAYWRIGHT_ENABLED=true` and `USE_REAL_MCP=true/false`

### Key Design

```
IMcpClient (interface)
    ├── RealPlaywrightMcpClient   # Spawns @playwright/mcp, JSON-RPC
    └── PlaywrightMcpClient       # Mock client for dev/testing
            │
     McpClientFactory             # Creates clients by server type
```

### Available MCP Tools (24)

`browser_navigate`, `browser_click`, `browser_type`, `browser_snapshot`, `browser_take_screenshot`, `browser_hover`, `browser_drag`, `browser_select_option`, `browser_fill_form`, `browser_press_key`, `browser_handle_dialog`, `browser_file_upload`, `browser_evaluate`, `browser_wait_for`, `browser_tabs`, `browser_resize`, `browser_console_messages`, `browser_network_requests`, `browser_close`, `browser_install`, and more.

### Snapshot → Element Ref Workflow

1. Call `browser_snapshot` → get accessibility tree with `ref` values
2. Search tree for target element (by role, name, text)
3. Extract `ref` from matching node
4. Pass `ref` + `element` to action tools (`browser_click`, `browser_type`, etc.)

---

## 4-Tier Smart Locator

Generated step definitions use `smartClick()`, `smartFill()`, etc. which resolve elements through a runtime cascade:

```
Tier 1: Accessibility Snapshot (DOM walker via page.evaluate)
    ↓ not found?
Tier 2: Pattern Matching (7 strategies, no API calls)
    ↓ not found?
Tier 3: LLM Fallback (OpenAI/Azure/Ollama)
    ↓ not found?
Tier 4: Healing + Static Fallback
```

**Pattern Matching Strategies (Tier 2):**
1. `getByTestId(testId)` → 2. `getByRole(role, { name: exact })` → 3. `getByRole(role, { name: /partial/i })` → 4. `getByLabel(label)` → 5. `getByPlaceholder(placeholder)` → 6. `getByText(text)` → 7. Inferred role search

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Backend server port |
| `NODE_ENV` | `development` | Environment mode |
| `AI_PROVIDER` | `openai` | LLM provider: `openai`, `azure`, `local` |
| `OPENAI_API_KEY` | — | OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o` | OpenAI model name |
| `AZURE_OPENAI_ENDPOINT` | — | Azure OpenAI endpoint URL |
| `AZURE_OPENAI_KEY` | — | Azure OpenAI key |
| `AZURE_OPENAI_DEPLOYMENT` | — | Azure deployment name |
| `LOCAL_LLM_URL` | `http://localhost:11434` | Ollama endpoint |
| `LOCAL_LLM_MODEL` | `llama3` | Local model name |
| `MCP_PLAYWRIGHT_ENABLED` | `false` | Enable Playwright MCP integration |
| `USE_REAL_MCP` | `false` | Toggle real (spawned process) vs mock client |
| `BASE_URL` | — | Target application URL for testing |
| `DEFAULT_BROWSER` | `chromium` | Default browser for execution |
| `HEADLESS` | `true` | Run browsers in headless mode |
| `PARALLEL_WORKERS` | `4` | Number of parallel test workers |

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/upload` | POST | Upload & parse CSV |
| `/api/generate-bdd` | POST | Generate Gherkin features from test cases |
| `/api/generate-code` | POST | Generate Playwright code + smart locator suite |
| `/api/run` | POST | Execute tests |
| `/api/run` | GET | Get run history |
| `/api/run/:runId` | GET | Get execution status |
| `/api/run/stop` | POST | Stop running tests |
| `/api/heal` | POST | Heal a failed locator |
| `/api/report` | GET | Get report status |
| `/api/report/generate` | POST | Generate Allure report |
| `/api/mcp/connect` | POST | Connect to Playwright MCP server |
| `/api/mcp/disconnect` | POST | Disconnect from MCP server |
| `/api/mcp/status` | GET | Get MCP connection status |
| `/api/mcp/tools` | GET | List available MCP tools |
| `/api/mcp/execute` | POST | Execute any MCP tool |
| `/api/mcp/snapshot` | POST | Get accessibility snapshot |
| `/api/mcp/navigate` | POST | Navigate browser to URL |
| `/api/mcp/click` | POST | Click element by ref |
| `/api/mcp/type` | POST | Type text into element |
| `/api/mcp/screenshot` | POST | Take screenshot |
| `/api/health` | GET | Health check |

---

## Docker

### Run with Docker Compose

```bash
docker-compose up --build
```

This starts:
- **Backend** on port `4000`
- **Frontend** on port `5173` (nginx)

### Build individually

```bash
docker build -f backend/Dockerfile -t ai-agent-backend .
docker build -f frontend/Dockerfile -t ai-agent-frontend frontend/
```

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start backend + frontend concurrently |
| `npm run dev:backend` | Start Express backend with nodemon |
| `npm run dev:frontend` | Start Vite dev server |
| `npm run build` | Build backend + frontend for production |
| `npm run test` | Run Cucumber.js tests |
| `npm run test:smoke` | Run only `@smoke` tagged tests |
| `npm run allure:generate` | Generate Allure HTML report |
| `npm run allure:open` | Open Allure report in browser |
| `npm run install:all` | Install all deps (root + backend + frontend + automation) |
| `npm run clean` | Remove node_modules and build artifacts |

---

## How It Works

### 1. CSV Upload
Upload a CSV with columns like `Test ID`, `Test Name`, `Steps`, `Expected Result`, `Priority`. The backend validates and parses it into `TestCase[]` objects.

### 2. AI BDD Generation
Test cases are sent to the configured LLM (OpenAI/Azure/Ollama). The LLM returns Gherkin feature files with `@smoke`/`@regression` tags. Falls back to template-based generation if LLM is unavailable.

### 3. Code Generation
The code generator:
1. **Parses** Gherkin steps into Action Models (click, fill, assert, etc.)
2. **Resolves locators** using priority strategy + `extractTargetFromDescription()` for clean element names
3. **Writes** `.feature` files, `.steps.ts` step definitions, `Page.ts` page objects
4. **Writes** 6 support files including the 4-tier smart locator suite

### 4. Test Execution
Tests run via Cucumber.js + Playwright in a spawned child process. AI env vars are passed through for runtime LLM calls. Stdout/stderr are streamed to the frontend via WebSocket.

### 5. Playwright MCP (Optional)
When `MCP_PLAYWRIGHT_ENABLED=true`:
1. `POST /api/mcp/connect` spawns `@playwright/mcp` as a child process
2. The server communicates via JSON-RPC 2.0 over stdio
3. 24 browser tools are auto-discovered
4. Use `/api/mcp/execute` to call any tool, or convenience endpoints for common actions
5. The `browser_snapshot` tool returns the accessibility tree for locator resolution

### 6. Smart Locator (Runtime)
When a test step runs `smartClick(page, { role: 'button', name: 'Login' })`:
- **Tier 1:** Captures accessibility snapshot from live DOM
- **Tier 2:** Pattern-matches against 7 strategies (instant, no API)
- **Tier 3:** Falls back to LLM if pattern matching fails
- **Tier 4:** Attempts healing with HTML + a11y context

### 7. Self-Healing
When a locator fails:
1. DOM snapshot is captured
2. Failure is classified (locator/timing/assertion)
3. LLM suggests a healed locator
4. Step definition is patched and retried

### 8. Reporting
Allure reports are generated from `allure-results/` and served as static HTML via Express.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, Tailwind CSS 3, React Router, Axios |
| Backend | Node.js, Express, TypeScript, Multer, csv-parse, ws |
| AI | OpenAI SDK, Azure OpenAI, Ollama |
| MCP | `@modelcontextprotocol/sdk`, `@playwright/mcp` (child process) |
| Automation | Playwright, Cucumber.js, TypeScript |
| Smart Locator | 4-tier runtime (Snapshot → Pattern → LLM → Heal) |
| Reporting | Allure Reports (allure-cucumberjs) |
| DevOps | Docker, Docker Compose, Concurrently |

---

## License

MIT

---

*Built with ❤️ for the Week 2 Hackathon*
