# Sprints — Multi-Collection, QueryRouter e Reranker

Plano de implementação organizado em sprints curtos.
Cada sprint indica quais tarefas podem ser executadas **em paralelo** (por subagentes ou desenvolvedores simultâneos) e quais são **sequenciais** (bloqueiam a próxima).

Legenda:
- `[P]` — Pode ser feita em **paralelo** com outras tarefas `[P]` do mesmo sprint
- `[S]` — **Sequencial** — depende de tarefas anteriores dentro do sprint
- `[B]` — **Bloqueante** — sprints seguintes dependem desta tarefa

---

## Sprint 1 — Fundação: Domain Layer (Value Objects + Interfaces + Errors)

> Objetivo: Criar todos os artefatos de domínio que não dependem de nada externo.
> Nenhuma tarefa deste sprint depende de outra — **todas em paralelo**.

### Tarefas

| # | Tarefa | Tipo | Arquivo | O que fazer |
|---|--------|------|---------|-------------|
| 1.1 | `[P][B]` Criar VO `QueryIntent` | NOVO | `src/modules/rag/domain/value-objects/QueryIntent.ts` | Value Object imutável com `targets: CollectionTarget[]` (collectionName + confidence). Validar pelo menos 1 target. Factory `create()`, `equals()`. |
| 1.2 | `[P][B]` Criar VO `ScoredChunk` | NOVO | `src/modules/rag/domain/value-objects/ScoredChunk.ts` | Value Object com `chunk: Chunk`, `score: number`, `collectionName: string`. Factory `create()`, `equals()`. |
| 1.3 | `[P][B]` Criar interface `IVectorRepositoryRegistry` | NOVO | `src/modules/rag/domain/repositories/IVectorRepositoryRegistry.ts` | Interface com `get(collectionName)`, `getCollectionNames()`, `ensureAllCollections()`, `isReachable()`, `getDiagnosticsAll()`. Importa apenas `IVectorRepository` existente. |
| 1.4 | `[P]` Adicionar `collectionName` ao `ChunkMetadata` | EDITAR | `src/modules/rag/domain/value-objects/ChunkMetadata.ts` | Novo campo opcional `collectionName?: string` em `ChunkMetadataProps`. Atualizar `equals()`. |
| 1.5 | `[P]` Adicionar novos Domain Errors | EDITAR | `src/modules/rag/domain/errors/DomainErrors.ts` | Adicionar `UnknownCollectionError` e `QueryRoutingError` (estendem `DomainError`). |
| 1.6 | `[P]` Testes unitários dos novos VOs | NOVO | `src/__tests__/domain-value-objects.test.ts` | Testar criação, validação e `equals()` de `QueryIntent`, `ScoredChunk`, `ChunkMetadata` atualizado. |

### Critério de aceite
- Todos os VOs compilam e passam nos testes
- Nenhum import de `application/` ou `infrastructure/`
- `equals()` implementado em cada VO

### Delegação por subagente
```
Subagente A → Tarefas 1.1 + 1.2 (VOs novos)
Subagente B → Tarefas 1.3 + 1.5 (interface + errors)
Subagente C → Tarefa 1.4 (editar ChunkMetadata)
Sequencial  → Tarefa 1.6 (testes — rodar após A+B+C concluírem)
```

---

## Sprint 2 — Application Layer (Ports + DTOs)

> Objetivo: Definir as interfaces dos serviços externos e os DTOs do novo fluxo.
> **Depende do Sprint 1** (usa `QueryIntent`, `ScoredChunk`, `Chunk`).
> Tarefas 2.1-2.4 são paralelas entre si.

### Tarefas

| # | Tarefa | Tipo | Arquivo | O que fazer |
|---|--------|------|---------|-------------|
| 2.1 | `[P][B]` Criar port `IQueryRouter` | NOVO | `src/modules/rag/application/ports/IQueryRouter.ts` | Interface com `classify(question: string, collections: CollectionInfo[]): Promise<QueryIntent>`. Definir `CollectionInfo { name, description }`. |
| 2.2 | `[P][B]` Criar port `IReranker` | NOVO | `src/modules/rag/application/ports/IReranker.ts` | Interface com `rerank(input: RerankerInput): Promise<ScoredChunk[]>`. `RerankerInput = { question, chunks: Array<{ chunk, collectionName }> }`. |
| 2.3 | `[P]` Criar DTO `RoutedQueryRequestDTO` | NOVO | `src/modules/rag/application/dtos/RoutedQueryRequestDTO.ts` | Interface com `question: string`, `topK?: number`, `forceCollections?: string[]`. |
| 2.4 | `[P]` Mover `IChunkingService` para ports | MOVER | De `domain/services/IChunkingService.ts` para `application/ports/IChunkingService.ts` | Corrige violação da review — chunking é capacidade técnica, não regra de domínio. Atualizar imports em `IngestPdfUseCase`. |

