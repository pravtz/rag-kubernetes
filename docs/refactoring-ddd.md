# Plano de Refatoração para Arquitetura DDD

> Referência arquitetural: `docs/arquitetura-ddd-api.md`
> Data: 27/04/2026

---

## 1. Análise da Estrutura Atual

```
src/
├── server.ts                      # Bootstrap + configuração Express (misturados)
├── config/
│   └── config.ts                  # Env vars
├── controllers/
│   └── ragController.ts           # 5 handlers: ingest, query, status, readiness, qdrant-info
├── middleware/
│   ├── errorMiddleware.ts         # Error handler global
│   └── uploadMiddleware.ts        # Multer PDF
├── routes/
│   └── ragRoutes.ts               # Todas as rotas
├── services/
│   ├── ragService.ts              # Ingestão PDF + resposta streaming
│   └── queryService.ts            # Busca vetorial + contexto
├── utils/
│   ├── appError.ts                # AppError genérico
│   ├── asyncHandler.ts            # Wrapper async para Express
│   ├── chunking.ts                # Splitting de documentos
│   └── qdrant.ts                  # Client Qdrant + helpers
└── __tests__/
    ├── chunking.test.ts
    ├── config.test.ts
    ├── controllers.test.ts
    ├── error-middleware.test.ts
    ├── qdrant-utils.test.ts
    └── upload-middleware.test.ts
```

---

## 2. Bounded Contexts Identificados

Analisando rotas, serviços e modelos, a API possui **um único bounded context principal**: **RAG** (Retrieval-Augmented Generation), com duas capacidades de negócio:

| Capacidade | Responsabilidade | Arquivos atuais |
|---|---|---|
| **Ingestion** | Upload de PDF, chunking, embedding e persistência vetorial | `uploadMiddleware.ts`, `ragService.ts/ingestPdf`, `chunking.ts`, `qdrant.ts` |
| **Query** | Busca semântica, montagem de contexto, resposta streaming via LLM | `queryService.ts`, `ragService.ts/generateStreamingResponse` |
| **Health** (cross-cutting) | Status da API, readiness, diagnóstico Qdrant | `ragController.ts` (status/ready/qdrant-info) |

> **Decisão**: manter tudo sob `src/modules/rag/` como um único módulo. Health/status pode ficar em `src/shared/infrastructure/http/` pois é transversal.

---

## 3. Violações do DDD Identificadas

### 3.1 Ausência de Camada de Domínio

| Violação | Detalhe |
|---|---|
| Sem entidades | Não existe `Document`, `Chunk` ou `EmbeddedChunk` como entidades de domínio |
| Sem value objects | `ChunkMetadata`, `EmbeddingModel`, `Question` não existem como VOs imutáveis |
| Sem aggregates | Não há raiz de agregado que proteja invariantes de `Document → Chunks` |
| Sem interfaces de repositório | `qdrant.ts` expõe implementação concreta diretamente; não há `IVectorRepository` no domínio |
| Sem erros de domínio | `AppError` é genérico; não existe hierarquia `DomainError → ApplicationError → InfrastructureError` |

### 3.2 Ausência de Camada de Aplicação

| Violação | Detalhe |
|---|---|
| Sem use cases | `ingestPdf()` e `retrieveContext()` são funções soltas; deveriam ser classes com `execute()` |
| Sem DTOs | Entidades/dados internos são expostos diretamente nas respostas HTTP |
| Sem mappers | Não há conversão explícita entre camadas |
| Sem ports | Interfaces para OpenAI e Qdrant não existem; serviços dependem de implementações concretas |
| Sem Result pattern | Erros previsíveis são lançados como exceções em vez de retornar `Result<T, E>` |

### 3.3 Violações da Regra de Dependência

| Arquivo | Violação | Sentido errado |
|---|---|---|
| `ragService.ts` | Importa diretamente `QdrantVectorStore`, `PDFLoader`, `ChatOpenAI` | Lógica de negócio acoplada a infra |
| `queryService.ts` | Importa `QdrantVectorStore`, `OpenAIEmbeddings` | Lógica de aplicação acoplada a infra |
| `ragController.ts` | Importa `ragService`, `queryService`, `qdrant utils`, `config` | Controller acoplado a múltiplas camadas |
| `chunking.ts` | Importa `config` diretamente | Utilitário acoplado a configuração global |

### 3.4 Controllers com Lógica de Negócio

