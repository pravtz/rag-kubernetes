# RAG API — Retrieval-Augmented Generation com TypeScript, LangChain e Qdrant

Uma API educacional e limpa para ingestão e consulta de PDFs com geração de respostas em streaming usando RAG (Retrieval-Augmented Generation). Arquitetura DDD (Domain-Driven Design) com Ports & Adapters (Hexagonal), multi-collection e query routing inteligente.

## 🎯 Características

- **DDD Layered Architecture** — Domain, Application e Infrastructure com regra de dependência estrita
- **Ports & Adapters (Hexagonal)** — interfaces no domínio/aplicação, implementações na infraestrutura
- **Multi-Collection** — suporte a múltiplas collections Qdrant com roteamento automático de queries
- **Query Routing** — classificação inteligente de perguntas por collection via LLM
- **Reranking (RRF)** — Reciprocal Rank Fusion para combinar resultados de múltiplas collections
- **Streaming de Respostas** — tokens em tempo real via OpenAI
- **Ingestão de PDFs** — upload e indexação automática com LangChain
- **Busca Semântica** — recuperação vetorial com Qdrant
- **Composition Root** — DI manual com wiring explícito
- **Result Pattern** — `Result<T, E>` para erros previsíveis, sem exceptions
- **Swagger UI** — documentação OpenAPI 3.0 em `/api-docs`
- **Testes Unitários** — 10 suítes de testes com Jest + TypeScript
- **Docker Compose** — ambiente local consistente (API + Qdrant) com multi-stage build

## 📋 Pré-requisitos

- Node.js 20+ (ou use Docker)
- npm 10+
- OpenAI API key

## 🚀 Início Rápido

### 1. Clone / Prepare o Projeto

```bash
cd rag
cp .env.example .env
```

### 2. Preencha o `.env`

```bash
PORT=3000
NODE_ENV=development

# Obrigatório
OPENAI_API_KEY=sk-...
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# Multi-collection (CSV). Tem prioridade sobre QDRANT_COLLECTION_NAME.
QDRANT_COLLECTIONS=docs_padronizacao,docs_normas,docs_gerais
QDRANT_COLLECTION_DESCRIPTIONS=Documentos de padronização,Normas técnicas,Documentos gerais

# Single collection (retrocompatível, usado se QDRANT_COLLECTIONS estiver ausente)
# QDRANT_COLLECTION_NAME=rag_collection

CHUNK_SIZE=1000
CHUNK_OVERLAP=200
TOP_K=4
```

### 3. Instale Dependências

```bash
npm install
```

### 4. Rode Localmente (com Qdrant em Docker)

```bash
# Apenas o Qdrant em container (deixa a API em ts-node)
docker compose up qdrant -d

# Em outro terminal, inicie a API em dev mode
npm run dev
```

Ou com tudo em Docker:

```bash
docker compose up
```

A API sobe em `http://localhost:3000`. Documentação Swagger em `http://localhost:3000/api-docs`.

## 📡 API Endpoints

### Health & Status

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/health` | GET | Health check da API |
| `/api/rag/status` | GET | Status operacional + dependências |
| `/api/rag/ready` | GET | Readiness check (para K8s/deploy) |

### RAG Operations

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/rag/ingest` | POST | Upload e indexação de PDF (com collection opcional) |
| `/api/rag/query` | POST | Consulta multi-collection com routing + streaming |
| `/api/rag/question` | POST | Alias para `/query` |
| `/api/rag/pergunta` | POST | Alias para `/query` |
| `/api/rag/qdrant-info` | GET | Diagnósticos de todas as collections |

## 💡 Exemplos de Uso

### Health Check

```bash
curl http://localhost:3000/health
```

**Resposta:**
```json
{
  "status": "ok",
  "env": "development"
}
```

### Status da API

```bash
curl http://localhost:3000/api/rag/status
```

**Resposta:**
```json
{
  "status": "ok",
  "service": "rag-api",
  "env": "development",
  "timestamp": "2026-04-27T10:15:30.123Z",
  "uptimeSeconds": 42,
  "dependencies": {
    "qdrant": "reachable"
  }
}
```

### Readiness Check

```bash
curl http://localhost:3000/api/rag/ready
```