### Critério de aceite
- Ports compilam, não importam de `infrastructure/`
- `IChunkingService` removido de `domain/services/` e re-exportado de `application/ports/`
- Import em `IngestPdfUseCase` atualizado

### Delegação por subagente
```
Subagente A → Tarefas 2.1 + 2.2 (ports novos)
Subagente B → Tarefas 2.3 + 2.4 (DTO + mover IChunkingService)
```

---

## Sprint 3 — Application Layer (Use Cases novos) + Config

> Objetivo: Criar o `RoutedQueryUseCase` e atualizar a config para multi-collection.
> **Depende do Sprint 2** (usa ports `IQueryRouter`, `IReranker`, `IVectorRepositoryRegistry`).
> Config (3.2) pode rodar em paralelo com o use case (3.1).

### Tarefas

| # | Tarefa | Tipo | Arquivo | O que fazer |
|---|--------|------|---------|-------------|
| 3.1 | `[P][B]` Criar `RoutedQueryUseCase` | NOVO | `src/modules/rag/application/use-cases/RoutedQueryUseCase.ts` | Orquestrador principal: `Question.create()` → `IQueryRouter.classify()` → busca paralela via `IVectorRepositoryRegistry` → `IReranker.rerank()` → `ILlmService.streamResponse()`. Retorna `Result<void, AppError>`. |
| 3.2 | `[P][B]` Atualizar `config.ts` para multi-collection | EDITAR | `src/config/config.ts` | Substituir `qdrant.collectionName` (string) por `qdrant.collections` (array de `{name, description}`). Ler de `QDRANT_COLLECTIONS` (CSV). Manter backward compat: se `QDRANT_COLLECTION_NAME` existir sem `QDRANT_COLLECTIONS`, criar array com 1 item. |
| 3.3 | `[P]` Atualizar `.env.example` | EDITAR | `.env.example` | Adicionar `QDRANT_COLLECTIONS`, `QDRANT_COLLECTION_DESCRIPTIONS`. Documentar formato CSV. |
| 3.4 | `[S]` Atualizar `IngestPdfUseCase` | EDITAR | `src/modules/rag/application/use-cases/IngestPdfUseCase.ts` | Input recebe `collectionName: string`. Trocar `IVectorRepository` por `IVectorRepositoryRegistry`. Usar `registry.get(collectionName)` para obter o repo correto. |
| 3.5 | `[S]` Atualizar `GetApiStatusUseCase` | EDITAR | `src/modules/rag/application/use-cases/GetApiStatusUseCase.ts` | Trocar `IVectorRepository` por `IVectorRepositoryRegistry`. Usar `registry.isReachable()`. |
| 3.6 | `[S]` Atualizar `GetReadinessUseCase` | EDITAR | `src/modules/rag/application/use-cases/GetReadinessUseCase.ts` | Trocar `IVectorRepository` por `IVectorRepositoryRegistry`. Iterar collections para checar readiness de cada uma. Corrigir violação: retornar `Result.fail()` em vez de `throw`. |
| 3.7 | `[P]` Testes do `RoutedQueryUseCase` | NOVO | `src/__tests__/routed-query-usecase.test.ts` | Mocks de `IQueryRouter`, `IReranker`, `IVectorRepositoryRegistry`, `ILlmService`. Cenários: single-collection, multi-collection, sem resultados, router error. |

### Critério de aceite
- `RoutedQueryUseCase` compila e testes passam
- Config carrega multi-collection do env
- Use cases existentes atualizados para `IVectorRepositoryRegistry`
- Zero imports de `infrastructure/` nos use cases