| Controller | Lógica que deveria estar no domínio/aplicação |
|---|---|
| `ingest()` | Gerenciamento de arquivo temporário (fs.unlink), decisão de status HTTP |
| `query()` | Configuração de headers de streaming, orquestração contexto → LLM |
| `getApiStatus()` | Montagem da resposta de status com lógica condicional |
| `getApiReadiness()` | Lógica condicional complexa com múltiplos early returns |
| `getQdrantInfo()` | Orquestração de diagnósticos e montagem de payload |

### 3.5 Problemas Estruturais

- **Sem Composition Root**: dependências são resolvidas via imports diretos
- **Sem `app.ts`**: server.ts mistura bootstrap e configuração Express
- **Tests flat**: todos em `__tests__/` sem separação por módulo/camada
- **Sem path aliases**: imports usam caminhos relativos (`../utils/appError`)
- **Sem validação de input**: não há schemas Zod/class-validator nos endpoints

---

## 4. Estrutura Alvo (DDD)

```
src/
├── modules/
│   └── rag/
│       ├── domain/
│       │   ├── entities/
│       │   │   └── Document.ts              # Entidade Document (id, filename, pages, createdAt)
│       │   ├── value-objects/
│       │   │   ├── Chunk.ts                  # VO: conteúdo do chunk + metadata
│       │   │   ├── ChunkMetadata.ts          # VO: chunkId, chunkIndex, source, page
│       │   │   └── Question.ts               # VO: pergunta validada e normalizada
│       │   ├── aggregates/
│       │   │   └── IngestionResult.ts        # Agregado raiz: Document + Chunks
│       │   ├── repositories/
│       │   │   └── IVectorRepository.ts      # Interface: addDocuments, similaritySearch
│       │   ├── services/
│       │   │   └── ChunkingService.ts        # Domain service: splitting de documentos
│       │   ├── events/
│       │   │   └── DocumentIngested.ts       # Evento: documento foi ingerido
│       │   └── errors/
│       │       └── DomainError.ts            # Erros de domínio (InvalidDocument, etc.)
│       │
│       ├── application/
│       │   ├── use-cases/
│       │   │   ├── IngestPdfUseCase.ts       # Caso de uso: ingestão PDF
│       │   │   ├── QueryDocumentsUseCase.ts  # Caso de uso: busca + resposta streaming
│       │   │   ├── GetApiStatusUseCase.ts    # Caso de uso: status da API
│       │   │   └── GetReadinessUseCase.ts    # Caso de uso: readiness check
│       │   ├── dtos/
│       │   │   ├── IngestResultDTO.ts        # DTO: resultado da ingestão
│       │   │   ├── QueryRequestDTO.ts        # DTO: entrada da query
│       │   │   ├── ApiStatusDTO.ts           # DTO: status da API
│       │   │   └── ReadinessDTO.ts           # DTO: readiness check
│       │   ├── mappers/
│       │   │   ├── IngestResultMapper.ts     # Mapper: IngestionResult → IngestResultDTO
│       │   │   └── StatusMapper.ts           # Mapper: dados internos → StatusDTO
│       │   └── ports/
│       │       ├── IEmbeddingService.ts      # Port: geração de embeddings
│       │       ├── ILlmService.ts            # Port: geração de respostas LLM
│       │       └── IPdfLoader.ts             # Port: carregamento de PDF
│       │
│       ├── infrastructure/
│       │   ├── persistence/
│       │   │   ├── qdrant/
│       │   │   │   ├── QdrantVectorRepository.ts  # Implementação IVectorRepository
│       │   │   │   ├── QdrantClientFactory.ts     # Factory do client Qdrant
│       │   │   │   └── QdrantDiagnostics.ts       # Diagnósticos Qdrant
│       │   │   └── mappers/
│       │   │       └── QdrantDocumentMapper.ts     # Conversão domínio ↔ Qdrant
│       │   ├── http/
│       │   │   ├── controllers/
│       │   │   │   ├── IngestController.ts        # Thin controller: ingest
│       │   │   │   └── QueryController.ts         # Thin controller: query
│       │   │   ├── routes/
│       │   │   │   └── ragRoutes.ts               # Rotas do módulo RAG
│       │   │   ├── middlewares/
│       │   │   │   └── uploadMiddleware.ts         # Multer PDF
│       │   │   └── validators/
│       │   │       ├── ingestValidator.ts          # Schema de validação para ingest
│       │   │       └── queryValidator.ts           # Schema de validação para query
│       │   └── adapters/
│       │       ├── LangChainEmbeddingAdapter.ts    # Impl IEmbeddingService via LangChain
│       │       ├── LangChainLlmAdapter.ts          # Impl ILlmService via LangChain/OpenAI
│       │       └── LangChainPdfLoaderAdapter.ts    # Impl IPdfLoader via LangChain
│       │
│       └── index.ts                               # Composition Root do módulo
│
├── shared/
│   ├── domain/
│   │   ├── Entity.ts                  # Base class Entity<T> com identidade
│   │   ├── ValueObject.ts            # Base class ValueObject com equals()
│   │   └── AggregateRoot.ts          # Base class AggregateRoot
│   ├── application/
│   │   ├── UseCase.ts                # Interface base UseCase<Input, Output>
│   │   └── Result.ts                 # Result<T, E> pattern
│   ├── infrastructure/
│   │   ├── http/
│   │   │   ├── controllers/
│   │   │   │   └── HealthController.ts   # Endpoints health/status/readiness
│   │   │   └── routes/
│   │   │       └── healthRoutes.ts       # Rotas de health
│   │   ├── middleware/
│   │   │   ├── errorMiddleware.ts        # Error handler global
│   │   │   └── asyncHandler.ts          # Async handler wrapper
│   │   └── logger/
│   │       └── logger.ts                # Logger centralizado (futuro)
│   └── errors/
│       ├── AppError.ts                  # Erro base da aplicação
│       ├── DomainError.ts               # Base para erros de domínio
│       ├── ApplicationError.ts          # Base para erros de aplicação
│       └── InfrastructureError.ts       # Base para erros de infraestrutura
│
├── config/
│   └── config.ts                        # Configurações (env)
├── app.ts                               # Configuração do Express (middlewares, rotas)
└── server.ts                            # Bootstrap (listen)
```