**Resposta (Ready):**
```json
{
  "status": "ready",
  "timestamp": "2026-04-27T10:15:35.456Z",
  "checks": {
    "qdrant": "reachable",
    "collection": "present"
  },
  "collectionName": "docs_padronizacao, docs_normas, docs_gerais",
  "pointsCount": 42
}
```

### Diagnósticos do Qdrant

```bash
curl http://localhost:3000/api/rag/qdrant-info
```

**Resposta:**
```json
{
  "status": "ok",
  "timestamp": "2026-04-27T10:15:40.789Z",
  "collections": [
    {
      "storeUrl": "http://qdrant:6333",
      "collectionName": "docs_padronizacao",
      "reachable": true,
      "collectionExists": true,
      "totalCollections": 3,
      "pointsCount": 42,
      "expectedVectorSize": 1536,
      "collectionStatus": "green"
    }
  ],
  "rag": {
    "topK": 4,
    "embeddingModel": "text-embedding-3-small",
    "collectionNames": ["docs_padronizacao", "docs_normas", "docs_gerais"]
  }
}
```

### Upload de PDF

```bash
# Ingest para a collection padrão
curl -X POST \
  -F "file=@documento.pdf" \
  http://localhost:3000/api/rag/ingest

# Ingest para uma collection específica
curl -X POST \
  -F "file=@faq.pdf" \
  -F "collection=faqs" \
  http://localhost:3000/api/rag/ingest
```

**Resposta:**
```json
{
  "message": "PDF ingested successfully",
  "chunks": 12
}
```

### Consulta com Streaming (Multi-Collection Routing)

```bash
# Routing automático — a API escolhe as collections relevantes
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"question":"O que é RAG?"}' \
  http://localhost:3000/api/rag/query

# Forçar collections específicas
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"question":"O que é RAG?","forceCollections":["docs"]}' \
  http://localhost:3000/api/rag/query
```

**Resposta (streaming `text/plain`):**
```
RAG é uma abordagem que combina retrieval...
```

## 🏗️ Arquitetura

O projeto segue **DDD Layered Architecture** com **Ports & Adapters (Hexagonal)**.
Dependências apontam sempre para dentro: `infrastructure → application → domain`.

