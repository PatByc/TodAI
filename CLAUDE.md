

<!-- GSD:project-start source:PROJECT.md -->
## Project

**TodAI**

TodAI is a self-hosted AI memory and productivity workspace where everything the user captures is indexed, retrievable, connected, and actionable through an AI agent called Tod. It combines notes, ideas, tasks, and projects with hybrid RAG retrieval, enabling natural-language queries across the user's entire knowledge base. Built for a single power user who wants one place to dump everything without thinking about organization, because Tod can find, connect, and structure it later.

**Core Value:** Tod can find any historical note, idea, or decision in seconds through hybrid semantic + full-text search, and use that retrieved context to help the user reason, prioritize, and act.

### Constraints

- **Self-hosted**: Must run entirely on user's home server — no mandatory cloud services except LLM API calls
- **Data ownership**: All notes, tasks, vectors, and indexes stored locally — LLM provider memory is optional, TodAI knowledge base is authoritative
- **Privacy**: Vector index and primary database remain local by default; sending content to cloud models must be explicit and configurable
- **Deployment**: Single process + PostgreSQL — minimal operational overhead
- **Embedding provider**: Must be abstracted behind a swappable interface (OpenAI API for MVP, local models later)
- **Provider independence**: Knowledge base must survive model/provider changes without migration
- **Solo developer**: Architecture should be clean but pragmatic — no premature abstractions
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Runtime & Language
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Python | 3.13.x | Backend runtime | Best AI/ML ecosystem; 3.13 is stable with broad library support and improved error messages. 3.12 is fallback if any dependency lags. | HIGH |
| Node.js | 22.x LTS | Frontend tooling | Required by Vite/npm; 22 is current LTS. | HIGH |
| TypeScript | ~7.0 | Frontend type safety | Latest stable; full type inference for TanStack Router typed routes and Pydantic-generated API types. | HIGH |
### Backend Framework
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| FastAPI | ~0.141 | HTTP API framework | Async-native, Pydantic-first validation, OpenAPI auto-docs, WebSocket support for streaming LLM responses. Dominant Python API framework. | HIGH |
| Pydantic | ~2.13 | Data validation & serialization | FastAPI's native validation layer. v2 is a Rust-backed rewrite with 5-17x speedup over v1. All API models, settings, and LLM schemas use Pydantic. | HIGH |
| Uvicorn | latest | ASGI server | FastAPI's recommended production server; lightweight, async, runs as single process per the deployment constraint. | HIGH |
### Database & ORM
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| PostgreSQL | 16+ | Primary database | One database for structured data, full-text search (tsvector/GIN), and vector search (pgvector). Eliminates operational overhead of separate search/vector stores. | HIGH |
| pgvector | 0.8.x | Vector similarity search | Extends Postgres with HNSW/IVFFlat indexes for embedding search. v0.8 adds iterative index scans that solve the overfiltering problem when combining vector search with WHERE clauses -- critical for filtered hybrid retrieval. | HIGH |
| SQLAlchemy | ~2.0.52 | ORM & query builder | v2.0 has mature async support, type-annotated mapped columns, and native pgvector integration via pgvector-python. Do NOT use 2.1 beta in production. | HIGH |
| pgvector-python | latest | SQLAlchemy pgvector types | Provides `Vector` column type and distance operators for SQLAlchemy. Supports halfvec, bit, sparsevec. Dropped SA<2 support, so aligns with SA 2.0. | HIGH |
| asyncpg | ~0.31 | Async PostgreSQL driver | 5x faster than psycopg3 for single-statement workloads (the dominant pattern in a web API). Deeply asyncio-native. Use via `postgresql+asyncpg://` connection string. | HIGH |
| Alembic | ~1.19 | Database migrations | SQLAlchemy's own migration tool. Supports autogenerate from model diffs, pyproject.toml config (since 1.16), and async engine. | HIGH |
### AI / LLM Layer
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| OpenAI Python SDK | ~3.8 | LLM API client (MVP) | Official SDK for chat completions, embeddings, and structured outputs. Supports streaming, function calling, and Pydantic response_format. MVP uses OpenAI exclusively; provider abstraction wraps this. | HIGH |
| LiteLLM | ~1.100 | Provider routing abstraction | Unified interface to 100+ LLM providers using OpenAI-compatible format. Single `completion()` call with model string swap (`openai/gpt-4o`, `anthropic/claude-sonnet-4-20250514`). Replaces building custom provider adapters. Use as Python SDK, not as proxy server. | MEDIUM |
| tiktoken | ~0.13 | Token counting | OpenAI's fast BPE tokenizer. Essential for chunk size control, context window management, and cost estimation. Rust-backed, very fast. | HIGH |
### RAG Pipeline Components
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| semchunk | latest | Text chunking | 85% faster than semantic-text-splitter. Built-in tiktoken support. Produces more semantically meaningful chunks than recursive character splitters. Lightweight, no heavy dependencies. | MEDIUM |
| FlashRank | ~0.2.10 | Reranking | Ultra-lite cross-encoder reranker (~4MB model). No torch/transformers dependency. Runs on CPU in <20ms for 50 candidates. Perfect for self-hosted single-process deployment where GPU is not assumed. | MEDIUM |
| PostgreSQL tsvector + GIN | (built-in) | Full-text search | Native Postgres FTS with ranking (ts_rank). No external search engine needed. Combined with pgvector in single DB for hybrid retrieval. | HIGH |
### Frontend Framework
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| React | 19.x | UI framework | Dominant ecosystem, best library support, concurrent features. v19 removes forwardRef boilerplate, adds use() hook, and improves TypeScript support. | HIGH |
| Vite | 8.x | Build tool & dev server | Instant HMR, native ESM, Rust-powered builds. v8 is latest stable. Vite is the standard React build tool (Create React App is dead). | HIGH |
| TanStack Router | ~1.170 | Client-side routing | Type-safe routes, typed search params, typed path params -- all without manual type annotations. Better than React Router v7 for TypeScript-first SPAs where SSR is not needed. File-based routing via Vite plugin. | HIGH |
| TanStack Query | ~5.102 | Server state management | Caching, background refetching, optimistic updates, pagination. De facto standard for React data fetching. Eliminates manual loading/error/cache state. | HIGH |
| Zustand | ~5.0 | Client state management | Minimal API, no providers/context, TypeScript-native. 50%+ adoption among React devs. Use for UI state (sidebar open, active filters, user preferences). TanStack Query handles all server state. | HIGH |
| Tailwind CSS | 4.x | Styling | Utility-first CSS, v4 is CSS-native config (no tailwind.config.ts). Paired with shadcn/ui for component primitives. | HIGH |
| shadcn/ui | latest | UI component primitives | Copy-paste components built on Radix UI. Not a dependency -- components live in your codebase. Accessible, themeable, composable. Includes Spinner, Kbd, ButtonGroup, Field, Empty (Oct 2025 additions). | HIGH |
| Tiptap | ~3.31 | Rich text editor | ProseMirror-based with friendly API. Best balance of features and flexibility for a notes app. Supports markdown import/export, slash commands, mentions, and custom extensions. Headless (style with Tailwind). | HIGH |
### Testing
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| pytest | latest | Backend test runner | Python standard. Use with pytest-asyncio for async test support. | HIGH |
| pytest-asyncio | latest | Async test support | Required for testing FastAPI async endpoints and async database operations. | HIGH |
| httpx (or httpx2) | latest | Async test client | FastAPI recommends AsyncClient for async endpoint testing. httpx2 is the Pydantic-maintained fork of httpx. Either works; httpx2 is the actively maintained path forward. | MEDIUM |
| Vitest | latest | Frontend test runner | Vite-native, fast, Jest-compatible API. Use for unit testing components and utilities. | HIGH |
| Playwright | latest | E2E testing | Cross-browser E2E tests. Use sparingly for critical flows (capture, search, AI interaction). | MEDIUM |
### Developer Tooling
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| uv | latest | Python package & project manager | 10-100x faster than pip. Replaces pip, pip-tools, pyenv, virtualenv, and Poetry in a single binary. Written in Rust (by Astral, same team as Ruff). Use for dependency management, virtual environments, and Python version management. | HIGH |
| Ruff | ~0.16 | Python linting & formatting | Replaces flake8, Black, isort, pyupgrade in one tool. Written in Rust, extremely fast. Same team as uv. | HIGH |
| Biome | latest | Frontend linting & formatting | Fast Rust-based linter/formatter for TypeScript/JSX. Replaces ESLint + Prettier with a single tool. | MEDIUM |
| pre-commit | latest | Git hooks | Run Ruff, Biome, type checks on commit. Catches issues before they reach the repo. | HIGH |
### Infrastructure
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Docker | latest | Containerization | Single Dockerfile for backend + frontend build. docker-compose for app + PostgreSQL. Simplifies self-hosted deployment. | HIGH |
| Docker Compose | latest | Multi-container orchestration | Defines app + PostgreSQL (with pgvector) as a single stack. One `docker compose up` to run everything. | HIGH |
| PostgreSQL (pgvector image) | 16-bookworm | Database container | Use `pgvector/pgvector:pg16` Docker image -- PostgreSQL with pgvector pre-installed. | HIGH |
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| ORM | SQLAlchemy 2.0 | SQLModel | SQLModel is a thin wrapper over SQLAlchemy by the FastAPI author, but it lags behind SQLAlchemy features, has fewer resources for advanced queries (pgvector, tsvector), and adds an abstraction layer that doesn't help for complex RAG queries. |
| Async PG driver | asyncpg | psycopg3 (async) | psycopg3 is more versatile and has pipeline mode, but asyncpg is faster for the single-statement-per-request pattern that dominates web APIs. The 5x speed advantage matters for embedding lookups. |
| RAG framework | Custom pipeline | LangChain / LlamaIndex | RAG is TodAI's core product, not a feature. Framework abstractions hide retrieval quality details. Custom pipeline with explicit RRF, reranking, and context assembly gives full control. |
| Provider routing | LiteLLM SDK | Custom 9Router adaptation | LiteLLM already provides the unified completion/embedding interface with 100+ providers. Less code to maintain than forking/adapting 9Router. |
| Provider routing | LiteLLM SDK | Pydantic AI | Pydantic AI is excellent for agent-based workflows, but TodAI's provider routing needs are simpler (completion + embedding calls). LiteLLM is lighter for this specific use case. Pydantic AI can be introduced later for Tod's agent capabilities if needed. |
| Text editor | Tiptap | Lexical | Lexical is lower-level and faster but requires building extension ecosystem from scratch. Tiptap's existing extensions (task lists, markdown, tables) save weeks of development for a solo developer. |
| Text editor | Tiptap | Plate | Plate builds on Slate which has a history of breaking changes and a less stable API. Tiptap/ProseMirror is more battle-tested. |
| Routing | TanStack Router | React Router v7 | React Router v7's best type safety features require "framework mode" with SSR, which adds complexity TodAI doesn't need. TanStack Router provides superior type safety in SPA mode. |
| State management | Zustand | Redux Toolkit | Redux adds boilerplate (slices, actions, reducers) that is unnecessary for a single-user app. Zustand does the same job with 1/5th the code. |
| State management | Zustand | Jotai | Jotai's atomic model is better for deeply nested derived state. TodAI's client state is simple (UI preferences, sidebar state). Zustand's store pattern is more straightforward. |
| Styling | Tailwind + shadcn/ui | MUI / Ant Design | Heavy component libraries add bundle weight and fight against custom design. shadcn/ui components are copied into the project -- zero dependency, full control, Tailwind-native. |
| Build tool | Vite | Webpack / Turbopack | Vite is the standard for new React projects. Webpack is legacy. Turbopack is Next.js-specific. |
| Chunking | semchunk | LangChain RecursiveCharacterTextSplitter | semchunk is faster and produces better semantic boundaries. LangChain splitters pull in the entire LangChain dependency tree. |
| Reranking | FlashRank | sentence-transformers CrossEncoder | FlashRank requires no torch/transformers (~4MB vs ~2GB). For a self-hosted system on CPU, this difference is critical. Quality is sufficient for personal knowledge retrieval. |
| Package manager | uv | Poetry / pip | uv is 10-100x faster, manages Python versions, and replaces the entire pip+virtualenv+pyenv toolchain. Active development by the Ruff/Astral team. |
| Linting (Python) | Ruff | flake8 + Black + isort | Ruff replaces all three in a single Rust binary. Same team as uv. No reason to use the separate tools anymore. |
## Installation
### Backend
# Install uv (if not already installed)
# Initialize project
# Core dependencies
# Database
# AI / LLM
# RAG pipeline
# HTTP client (for external API calls, testing)
# Dev dependencies
### Frontend
# Create Vite project
# Core
# UI
# shadcn/ui (interactive init)
# Dev dependencies
### Docker
# docker-compose.yml
## Version Pinning Strategy
- Python packages: `fastapi>=0.141,<0.142` (or use uv lock for exact reproducibility)
- npm packages: Use `^` prefix for minor-compatible updates (e.g., `^19.2.0`)
- PostgreSQL: Pin exact major version in Docker image tag (`pg16`)
- pgvector: Pin to `0.8.x` in Docker image
## Sources
- [FastAPI releases](https://github.com/fastapi/fastapi/releases) -- v0.141.1 (July 2026)
- [Pydantic PyPI](https://pypi.org/project/pydantic/) -- v2.13.4
- [SQLAlchemy download](https://www.sqlalchemy.org/download.html) -- v2.0.52 (Aug 2026)
- [pgvector GitHub](https://github.com/pgvector/pgvector) -- v0.8.2
- [pgvector-python GitHub](https://github.com/pgvector/pgvector-python)
- [asyncpg PyPI](https://pypi.org/project/asyncpg/) -- v0.31.0
- [Alembic docs](https://alembic.sqlalchemy.org/) -- v1.19.2
- [OpenAI Python SDK releases](https://github.com/openai/openai-python/releases) -- v3.8.0
- [LiteLLM docs](https://docs.litellm.ai/) -- v1.100.0
- [tiktoken PyPI](https://pypi.org/project/tiktoken/) -- v0.13.0
- [FlashRank PyPI](https://pypi.org/project/FlashRank/) -- v0.2.10
- [React versions](https://react.dev/versions) -- v19.2.7
- [Vite releases](https://vite.dev/releases) -- v8.2.2
- [TanStack Router releases](https://github.com/TanStack/router/releases) -- v1.170.33
- [TanStack Query releases](https://github.com/tanstack/query/releases) -- v5.102.8
- [Zustand npm](https://www.npmjs.com/package/zustand) -- v5.0.15
- [Tailwind CSS npm](https://www.npmjs.com/package/tailwindcss) -- v4.3.3
- [shadcn/ui changelog](https://ui.shadcn.com/docs/changelog) -- Oct 2025 components
- [Tiptap npm](https://www.npmjs.com/package/@tiptap/core) -- v3.31.3
- [TypeScript releases](https://github.com/microsoft/typescript/releases) -- v7.0.2
- [uv docs](https://docs.astral.sh/uv/)
- [Ruff GitHub](https://github.com/astral-sh/ruff) -- v0.16.x
- [httpx2 PyPI](https://pypi.org/project/httpx2/) -- v2.12.0
- [Pydantic AI GitHub](https://github.com/pydantic/pydantic-ai) -- v2.0.0
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