---

## 5. Mapeamento: Arquivo Atual → Destino

| Arquivo Atual | Destino DDD | Ação |
|---|---|---|
| `server.ts` | `server.ts` + `app.ts` | **Dividir**: separar bootstrap de configuração Express |
| `config/config.ts` | `config/config.ts` | **Manter** com ajustes mínimos |
| `controllers/ragController.ts` → `ingest()` | `modules/rag/infrastructure/http/controllers/IngestController.ts` | **Extrair**: thin controller, delegar para use case |
| `controllers/ragController.ts` → `query()` | `modules/rag/infrastructure/http/controllers/QueryController.ts` | **Extrair**: thin controller, delegar para use case |
| `controllers/ragController.ts` → `getApiStatus()` | `shared/infrastructure/http/controllers/HealthController.ts` | **Mover**: cross-cutting |
| `controllers/ragController.ts` → `getApiReadiness()` | `shared/infrastructure/http/controllers/HealthController.ts` | **Mover**: cross-cutting |
| `controllers/ragController.ts` → `getQdrantInfo()` | `modules/rag/infrastructure/http/controllers/QueryController.ts` ou controller dedicado | **Mover**: específico do módulo RAG |
| `routes/ragRoutes.ts` | `modules/rag/infrastructure/http/routes/ragRoutes.ts` | **Mover** + ajustar imports |
| `middleware/errorMiddleware.ts` | `shared/infrastructure/middleware/errorMiddleware.ts` | **Mover** + adaptar para hierarquia de erros |
| `middleware/uploadMiddleware.ts` | `modules/rag/infrastructure/http/middlewares/uploadMiddleware.ts` | **Mover** (específico do módulo) |
| `services/ragService.ts` → `ingestPdf()` | `modules/rag/application/use-cases/IngestPdfUseCase.ts` | **Refatorar**: converter para classe com `execute()`, extrair domínio |
| `services/ragService.ts` → `generateStreamingResponse()` | `modules/rag/infrastructure/adapters/LangChainLlmAdapter.ts` | **Extrair**: implementação de port `ILlmService` |
| `services/queryService.ts` | `modules/rag/application/use-cases/QueryDocumentsUseCase.ts` | **Refatorar**: converter para classe com `execute()` |
| `utils/appError.ts` | `shared/errors/AppError.ts` | **Mover** + criar subclasses |
| `utils/asyncHandler.ts` | `shared/infrastructure/middleware/asyncHandler.ts` | **Mover** |
| `utils/chunking.ts` | `modules/rag/domain/services/ChunkingService.ts` | **Refatorar**: domain service puro |
| `utils/qdrant.ts` → client/helpers | `modules/rag/infrastructure/persistence/qdrant/QdrantClientFactory.ts` | **Extrair**: separar factory do client |
| `utils/qdrant.ts` → diagnostics | `modules/rag/infrastructure/persistence/qdrant/QdrantDiagnostics.ts` | **Extrair**: separar diagnósticos |
| `utils/qdrant.ts` → ensureCollection | `modules/rag/infrastructure/persistence/qdrant/QdrantVectorRepository.ts` | **Absorver**: dentro da implementação do repositório |