```
src/
├── modules/rag/                     # Bounded Context
│   ├── domain/                      # Camada pura — zero dependências externas
│   │   ├── entities/
│   │   │   └── Document.ts          # RagDocument (id, filename, totalPages)
│   │   ├── value-objects/
│   │   │   ├── Chunk.ts             # Fragmento de documento imutável
│   │   │   ├── ChunkMetadata.ts     # Metadados do chunk (id, index, source, page)
│   │   │   ├── Question.ts          # Pergunta do usuário (valida não-vazio)
│   │   │   ├── QueryIntent.ts       # Decisão de roteamento (collections + confiança)
│   │   │   └── ScoredChunk.ts       # Chunk com score de reranking
│   │   ├── repositories/
│   │   │   ├── IVectorRepository.ts       # Port — operações por collection
│   │   │   └── IVectorRepositoryRegistry.ts  # Port — acesso multi-collection
│   │   ├── errors/
│   │   │   └── DomainErrors.ts      # Erros de domínio tipados
│   │   └── events/
│   │       └── DocumentIngested.ts  # Evento de domínio
│   │
│   ├── application/                 # Orquestração — depende apenas do domínio
│   │   ├── use-cases/
│   │   │   ├── IngestPdfUseCase.ts        # Upload → chunks → Qdrant
│   │   │   ├── RoutedQueryUseCase.ts      # Multi-collection routing + reranking
│   │   │   ├── QueryDocumentsUseCase.ts   # Consulta single-collection (fallback)
│   │   │   ├── GetApiStatusUseCase.ts     # Status + dependências
│   │   │   ├── GetReadinessUseCase.ts     # Readiness probe
│   │   │   └── GetQdrantInfoUseCase.ts    # Diagnósticos
│   │   ├── ports/
│   │   │   ├── ILlmService.ts         # Streaming de respostas
│   │   │   ├── IEmbeddingService.ts    # Geração de embeddings
│   │   │   ├── IPdfLoader.ts          # Extração de PDF
│   │   │   ├── IChunkingService.ts    # Divisão em chunks
│   │   │   ├── IQueryRouter.ts        # Classificação → collections
│   │   │   └── IReranker.ts           # Reranking multi-collection (RRF)
│   │   ├── dtos/                      # DTOs de fronteira
│   │   └── mappers/                   # Conversão entre camadas
│   │
│   ├── infrastructure/               # Detalhes técnicos — implementa ports
│   │   ├── adapters/
│   │   │   ├── LangChainLlmAdapter.ts        → ILlmService
│   │   │   ├── LangChainEmbeddingAdapter.ts  → IEmbeddingService
│   │   │   ├── LangChainPdfLoaderAdapter.ts  → IPdfLoader
│   │   │   ├── LangChainChunkingAdapter.ts   → IChunkingService
│   │   │   ├── LlmQueryRouterAdapter.ts      → IQueryRouter
│   │   │   └── RRFRerankerAdapter.ts         → IReranker
│   │   ├── persistence/qdrant/
│   │   │   ├── QdrantClientFactory.ts         # Singleton client
│   │   │   ├── QdrantVectorRepository.ts      → IVectorRepository
│   │   │   ├── QdrantVectorRepositoryRegistry.ts → IVectorRepositoryRegistry
│   │   │   └── QdrantDiagnostics.ts           # Diagnósticos
│   │   └── http/
│   │       ├── controllers/           # Controllers finos (sem lógica de negócio)
│   │       │   ├── IngestController.ts
│   │       │   ├── QueryController.ts
│   │       │   └── HealthController.ts
│   │       ├── routes/
│   │       │   ├── ragRoutes.ts
│   │       │   └── healthRoutes.ts
│   │       └── middlewares/
│   │           └── uploadMiddleware.ts
│   │
│   └── index.ts                      # Composition Root — DI manual
│
├── shared/                           # Cross-cutting (compartilhado entre módulos)
│   ├── domain/                       # Entity, ValueObject, AggregateRoot base
│   ├── application/                  # UseCase<In, Out>, Result<T, E>
│   ├── errors/                       # AppError → DomainError, ApplicationError, InfrastructureError
│   └── infrastructure/               # asyncHandler, errorMiddleware
│
├── config/
│   ├── config.ts                     # Env vars centralizadas (fail-fast)
│   └── swagger.ts                    # OpenAPI 3.0 spec
├── app.ts                            # Express setup (CORS, Swagger, rotas, error handler)
└── server.ts                         # Entry point
```

> **Nota:** Os arquivos em `src/controllers/`, `src/services/`, `src/routes/ragRoutes.ts` e `src/utils/` são **shims de compatibilidade depreciados** que re-exportam das novas localizações. Não adicione código novo ali.

### Regra de Dependência

```
infrastructure → application → domain
```

- `domain/` **NÃO** importa de `application/` ou `infrastructure/`
- `application/` **NÃO** importa de `infrastructure/`
- `infrastructure/` pode importar de `application/` e `domain/`

### Fluxo de Ingestão

1. **Upload** → PDF temporário via multer (máx 50 MB)
2. **Load** → `IPdfLoader` (LangChainPdfLoaderAdapter) extrai páginas
3. **Split** → `IChunkingService` divide em chunks com sobreposição
4. **Domain Objects** → Cria `Chunk` + `ChunkMetadata` com UUIDs
5. **Ensure Collection** → Cria collection no Qdrant se não existir
6. **Store** → `IVectorRepository.addDocuments()` persiste vetores

### Fluxo de Consulta (Multi-Collection)

1. **Validate** → `Question` value object valida input não-vazio
2. **Route** → `IQueryRouter.classify()` identifica collections relevantes (ou usa `forceCollections`)
3. **Search** → Busca paralela em todas as collections alvo
4. **Rerank** → `IReranker` aplica Reciprocal Rank Fusion (RRF) nos resultados combinados
5. **Context** → Monta contexto a partir dos chunks mais relevantes
6. **Stream** → `ILlmService.streamResponse()` envia tokens em tempo real

## 🧪 Testes

O projeto inclui 10 suítes de testes cobrindo:

