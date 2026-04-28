# API Endpoints — RAG API

Base URL: `http://localhost:3000`

Swagger UI: `http://localhost:3000/api-docs`

---

## Índice

- [Health Check](#health-check)
- [Status da API](#status-da-api)
- [Readiness](#readiness)
- [Upload de PDF](#upload-de-pdf)
- [Consulta (Query)](#consulta-query)
- [Diagnósticos do Qdrant](#diagnósticos-do-qdrant)
- [Formato de Erro](#formato-de-erro)

---

## Health Check

Verificação básica de que a API está respondendo.

```
GET /health
```

### Resposta — `200 OK`

```json
{
  "status": "ok",
  "env": "development"
}
```

| Campo | Tipo   | Descrição                      |
|-------|--------|--------------------------------|
| status | `"ok"` | Sempre `"ok"` se a API respondeu |
| env   | string | `development`, `production` ou `test` |

---

## Status da API

Status operacional com verificação de dependências.

```
GET /api/rag/status
```

### Resposta — `200 OK`

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

### Resposta — `503 Service Unavailable`

```json
{
  "status": "degraded",
  "service": "rag-api",
  "env": "development",
  "timestamp": "2026-04-27T10:15:30.123Z",
  "uptimeSeconds": 42,
  "dependencies": {
    "qdrant": "unreachable"
  }
}
```

| Campo          | Tipo   | Valores                      |
|----------------|--------|------------------------------|
| status         | string | `"ok"` \| `"degraded"`      |
| service        | string | Sempre `"rag-api"`           |
| env            | string | Ambiente atual               |
| timestamp      | string | ISO 8601                     |
| uptimeSeconds  | number | Tempo ativo em segundos      |
| dependencies.qdrant | string | `"reachable"` \| `"unreachable"` |

---

## Readiness

Probe de readiness para K8s/orquestradores. Verifica Qdrant e existência de todas as collections.

```
GET /api/rag/ready
```

### Resposta — `200 OK` (pronto)

```json
{
  "status": "ready",
  "timestamp": "2026-04-27T10:15:35.456Z",
  "checks": {
    "qdrant": "reachable",
    "collection": "present"
  },
  "collectionName": "docs_padronizacao, relatorio_de_custos, docs_gerais",
  "pointsCount": 42
}
```

### Resposta — `503 Service Unavailable` (não pronto)

```json
{
  "status": "not-ready",
  "timestamp": "2026-04-27T10:15:35.456Z",
  "checks": {
    "qdrant": "reachable",
    "collection": "missing"
  },
  "collectionName": "docs_padronizacao, relatorio_de_custos, docs_gerais",
  "pointsCount": 0
}
```

| Campo               | Tipo   | Valores                                        |
|----------------------|--------|-------------------------------------------------|
| status               | string | `"ready"` \| `"not-ready"`                     |
| timestamp            | string | ISO 8601                                        |
| checks.qdrant        | string | `"reachable"` \| `"unreachable"`               |
| checks.collection    | string | `"present"` \| `"missing"` \| `"unknown"`      |
| collectionName       | string | Nomes das collections (opcional)                |
| pointsCount          | number \| null | Total de pontos em todas as collections |

---

## Upload de PDF

Upload de arquivo PDF para ingestão. O arquivo é dividido em chunks, convertido em embeddings e armazenado no Qdrant.

```
POST /api/rag/ingest
```

### Request

**Content-Type:** `multipart/form-data`

| Campo      | Tipo   | Obrigatório | Descrição                                                   |
|------------|--------|-------------|--------------------------------------------------------------|
| file       | binary | ✓           | Arquivo PDF (máx 50 MB)                                     |
| collection | string | —           | Collection de destino (default: primeira collection configurada) |

### Exemplo

```bash
# Collection padrão
curl -X POST \
  -F "file=@documento.pdf" \
  http://localhost:3000/api/rag/ingest

# Collection específica
curl -X POST \
  -F "file=@relatorio.pdf" \
  -F "collection=relatorio_de_custos" \
  http://localhost:3000/api/rag/ingest
```

### Resposta — `200 OK`

```json
{
  "message": "PDF ingested successfully",
  "chunks": 12
}
```

| Campo   | Tipo   | Descrição                    |
|---------|--------|------------------------------|
| message | string | Mensagem de confirmação      |
| chunks  | number | Quantidade de chunks gerados |

### Erros

| Status | Código            | Quando                                               |
|--------|-------------------|------------------------------------------------------|
| 400    | `UPLOAD_ERROR`    | Arquivo não é PDF ou excede 50 MB                    |
| 400    | `VALIDATION_ERROR`| Nenhum arquivo enviado                               |
| 400    | `VALIDATION_ERROR`| Collection não existe nas configuradas               |

---

## Consulta (Query)

Consulta multi-collection com routing inteligente e resposta em streaming.

A API classifica automaticamente a pergunta para identificar quais collections são relevantes, busca em paralelo, aplica reranking (RRF) e transmite a resposta da LLM token a token.

```
POST /api/rag/query
POST /api/rag/question    ← alias
POST /api/rag/pergunta    ← alias
```

### Request

**Content-Type:** `application/json`

```json
{
  "question": "O que é RAG?",
  "forceCollections": ["docs_padronizacao"]
}
```

| Campo            | Tipo     | Obrigatório | Descrição                                                      |
|------------------|----------|-------------|----------------------------------------------------------------|
| question         | string   | ✓           | Pergunta a ser respondida                                      |
| forceCollections | string[] | —           | Força busca nessas collections, ignorando o routing automático |

### Exemplo

```bash
# Routing automático — a LLM escolhe as collections
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"question":"Quais são as normas de segurança?"}' \
  http://localhost:3000/api/rag/query

# Forçar collections específicas
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"question":"Quais são as normas?","forceCollections":["relatorio_de_custos"]}' \
  http://localhost:3000/api/rag/query
```

### Resposta — `200 OK` (streaming)

**Content-Type:** `text/plain; charset=utf-8`
**Transfer-Encoding:** `chunked`

A resposta é transmitida token a token conforme a LLM gera. O corpo é texto puro:

```
As normas de segurança incluem...
```

### Headers de resposta

| Header                 | Valor                         |
|------------------------|-------------------------------|
| Content-Type           | `text/plain; charset=utf-8`   |
| Transfer-Encoding      | `chunked`                     |
| Cache-Control          | `no-cache`                    |
| X-Content-Type-Options | `nosniff`                     |

### Erros

| Status | Código            | Quando                       |
|--------|-------------------|------------------------------|
| 400    | `VALIDATION_ERROR`| `question` vazia ou ausente  |

> **Nota:** Se um erro ocorrer após o início do streaming (headers já enviados), a conexão é encerrada sem resposta de erro JSON.

### Fluxo interno

```
question
  │
  ▼
┌─────────────────┐
│  IQueryRouter    │  Classifica a pergunta por collection
│  (LLM, temp=0)  │  → QueryIntent { targets: [{ name, confidence }] }
└────────┬────────┘
         │  (ou forceCollections se fornecido)
         ▼
┌─────────────────┐
│ Busca Paralela   │  similaritySearch em cada collection alvo
│ IVectorRepository│  → Chunk[] por collection
└────────┬────────┘
         ▼
┌─────────────────┐
│  IReranker (RRF) │  Reciprocal Rank Fusion nos resultados combinados
│                  │  → ScoredChunk[] ordenados por score
└────────┬────────┘
         ▼
┌─────────────────┐
│  ILlmService     │  Monta contexto + streaming de tokens
│  (OpenAI)        │  → res.write(token) em tempo real
└─────────────────┘
```

---

## Diagnósticos do Qdrant

Informações detalhadas sobre cada collection configurada e o estado do Qdrant.

```
GET /api/rag/qdrant-info
```

### Resposta — `200 OK`

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
    },
    {
      "storeUrl": "http://qdrant:6333",
      "collectionName": "relatorio_de_custos",
      "reachable": true,
      "collectionExists": true,
      "totalCollections": 3,
      "pointsCount": 18,
      "expectedVectorSize": 1536,
      "collectionStatus": "green"
    },
    {
      "storeUrl": "http://qdrant:6333",
      "collectionName": "docs_gerais",
      "reachable": true,
      "collectionExists": false,
      "totalCollections": 3,
      "pointsCount": null,
      "expectedVectorSize": 1536,
      "collectionStatus": null
    }
  ],
  "rag": {
    "topK": 4,
    "embeddingModel": "text-embedding-3-small",
    "collectionNames": ["docs_padronizacao", "relatorio_de_custos", "docs_gerais"]
  }
}
```

| Campo                        | Tipo          | Descrição                              |
|------------------------------|---------------|----------------------------------------|
| collections[].storeUrl       | string        | URL do Qdrant                          |
| collections[].collectionName | string        | Nome da collection                     |
| collections[].reachable      | boolean       | Qdrant está acessível                  |
| collections[].collectionExists | boolean     | Collection existe no Qdrant            |
| collections[].totalCollections | number      | Total de collections no Qdrant         |
| collections[].pointsCount    | number \| null | Pontos armazenados (null se não existe)|
| collections[].expectedVectorSize | number    | Dimensão esperada dos vetores (1536)   |
| collections[].collectionStatus | string \| null | Status da collection no Qdrant       |
| rag.topK                     | number        | Chunks retornados por busca            |
| rag.embeddingModel           | string        | Modelo de embeddings configurado       |
| rag.collectionNames          | string[]      | Collections configuradas               |

### Erros

| Status | Código             | Quando                         |
|--------|--------------------|--------------------------------|
| 503    | `DEPENDENCY_ERROR` | Falha ao ler diagnósticos      |

---

## Formato de Erro

Todas as respostas de erro seguem o mesmo formato:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "question is required",
    "stack": "..."
  }
}
```

| Campo         | Tipo   | Descrição                                              |
|---------------|--------|--------------------------------------------------------|
| error.code    | string | Código do erro (ex: `VALIDATION_ERROR`, `UPLOAD_ERROR`)|
| error.message | string | Mensagem descritiva                                    |
| error.details | object | Detalhes adicionais (quando disponível)                |
| error.stack   | string | Stack trace (apenas em `NODE_ENV !== production`)      |

### Códigos de erro

| Código             | HTTP | Descrição                       |
|--------------------|------|---------------------------------|
| `VALIDATION_ERROR` | 400  | Input inválido                  |
| `UPLOAD_ERROR`     | 400  | Problema no upload do arquivo   |
| `INVALID_JSON`     | 400  | JSON malformado no body         |
| `NOT_FOUND`        | 404  | Rota inexistente                |
| `DEPENDENCY_ERROR` | 503  | Dependência indisponível        |
| `INTERNAL_ERROR`   | 500  | Erro interno inesperado         |

---

## Resumo

| Método | Endpoint             | Descrição                        | Content-Type Resposta |
|--------|----------------------|-----------------------------------|-----------------------|
| GET    | `/health`            | Health check básico              | `application/json`    |
| GET    | `/api/rag/status`    | Status operacional               | `application/json`    |
| GET    | `/api/rag/ready`     | Readiness probe                  | `application/json`    |
| POST   | `/api/rag/ingest`    | Upload de PDF                    | `application/json`    |
| POST   | `/api/rag/query`     | Consulta com streaming           | `text/plain`          |
| POST   | `/api/rag/question`  | Alias para `/query`              | `text/plain`          |
| POST   | `/api/rag/pergunta`  | Alias para `/query`              | `text/plain`          |
| GET    | `/api/rag/qdrant-info` | Diagnósticos do Qdrant         | `application/json`    |
