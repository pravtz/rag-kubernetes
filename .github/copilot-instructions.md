# Project Guidelines

## Current State

- DDD migration sprints 1–6 complete. The `rag` bounded context is fully wired under `src/modules/rag/` with domain, application, and infrastructure layers, composition root, and manual DI.
- Sprint 7 (tests + cleanup) is active: expand test coverage for multi-collection features and remove deprecated flat files.
- Files in `src/controllers/`, `src/services/`, `src/routes/ragRoutes.ts`, and `src/utils/` are **deprecated compatibility shims** that re-export from the new locations. Do not add new code there.

## Architecture

- TypeScript Node.js API using Express, LangChain, OpenAI models, and Qdrant.
- Organized as DDD Layered Architecture with Ports & Adapters (Hexagonal).
- Single bounded context `rag` under `src/modules/rag/`.
- Path aliases configured in `tsconfig.json`: `@modules/*`, `@shared/*`, `@config/*`.

### Folder Structure

```
src/
├── modules/rag/                  # Bounded Context
│   ├── domain/                   # Pure domain — zero external dependencies
│   │   ├── entities/             # RagDocument
│   │   ├── value-objects/        # Chunk, ChunkMetadata, Question, QueryIntent, ScoredChunk
│   │   ├── repositories/         # IVectorRepository, IVectorRepositoryRegistry
│   │   ├── services/             # Domain services
│   │   ├── errors/               # DomainErrors
│   │   └── events/               # DocumentIngested
│   ├── application/              # Orchestration — depends only on domain
│   │   ├── use-cases/            # IngestPdfUseCase, RoutedQueryUseCase, QueryDocumentsUseCase,
│   │   │                         # GetApiStatusUseCase, GetReadinessUseCase, GetQdrantInfoUseCase
│   │   ├── dtos/                 # IngestResultDTO, QueryRequestDTO, RoutedQueryRequestDTO, etc.
│   │   ├── mappers/              # IngestResultMapper
│   │   └── ports/                # ILlmService, IEmbeddingService, IPdfLoader,
│   │                             # IChunkingService, IQueryRouter, IReranker
│   ├── infrastructure/           # Technical details — implements ports and adapters
│   │   ├── adapters/             # LangChain*, LlmQueryRouterAdapter, RRFRerankerAdapter
│   │   ├── persistence/qdrant/   # QdrantVectorRepository, QdrantVectorRepositoryRegistry,
│   │   │                         # QdrantClientFactory, QdrantDiagnostics
│   │   └── http/                 # Controllers, routes, middlewares (Express-specific)
│   └── index.ts                  # Composition Root — manual DI wiring
│
├── shared/                       # Cross-cutting code shared between modules
│   ├── domain/                   # Entity, ValueObject, AggregateRoot base classes
│   ├── application/              # UseCase<In, Out> interface, Result<T, E> pattern
│   ├── errors/                   # AppError → DomainError, ApplicationError, InfrastructureError
│   └── infrastructure/           # asyncHandler, errorMiddleware
│
├── config/                       # config.ts (env, fail-fast validation), swagger.ts
├── app.ts                        # Express setup (CORS, JSON, Swagger, routes, error handler)
└── server.ts                     # Bootstrap entry point
```

### Dependency Rule

Dependencies always point inward: `infrastructure → application → domain`.

- `domain/` must NOT import from `application/` or `infrastructure/`.
- `application/` must NOT import from `infrastructure/`.
- `infrastructure/` may import from `application/` and `domain/`.

### Key Patterns

- **Ports & Adapters**: domain/application define interfaces (ports); infrastructure implements them (adapters).
- **Repository Pattern**: `IVectorRepository` in domain; `QdrantVectorRepository` in infrastructure.
- **Multi-collection**: `IVectorRepositoryRegistry` provides collection-aware access.
- **Composition Root**: all dependencies are assembled in `src/modules/rag/index.ts` and exported as composed Express routes.
- Centralize environment loading and fail-fast validation in `src/config/config.ts` instead of reading `process.env` throughout the codebase.

## Implementation Priorities

- Every use case must implement `UseCase<Input, Output>` and return `Result<T, E>`.
- New external integrations must define a port in `application/ports/` and implement an adapter in `infrastructure/adapters/`.
- Controllers are thin: extract request data, call the use case, format the response. No business logic.
- Qdrant collection creation happens automatically before the first write.
- Use UUIDs for chunk and document identifiers; persist metadata with each chunk.
- Keep query responses streamed from the API instead of waiting for the full LLM output.
- Do not add new code to deprecated flat files (`src/controllers/`, `src/services/`, `src/routes/ragRoutes.ts`, `src/utils/`).

## Code Style

- Favor simple, didactic code with explicit names and small modules over clever abstractions.
- Keep responsibilities separated by layer; avoid placing business logic in controllers.
- Value objects are immutable with `equals()`; use static factory methods for creation.
- Use the `Result<T, E>` pattern for predictable errors; throw only for unexpected failures.
- Use DTOs at the application boundary; never expose domain entities directly to the HTTP layer.
- Use Mappers for explicit conversion between layers.
- Return appropriate HTTP status codes and clear error payloads.
- Add only the comments needed to clarify non-obvious logic.

## Build and Test

- Scripts: `dev`, `build`, `start`, `test`, `test:watch`, `test:coverage`.
- Tests live in `src/__tests__/`.
- Jest may exit with code 1 due to an async Qdrant client log ("Cannot log after tests are done") even when all tests pass. `npm run build` is a stable fallback for type-checking.
- Add a `.env.example` when introducing runtime configuration.
- Prefer changes that can be validated locally with the Express health check and Docker Compose setup.

## Infrastructure

- When adding Docker Compose, define explicit `platform` values for services and keep a persistent named volume for Qdrant data.
- Keep the API and Qdrant on the same local Compose network for development.
- Swagger UI is served at `/api-docs`.