| Suíte | Escopo |
|-------|--------|
| `config.test.ts` | Env vars, multi-collection parsing, fail-fast |
| `domain-value-objects.test.ts` | Chunk, Question, QueryIntent, validações |
| `adapters.test.ts` | Adapters LangChain (PDF, chunking, LLM, embedding) |
| `controllers.test.ts` | IngestController, QueryController, HealthController |
| `routed-query-usecase.test.ts` | Multi-collection routing, reranking, streaming |
| `chunking.test.ts` | Lógica de splitting de documentos |
| `qdrant-utils.test.ts` | Diagnósticos, vector sizes, criação de collection |
| `error-middleware.test.ts` | AppError, normalização do error handler |
| `upload-middleware.test.ts` | Multer, validação de PDF, limites de tamanho |
| `swagger.test.ts` | Estrutura do documento OpenAPI |

```bash
npm test                 # Rodar todos
npm run test:watch       # Modo watch
npm run test:coverage    # Com relatório de cobertura
```

> **Nota:** Jest pode retornar exit code 1 por um log assíncrono do client Qdrant ("Cannot log after tests are done") mesmo com todos os testes passando. `npm run build` é uma alternativa estável para type-checking.

Consulte [README.TESTING.md](README.TESTING.md) para detalhes completos.

## 📦 Scripts

```bash
npm run dev             # Desenvolver (nodemon + ts-node, watch mode)
npm run build           # Compilar TypeScript
npm run start           # Rodar em produção (node dist/server.js)
npm test                # Executar testes
npm run test:watch      # Testes em watch mode
npm run test:coverage   # Cobertura de testes
```

## 🐳 Docker

### Multi-Stage Build

O `Dockerfile` usa multi-stage build com `node:20-alpine`:
- **Builder** — instala deps, compila TypeScript
- **Runner** — apenas deps de produção + dist compilado, com healthcheck integrado

### Docker Compose

O `docker-compose.yml` inclui:
- **Qdrant** — vetor DB na porta `6333` com volume persistente e healthcheck
- **API** — Node.js na porta `3000`, aguarda Qdrant ficar healthy antes de iniciar

Ambos na mesma rede `rag_network` com `platform: linux/amd64` explícito.

```bash
# Rodar tudo
docker compose up

# Apenas Qdrant (API local com npm run dev)
docker compose up qdrant -d

# Limpar
docker compose down
docker volume rm rag_qdrant_data  # Remove dados persistidos
```

## 🔧 Variáveis de Ambiente

| Var | Obrigatória | Default | Descrição |
|-----|-------------|---------|-----------|
| `OPENAI_API_KEY` | ✓ | — | Chave da API OpenAI |
| `QDRANT_URL` | ✓ | — | URL do Qdrant (ex: `http://localhost:6333`) |
| `QDRANT_COLLECTIONS` | ✓¹ | — | Collections separadas por vírgula (ex: `docs_padronizacao,docs_normas`) |
| `QDRANT_COLLECTION_DESCRIPTIONS` | — | `""` por collection | Descrições por collection (mesma ordem de `QDRANT_COLLECTIONS`) |
| `QDRANT_COLLECTION_NAME` | ✓¹ | `rag_collection`² | Nome single-collection (retrocompatível) |
| `PORT` | — | `3000` | Porta da API |
| `NODE_ENV` | — | `development` | Ambiente (`development`/`production`/`test`) |
| `OPENAI_CHAT_MODEL` | — | `gpt-4o-mini` | Modelo para geração de respostas |
| `OPENAI_EMBEDDING_MODEL` | — | `text-embedding-3-small` | Modelo de embeddings |
| `QDRANT_API_KEY` | — | — | API key do Qdrant (para instâncias protegidas) |
| `CHUNK_SIZE` | — | `1000` | Tamanho de chunk em caracteres |
| `CHUNK_OVERLAP` | — | `200` | Sobreposição entre chunks |
| `TOP_K` | — | `4` | Número de chunks para retrieval |

> ¹ Pelo menos uma das duas é obrigatória: `QDRANT_COLLECTIONS` (multi-collection) **ou** `QDRANT_COLLECTION_NAME` (single). Se ambas estiverem definidas, `QDRANT_COLLECTIONS` tem prioridade.
>
> ² Quando `QDRANT_COLLECTIONS` está ausente e `QDRANT_COLLECTION_NAME` também, o fallback interno é `rag_collection`.