### Delegação por subagente
```
Subagente A → Tarefa 3.1 (RoutedQueryUseCase — mais complexa)
Subagente B → Tarefas 3.2 + 3.3 (config)
Sequencial  → Tarefas 3.4, 3.5, 3.6 (dependem de 3.2 para tipos de config)
Subagente C → Tarefa 3.7 (testes — após 3.1 concluir)
```

---

## Sprint 4 — Infrastructure Layer (Adapters + Persistence)

> Objetivo: Implementar os adapters concretos e o registry de repositories.
> **Depende do Sprint 2** (ports) e **Sprint 3** (config).
> Todos os adapters são independentes entre si — **todos em paralelo**.

### Tarefas

| # | Tarefa | Tipo | Arquivo | O que fazer |
|---|--------|------|---------|-------------|
| 4.1 | `[P][B]` Criar `QdrantVectorRepositoryRegistry` | NOVO | `src/modules/rag/infrastructure/persistence/qdrant/QdrantVectorRepositoryRegistry.ts` | Implementa `IVectorRepositoryRegistry`. Recebe config de collections, cria um `QdrantVectorRepository` por collection (`Map<string, IVectorRepository>`). Métodos: `get()` (throw se não encontrar), `ensureAllCollections()` (paralelo), `isReachable()`, `getDiagnosticsAll()`. |
| 4.2 | `[P][B]` Criar `LlmQueryRouterAdapter` | NOVO | `src/modules/rag/infrastructure/adapters/LlmQueryRouterAdapter.ts` | Implementa `IQueryRouter`. Usa `ChatOpenAI` com JSON mode. Prompt recebe lista de collections com descrições, retorna JSON `{ targets: [{ collectionName, confidence }] }`. Parse seguro com fallback para todas as collections se JSON inválido. |
| 4.3 | `[P][B]` Criar `RRFRerankerAdapter` | NOVO | `src/modules/rag/infrastructure/adapters/RRFRerankerAdapter.ts` | Implementa `IReranker`. Reciprocal Rank Fusion: `score = Σ 1/(k + rank)` com `k=60`. Ordena por score descendente. Retorna `ScoredChunk[]`. Sem dependência externa (algorítmico puro). |
| 4.4 | `[P]` Testes unitários dos adapters | NOVO | `src/__tests__/adapters.test.ts` | Testar `RRFRerankerAdapter` com dados mock (algorítmico, não precisa de infra). Testar `QdrantVectorRepositoryRegistry.get()` com mock de `QdrantVectorRepository`. |

### Critério de aceite
- Registry cria N repositórios automaticamente a partir do config
- `LlmQueryRouterAdapter` gera prompt correto e parseia JSON com segurança
- `RRFRerankerAdapter` ordena corretamente (testar com dados conhecidos)
- Nenhum adapter importa de outro adapter

### Delegação por subagente
```
Subagente A → Tarefa 4.1 (Registry — mais complexa)
Subagente B → Tarefa 4.2 (QueryRouter adapter)
Subagente C → Tarefa 4.3 (Reranker adapter)
Sequencial  → Tarefa 4.4 (testes — após A+B+C)
```

---

## Sprint 5 — Infrastructure Layer (HTTP: Controllers + Routes)

> Objetivo: Atualizar controllers para usar os novos use cases e o registry.
> **Depende dos Sprints 3 e 4** (use cases + adapters).

### Tarefas