---

## 6. Plano de Execução por Fases

### Fase 0 — Preparação (sem alteração funcional)

1. **Criar `app.ts`**: extrair configuração Express de `server.ts`
   - `app.ts` → monta middlewares, rotas, error handler e exporta `app`
   - `server.ts` → importa `app` e chama `app.listen()`
   - **Verificação**: `npm run build` + testes passam

2. **Configurar path aliases** no `tsconfig.json`:
   ```json
   "paths": {
     "@modules/*": ["modules/*"],
     "@shared/*": ["shared/*"],
     "@config/*": ["config/*"]
   }
   ```
   - Atualizar `jest.config.js` com `moduleNameMapper`
   - **Verificação**: testes e build passam

### Fase 1 — Shared Layer (fundação)

3. **Criar `shared/domain/Entity.ts`**:
   ```ts
   export abstract class Entity<T> {
     protected readonly _id: T;
     get id(): T { return this._id; }
     constructor(id: T) { this._id = id; }
     equals(other: Entity<T>): boolean { return this._id === other._id; }
   }
   ```

4. **Criar `shared/domain/ValueObject.ts`**:
   ```ts
   export abstract class ValueObject<T> {
     protected readonly props: T;
     constructor(props: T) { this.props = Object.freeze(props); }
     abstract equals(other: ValueObject<T>): boolean;
   }
   ```

5. **Criar `shared/domain/AggregateRoot.ts`**:
   ```ts
   export abstract class AggregateRoot<T> extends Entity<T> {
     // Futuro: lista de domain events
   }
   ```

6. **Criar `shared/application/UseCase.ts`**:
   ```ts
   export interface UseCase<Input, Output> {
     execute(input: Input): Promise<Output>;
   }
   ```

7. **Criar `shared/application/Result.ts`**: padrão `Result<T, E>` com `ok()` e `fail()`

8. **Criar hierarquia de erros** em `shared/errors/`:
   - `AppError.ts` (mover de `utils/appError.ts`)
   - `DomainError.ts extends AppError`
   - `ApplicationError.ts extends AppError`
   - `InfrastructureError.ts extends AppError`

9. **Mover `asyncHandler.ts`** → `shared/infrastructure/middleware/asyncHandler.ts`

10. **Mover `errorMiddleware.ts`** → `shared/infrastructure/middleware/errorMiddleware.ts`
    - Atualizar `normalizeError()` para mapear `DomainError`, `ApplicationError`, `InfrastructureError`

- **Verificação**: `npm run build` + todos os testes passam com imports atualizados

### Fase 2 — Camada de Domínio do módulo RAG

11. **Criar `modules/rag/domain/entities/Document.ts`**:
    - Propriedades: `id: string`, `filename: string`, `totalPages: number`, `createdAt: Date`
    - Extend `Entity<string>`

12. **Criar `modules/rag/domain/value-objects/Chunk.ts`**:
    - Props: `content: string`, `metadata: ChunkMetadata`
    - Imutável, com `equals()`

13. **Criar `modules/rag/domain/value-objects/ChunkMetadata.ts`**:
    - Props: `chunkId: string`, `chunkIndex: number`, `source: string`, `page: number`
    - Imutável, com `equals()`

14. **Criar `modules/rag/domain/value-objects/Question.ts`**:
    - Props: `value: string`
    - Validação: não vazio, trimmed
    - Imutável, com `equals()`

15. **Criar `modules/rag/domain/repositories/IVectorRepository.ts`**:
    ```ts
    export interface IVectorRepository {
      addDocuments(chunks: Chunk[]): Promise<void>;
      similaritySearch(query: string, topK: number): Promise<Chunk[]>;
      isReachable(): Promise<boolean>;
      ensureCollection(): Promise<void>;
      getDiagnostics(): Promise<VectorStoreDiagnostics>;
    }
    ```