## 📐 Padrões de Design

### Ports & Adapters

O domínio e a aplicação definem **interfaces (ports)**; a infraestrutura as **implementa (adapters)**:

| Port (interface) | Adapter (implementação) |
|-----------------|------------------------|
| `ILlmService` | `LangChainLlmAdapter` |
| `IEmbeddingService` | `LangChainEmbeddingAdapter` |
| `IPdfLoader` | `LangChainPdfLoaderAdapter` |
| `IChunkingService` | `LangChainChunkingAdapter` |
| `IQueryRouter` | `LlmQueryRouterAdapter` |
| `IReranker` | `RRFRerankerAdapter` |
| `IVectorRepository` | `QdrantVectorRepository` |
| `IVectorRepositoryRegistry` | `QdrantVectorRepositoryRegistry` |

### Use Cases

Cada use case implementa `UseCase<Input, Output>` e retorna `Result<T, E>`:

| Use Case | Responsabilidade |
|----------|-----------------|
| `IngestPdfUseCase` | PDF → chunks → embeddings → Qdrant |
| `RoutedQueryUseCase` | Routing multi-collection → busca paralela → RRF reranking → streaming |
| `QueryDocumentsUseCase` | Consulta single-collection (fallback) |
| `GetApiStatusUseCase` | Status operacional + dependências |
| `GetReadinessUseCase` | Readiness probe (verifica collections + Qdrant) |
| `GetQdrantInfoUseCase` | Diagnósticos detalhados de cada collection |

### Erros e Respostas

- `Result<T, E>` para erros previsíveis (input inválido, collection desconhecida)
- Exceções apenas para falhas inesperadas
- Controllers finos: extraem request, chamam use case, formatam response
- Middleware centralizado para tratamento de erros

Status HTTP:
- `400` — Input inválido (PDF faltando, question vazia)
- `503` — Dependência indisponível (Qdrant offline)
- `500` — Erro interno

## 🎓 Design Educacional

O código foi estruturado para ensinar:
- **DDD** — Entities, Value Objects, Repositories, Domain Errors, Domain Events
- **Hexagonal Architecture** — Ports & Adapters com inversão de dependência
- **Composition Root** — DI manual sem framework
- **Result Pattern** — Tratamento de erros explícito sem exceções
- **Multi-collection RAG** — Routing, busca paralela e reranking
- **Streaming** — Server-Sent Events com Express
- **Integração LangChain + Qdrant** — Adapters desacoplados
- **Testes unitários** — Jest com mocks e injeção de dependência

Cada módulo tem nomes claros e comentários mínimos (apenas onde não óbvio).

## 📋 Critérios de Aceite

- ✅ `POST /ingest` aceita PDF e indexa no Qdrant (com collection opcional)
- ✅ Collections criadas automaticamente antes da primeira escrita
- ✅ Chunks salvos com UUIDs e metadados (source, page, collectionName)
- ✅ `POST /query` roteia para collections relevantes e retorna resposta com contexto
- ✅ Suporte a `forceCollections` para override manual de routing
- ✅ Reranking via Reciprocal Rank Fusion (RRF) para resultados multi-collection
- ✅ Resposta em streaming (`text/plain`, `Transfer-Encoding: chunked`)
- ✅ Projeto sobe com `docker compose up` (multi-stage build)
- ✅ Arquitetura DDD completa com Ports & Adapters
- ✅ Composition Root com DI manual
- ✅ Testes unitários (10 suítes)
- ✅ Configuração centralizada com fail-fast
- ✅ Swagger UI em `/api-docs`

## 🤝 Contribuindo

1. Instale dependências: `npm install`
2. Rode testes: `npm test`
3. Compile: `npm run build`
4. Faça suas mudanças em `src/modules/rag/` (não nos arquivos depreciados)
5. Respeite a regra de dependência: `infrastructure → application → domain`
6. Novos ports vão em `application/ports/`, novos adapters em `infrastructure/adapters/`
7. Envie PR

## 📝 Licença

MIT

## 🔗 Referências

- [LangChain Docs](https://js.langchain.com)
- [Qdrant Docs](https://qdrant.tech/documentation)
- [OpenAI API](https://platform.openai.com/docs)
- [Express.js](https://expressjs.com)