| # | Tarefa | Tipo | Arquivo | O que fazer |
|---|--------|------|---------|-------------|
| 5.1 | `[P]` Atualizar `QueryController` | EDITAR | `src/modules/rag/infrastructure/http/controllers/QueryController.ts` | Trocar `QueryDocumentsUseCase` por `RoutedQueryUseCase`. Remover dependência direta de `IVectorRepository` (corrige violação #8 da review). Aceitar `forceCollections` opcional no body. |
| 5.2 | `[P]` Atualizar `IngestController` | EDITAR | `src/modules/rag/infrastructure/http/controllers/IngestController.ts` | Extrair `collectionName` do `req.body.collection`. Validar que collection existe (via registry ou lista de nomes). Passar para `IngestPdfUseCase`. |
| 5.3 | `[P]` Criar `GetQdrantInfoUseCase` | NOVO | `src/modules/rag/application/use-cases/GetQdrantInfoUseCase.ts` | Extrair lógica de `QueryController.getQdrantInfo()` para use case próprio. Usa `IVectorRepositoryRegistry.getDiagnosticsAll()`. Corrige violação #8. |
| 5.4 | `[S]` Atualizar rotas se necessário | EDITAR | `src/modules/rag/infrastructure/http/routes/ragRoutes.ts` | Endpoints não mudam, mas verificar que DI está correto após mudanças nos controllers. |
| 5.5 | `[P]` Testes dos controllers | EDITAR | `src/__tests__/controllers.test.ts` | Atualizar mocks para novos use cases. Adicionar cenários: ingest com collection, query com forceCollections. |

### Critério de aceite
- Controllers são "burros" — só extraem input, chamam use case, formatam output
- Nenhum controller acessa `IVectorRepository` diretamente
- Testes passam com mocks dos novos use cases

### Delegação por subagente
```
Subagente A → Tarefas 5.1 + 5.3 (QueryController + novo use case — relacionados)
Subagente B → Tarefa 5.2 (IngestController)
Sequencial  → Tarefa 5.4 (rotas — após 5.1 + 5.2)
Subagente C → Tarefa 5.5 (testes — após tudo)
```

---

## Sprint 6 — Composition Root + Integração

> Objetivo: Reconectar tudo no DI e garantir que a aplicação inicializa.
> **Depende de todos os sprints anteriores.**
> Majoritariamente sequencial — é a "costura" final.

### Tarefas

| # | Tarefa | Tipo | Arquivo | O que fazer |
|---|--------|------|---------|-------------|
| 6.1 | `[S][B]` Atualizar Composition Root | EDITAR | `src/modules/rag/index.ts` | Instanciar: `QdrantVectorRepositoryRegistry`, `LlmQueryRouterAdapter`, `RRFRerankerAdapter`, `RoutedQueryUseCase`, `GetQdrantInfoUseCase`. Atualizar injeção nos controllers. Remover vectorRepository único. |
| 6.2 | `[S]` Mover `HealthController` para módulo RAG | MOVER | De `src/shared/infrastructure/http/controllers/` para `src/modules/rag/infrastructure/http/controllers/` | Corrige violação #2 da review (shared importando de module). Atualizar import no composition root. Criar `healthRoutes` dentro do módulo RAG. |
| 6.3 | `[S]` Atualizar `app.ts` | EDITAR | `src/app.ts` | Verificar que imports do módulo RAG continuam funcionando após refactor. |
| 6.4 | `[S]` Limpeza: remover camada legada | REMOVER | `src/controllers/`, `src/services/`, `src/routes/ragRoutes.ts` | Remover código morto. Manter `src/utils/` como re-exports se testes ainda usarem (ou atualizar testes). Corrige violação #1. |
| 6.5 | `[S]` Smoke test manual | — | — | `docker compose up`, ingerir PDF em `docs_padronizacao`, query e verificar que router classifica, busca e retorna streaming. |

### Critério de aceite
- App inicializa sem erros
- Ingestão funciona com `collection` no body
- Query passa pelo pipeline: router → search paralelo → reranker → LLM → stream
- Health/readiness checkam todas as collections
- Zero código legado em `src/controllers/`, `src/services/`

### Delegação por subagente
```
Todas sequenciais — 1 agente ou desenvolvedor faz 6.1 → 6.2 → 6.3 → 6.4 → 6.5
```

---

## Sprint 7 — Testes de Integração + Documentação

> Objetivo: Garantir cobertura e atualizar documentação.
> **Depende do Sprint 6.**

### Tarefas

| # | Tarefa | Tipo | Arquivo | O que fazer |
|---|--------|------|---------|-------------|
| 7.1 | `[P]` Testes de integração do fluxo completo | NOVO | `src/__tests__/routed-query-integration.test.ts` | Testar pipeline inteiro com mocks de Qdrant e LLM. Cenários: query classificada para 1 collection, query para 2 collections, forceCollections, collection desconhecida. |
| 7.2 | `[P]` Testes do QueryRouter adapter | NOVO | `src/__tests__/query-router-adapter.test.ts` | Mock de ChatOpenAI, verificar prompt gerado, parse de JSON válido e inválido. |
| 7.3 | `[P]` Atualizar `README.md` | EDITAR | `README.md` | Documentar: novo fluxo com diagrama, novos env vars, exemplo de ingest com collection, exemplo de query com forceCollections, arquitetura atualizada. |
| 7.4 | `[P]` Atualizar `.env.example` | EDITAR | `.env.example` | Garantir que reflete a config final. |
| 7.5 | `[P]` Criar ADR para decisões | NOVO | `docs/adr/001-multi-collection-query-router.md` | Documentar: por que multi-collection, por que router via LLM, por que RRF para reranker, alternativas consideradas. |

### Critério de aceite
- Cobertura de testes >= atual (28 testes)
- README reflete a nova arquitetura
- ADR escrito

### Delegação por subagente
```
Subagente A → Tarefas 7.1 + 7.2 (testes)
Subagente B → Tarefas 7.3 + 7.4 + 7.5 (docs)
```

---

## Visão geral: Grafo de dependências entre sprints

```
Sprint 1 (Domain VOs + Interfaces)
    │
    ▼
Sprint 2 (Ports + DTOs)
    │
    ├──────────────────┐
    ▼                  ▼
Sprint 3             Sprint 4
(Use Cases + Config)  (Adapters + Persistence)
    │                  │
    └────────┬─────────┘
             ▼
         Sprint 5
     (Controllers + Routes)
             │
             ▼
         Sprint 6
    (Composition Root + Integração)
             │
             ▼
         Sprint 7
    (Testes Integração + Docs)
```

> **Sprints 3 e 4 podem rodar em paralelo** — são independentes (application e infrastructure não dependem um do outro, apenas de domain/ports).

---

## Resumo de paralelismo

| Sprint | Total tarefas | Em paralelo | Sequenciais | Subagentes simultâneos |
|:---:|:---:|:---:|:---:|:---:|
| 1 | 6 | 5 | 1 | 3 |
| 2 | 4 | 4 | 0 | 2 |
| 3 | 7 | 4 | 3 | 3 |
| 4 | 4 | 3 | 1 | 3 |
| 5 | 5 | 3 | 2 | 3 |
| 6 | 5 | 0 | 5 | 1 |
| 7 | 5 | 5 | 0 | 2 |

**Caminho crítico**: Sprint 1 → Sprint 2 → Sprint 3 → Sprint 5 → Sprint 6 → Sprint 7

**Ganho de paralelismo**: Sprints 3+4 em paralelo economizam ~1 sprint inteiro de tempo.

---

## Arquivos criados vs editados

### Novos (13 arquivos)
- `domain/value-objects/QueryIntent.ts`
- `domain/value-objects/ScoredChunk.ts`
- `domain/repositories/IVectorRepositoryRegistry.ts`
- `application/ports/IQueryRouter.ts`
- `application/ports/IReranker.ts`
- `application/dtos/RoutedQueryRequestDTO.ts`
- `application/use-cases/RoutedQueryUseCase.ts`
- `application/use-cases/GetQdrantInfoUseCase.ts`
- `infrastructure/adapters/LlmQueryRouterAdapter.ts`
- `infrastructure/adapters/RRFRerankerAdapter.ts`
- `infrastructure/persistence/qdrant/QdrantVectorRepositoryRegistry.ts`
- `src/__tests__/routed-query-usecase.test.ts` (+ outros test files)
- `docs/adr/001-multi-collection-query-router.md`

### Editados (10 arquivos)
- `domain/value-objects/ChunkMetadata.ts` (add collectionName)
- `domain/errors/DomainErrors.ts` (add novos erros)
- `application/use-cases/IngestPdfUseCase.ts` (registry + collectionName)
- `application/use-cases/GetApiStatusUseCase.ts` (registry)
- `application/use-cases/GetReadinessUseCase.ts` (registry + fix Result)
- `infrastructure/http/controllers/QueryController.ts` (RoutedQueryUseCase)
- `infrastructure/http/controllers/IngestController.ts` (collectionName)
- `src/modules/rag/index.ts` (nova DI)
- `src/config/config.ts` (multi-collection)
- `.env.example`

### Movidos (2 arquivos)
- `domain/services/IChunkingService.ts` → `application/ports/IChunkingService.ts`
- `shared/.../HealthController.ts` → `modules/rag/infrastructure/http/controllers/`

### Removidos (Sprint 6.4 — camada legada)
- `src/controllers/ragController.ts`
- `src/services/ragService.ts`
- `src/services/queryService.ts`
- `src/routes/ragRoutes.ts`