16. **Criar `modules/rag/domain/services/ChunkingService.ts`**:
    - Interface/contrato puro: `splitDocuments(content: string[]): Chunk[]`
    - Sem dependência de LangChain no domínio

17. **Criar `modules/rag/domain/errors/DomainError.ts`**:
    - `InvalidDocumentError`, `EmptyQuestionError`, `ChunkingError`

18. **Criar `modules/rag/domain/events/DocumentIngested.ts`**:
    - Event: `{ documentId, chunksCount, timestamp }`

- **Verificação**: camada de domínio compila sem imports de `@langchain`, `express`, `qdrant`, etc.

### Fase 3 — Camada de Aplicação do módulo RAG

19. **Criar ports** em `modules/rag/application/ports/`:
    - `IEmbeddingService.ts`: `embed(text: string): Promise<number[]>`
    - `ILlmService.ts`: `streamResponse(prompt: string, onToken: (token: string) => void): Promise<void>`
    - `IPdfLoader.ts`: `load(filePath: string): Promise<{ content: string; metadata: any }[]>`
    - `IChunkingService.ts`: `split(documents: RawDocument[]): Promise<Chunk[]>`

20. **Criar DTOs** em `modules/rag/application/dtos/`:
    - `IngestResultDTO.ts`: `{ message: string; chunks: number }`
    - `QueryRequestDTO.ts`: `{ question: string }`
    - `QueryResponseDTO.ts`: metadados da resposta
    - `ApiStatusDTO.ts`: payload de status
    - `ReadinessDTO.ts`: payload de readiness

21. **Criar `IngestPdfUseCase.ts`**:
    ```ts
    export class IngestPdfUseCase implements UseCase<IngestPdfInput, Result<IngestResultDTO, AppError>> {
      constructor(
        private pdfLoader: IPdfLoader,
        private chunkingService: IChunkingService,
        private vectorRepository: IVectorRepository,
      ) {}

      async execute(input: { filePath: string }): Promise<Result<IngestResultDTO, AppError>> {
        const docs = await this.pdfLoader.load(input.filePath);
        const chunks = await this.chunkingService.split(docs);
        await this.vectorRepository.ensureCollection();
        await this.vectorRepository.addDocuments(chunks);
        return Result.ok({ message: 'PDF ingested successfully', chunks: chunks.length });
      }
    }
    ```

22. **Criar `QueryDocumentsUseCase.ts`**:
    ```ts
    export class QueryDocumentsUseCase implements UseCase<QueryInput, Result<void, AppError>> {
      constructor(
        private vectorRepository: IVectorRepository,
        private llmService: ILlmService,
      ) {}

      async execute(input: { question: string; topK: number; onToken: (t: string) => void }): Promise<Result<void, AppError>> {
        const chunks = await this.vectorRepository.similaritySearch(input.question, input.topK);
        const context = chunks.map(c => c.content).join('\n\n---\n\n');
        await this.llmService.streamResponse(input.question, context, input.onToken);
        return Result.ok(undefined);
      }
    }
    ```

23. **Criar `GetApiStatusUseCase.ts`** e **`GetReadinessUseCase.ts`**:
    - Delegam para `IVectorRepository.isReachable()` e `getDiagnostics()`

24. **Criar mappers** em `modules/rag/application/mappers/`:
    - Conversão entre entidades/VOs e DTOs

- **Verificação**: camada de aplicação compila sem imports de infra (qdrant, langchain, express)

### Fase 4 — Camada de Infraestrutura do módulo RAG

25. **Criar `QdrantVectorRepository.ts`** em `infrastructure/persistence/qdrant/`:
    - Implementa `IVectorRepository`
    - Absorve lógica de `qdrant.ts` (client, `ensureCollection`, `isReachable`, `getDiagnostics`)
    - Absorve lógica de `queryService.ts` (`similaritySearch` via `QdrantVectorStore`)

26. **Criar `QdrantClientFactory.ts`**: factory para instanciar o `QdrantClient` singleton

