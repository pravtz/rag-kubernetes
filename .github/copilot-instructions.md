# Project Guidelines

## Current State

- This repository is in bootstrap phase. The authoritative product and architecture reference is `docs/prds/prd-01-init.md`.
- Prioritize scaffolding and implementation decisions that satisfy the PRD before adding extra features.
- Keep the initial scope limited to the educational RAG API. Do not add auth, multi-tenant support, frontend UI, relational database, or advanced observability in this phase.

## Architecture

- Build the project as a TypeScript Node.js API using Express, LangChain, OpenAI models, and Qdrant.
- Preserve the planned folder structure under `src/`: `config`, `controllers`, `middleware`, `routes`, `services`, `utils`, plus `server.ts`.
- Keep service boundaries clear:
  - `ragService` orchestrates PDF ingestion and final RAG response generation.
  - `queryService` handles retrieval and context assembly.
  - upload middleware is responsible for accepting only PDF files.
- Centralize environment loading and fail-fast validation in `src/config/config.ts` instead of reading `process.env` throughout the codebase.

## Implementation Priorities

- Follow the implementation order from the PRD: bootstrap project, config, server and routes, upload middleware, ingestion flow, query flow, controllers, then Docker Compose.
- Ensure Qdrant collection creation happens automatically before the first write.
- Use UUIDs for chunk and document identifiers, and persist basic metadata with each chunk.
- Keep query responses streamed from the API instead of waiting for the full LLM output.

## Code Style

- Favor simple, didactic code with explicit names and small modules over clever abstractions.
- Keep responsibilities separated by layer; avoid placing business logic in controllers.
- Return appropriate HTTP status codes and clear error payloads.
- Add only the comments needed to clarify non-obvious logic.

## Build and Test

- If the project is being scaffolded, add and maintain at least `dev`, `build`, and `start` scripts first.
- Add a `.env.example` when introducing runtime configuration.
- Prefer changes that can be validated locally with the Express health check and Docker Compose setup.

## Infrastructure

- When adding Docker Compose, define explicit `platform` values for services and keep a persistent named volume for Qdrant data.
- Keep the API and Qdrant on the same local Compose network for development.