27. **Criar adapters** em `infrastructure/adapters/`:
    - `LangChainEmbeddingAdapter.ts` → implementa `IEmbeddingService`
    - `LangChainLlmAdapter.ts` → implementa `ILlmService` (absorve `generateStreamingResponse`)
    - `LangChainPdfLoaderAdapter.ts` → implementa `IPdfLoader` (absorve `PDFLoader`)
    - `LangChainChunkingAdapter.ts` → implementa `IChunkingService` (absorve `chunking.ts`)

28. **Criar controllers thin** em `infrastructure/http/controllers/`:
    - `IngestController.ts`: extrai `req.file`, chama `IngestPdfUseCase.execute()`, formata resposta
    - `QueryController.ts`: extrai `req.body.question`, chama `QueryDocumentsUseCase.execute()`, stream

29. **Mover `uploadMiddleware.ts`** → `infrastructure/http/middlewares/uploadMiddleware.ts`

30. **Criar validators** (opcional mas recomendado):
    - `queryValidator.ts`: schema Zod para `{ question: string }`

31. **Criar rotas** em `infrastructure/http/routes/ragRoutes.ts`:
    - Mesmo mapeamento atual, usando novos controllers

32. **Criar Composition Root** em `modules/rag/index.ts`:
    ```ts
    // Instancia dependências concretas e wires tudo
    const qdrantClient = QdrantClientFactory.create(config.qdrant);
    const vectorRepository = new QdrantVectorRepository(qdrantClient, config);
    const embeddingService = new LangChainEmbeddingAdapter(config.openai);
    const llmService = new LangChainLlmAdapter(config.openai);
    const pdfLoader = new LangChainPdfLoaderAdapter();
    const chunkingService = new LangChainChunkingAdapter(config.chunking);

    const ingestUseCase = new IngestPdfUseCase(pdfLoader, chunkingService, vectorRepository);
    const queryUseCase = new QueryDocumentsUseCase(vectorRepository, llmService);

    const ingestController = new IngestController(ingestUseCase);
    const queryController = new QueryController(queryUseCase);

    export { ingestController, queryController, ragRoutes };
    ```

- **Verificação**: `npm run build` + aplicação inicializa + health check responde

### Fase 5 — Integração e Ajustes Finais

33. **Atualizar `app.ts`**:
    - Importar rotas do módulo via composition root
    - Importar health routes de shared
    - Montar error handler de shared

34. **Mover health/status** para `shared/infrastructure/http/`:
    - `HealthController.ts` com `getStatus()` e `getReadiness()`
    - `healthRoutes.ts`

35. **Atualizar `errorMiddleware.ts`**:
    - Mapear `DomainError` → 400/422
    - Mapear `ApplicationError` → 400/404
    - Mapear `InfrastructureError` → 500/503

36. **Atualizar testes**:
    - Mover/reorganizar testes por módulo e camada
    - Testes de domínio: sem mocks (lógica pura)
    - Testes de aplicação: mock dos ports/repositórios
    - Testes de infraestrutura: mock das libs externas
    - Atualizar imports nos testes existentes

37. **Atualizar `jest.config.js`**:
    - Adicionar `moduleNameMapper` para path aliases
    - Atualizar `roots` e `testMatch`

38. **Remover arquivos antigos** (após verificação de que tudo funciona):
    - `src/controllers/ragController.ts`
    - `src/services/ragService.ts`
    - `src/services/queryService.ts`
    - `src/utils/chunking.ts`
    - `src/utils/qdrant.ts`
    - `src/utils/appError.ts`
    - `src/utils/asyncHandler.ts`
    - `src/middleware/errorMiddleware.ts`
    - `src/middleware/uploadMiddleware.ts`
    - `src/routes/ragRoutes.ts`

- **Verificação final**: `npm run build` + `npm test` + `docker-compose up` + health check OK

---

## 7. Verificação dos Princípios DDD

### Checklist de conformidade pós-refatoração

| Princípio | Como será garantido |
|---|---|
| **Dependency Rule** | Domínio sem imports de infra/app; aplicação sem imports de infra; verificável por linting |
| **Entity com identidade** | `Document` extends `Entity<string>`, comparação por `id` |
| **Value Objects imutáveis** | `Chunk`, `ChunkMetadata`, `Question` usam `Object.freeze` + `equals()` |
| **Aggregate Root** | `IngestionResult` como raiz de consistência `Document + Chunks` |
| **Repository Pattern** | `IVectorRepository` no domínio, `QdrantVectorRepository` na infra |
| **Use Case = 1 classe, 1 execute()** | `IngestPdfUseCase`, `QueryDocumentsUseCase`, etc. |
| **Controllers thin** | Apenas: extrair request → chamar use case → formatar response |
| **DTOs na fronteira** | Entidades nunca expostas via HTTP; sempre via DTOs |
| **Result Pattern** | Use cases retornam `Result<T, E>` para erros previsíveis |
| **Ports & Adapters** | Interfaces em `application/ports/`, implementações em `infrastructure/adapters/` |
| **Composition Root** | `modules/rag/index.ts` wires todas as dependências |
| **Hierarquia de erros** | `DomainError`, `ApplicationError`, `InfrastructureError` → HTTP codes no middleware |
| **Domain Events** | `DocumentIngested` emitido após ingestão bem-sucedida |

---

## 8. Garantia de Não-Regressão

Para cada fase, os seguintes critérios devem ser atendidos **antes de avançar**:

| Critério | Como verificar |
|---|---|
| Build compila sem erros | `npm run build` |
| Testes existentes passam | `npm test` |
| Health check responde | `curl http://localhost:3000/health` retorna `{ status: 'ok' }` |
| Ingest funciona | Upload de PDF retorna `{ chunks: N }` |
| Query funciona | POST `/api/rag/query` retorna stream de tokens |
| Status/Readiness funciona | GET `/api/rag/status` e `/api/rag/ready` retornam payloads corretos |
| Docker Compose funciona | `docker-compose up` sem erros |

### Estratégia de migração segura

1. **Criar novos arquivos ANTES de deletar antigos** — período de coexistência
2. **Re-exportar dos antigos caminhos** durante transição (barrel files temporários)
3. **Mover testes incrementalmente**, rodando a suite completa a cada passo
4. **Nunca alterar lógica de negócio e estrutura simultaneamente** — uma mudança por vez

---

## 9. Arquivos que NÃO Mudam

| Arquivo | Motivo |
|---|---|
| `docker-compose.yml` | Infraestrutura Docker não afetada |
| `Dockerfile` | Build do container (pode precisar ajuste mínimo se paths mudarem) |
| `package.json` | Dependências permanecem as mesmas |
| `.env.example` | Variáveis de ambiente não mudam |
| `.github/copilot-instructions.md` | Guidelines de projeto (atualizar referências de pasta após conclusão) |

---

## 10. Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Quebra de imports em testes | Alta | Usar path aliases + atualizar `moduleNameMapper` primeiro |
| Regressão no streaming | Média | Manter teste E2E do query streaming durante toda a migração |
| Complexidade do Composition Root | Baixa | Começar com DI manual (sem container); container é otimização futura |
| Over-engineering do domínio | Média | Manter VOs e entidades simples; só adicionar complexidade quando justificada |
| Duplicação durante transição | Alta | Período de coexistência é temporário; delimitar claramente quando deletar antigos |

---

## 11. Ordem de Execução Resumida

```
Fase 0: Preparação
  └─ [0.1] Separar server.ts / app.ts
  └─ [0.2] Configurar path aliases

Fase 1: Shared Layer
  └─ [1.1] Base classes (Entity, ValueObject, AggregateRoot)
  └─ [1.2] UseCase interface + Result pattern
  └─ [1.3] Hierarquia de erros
  └─ [1.4] Mover asyncHandler + errorMiddleware

Fase 2: Domain Layer (modules/rag/domain/)
  └─ [2.1] Entidades e Value Objects
  └─ [2.2] Interfaces de repositório
  └─ [2.3] Domain Services
  └─ [2.4] Domain Errors + Events

Fase 3: Application Layer (modules/rag/application/)
  └─ [3.1] Ports (interfaces para serviços externos)
  └─ [3.2] DTOs e Mappers
  └─ [3.3] Use Cases

Fase 4: Infrastructure Layer (modules/rag/infrastructure/)
  └─ [4.1] Qdrant Repository + Client Factory
  └─ [4.2] LangChain Adapters
  └─ [4.3] Controllers thin
  └─ [4.4] Rotas + Middlewares + Validators
  └─ [4.5] Composition Root

Fase 5: Integração
  └─ [5.1] Atualizar app.ts e server.ts
  └─ [5.2] Health/Status para shared
  └─ [5.3] Atualizar errorMiddleware
  └─ [5.4] Migrar e reorganizar testes
  └─ [5.5] Limpar arquivos antigos
  └─ [5.6] Verificação final completa
```
