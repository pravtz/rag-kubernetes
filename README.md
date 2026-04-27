# RAG API — Retrieval-Augmented Generation com TypeScript, LangChain e Qdrant

Uma API educacional e limpa para ingestão e consulta de PDFs com geração de respostas em streaming usando RAG (Retrieval-Augmented Generation).

## 🎯 Características

- **API Express em TypeScript** — servidor HTTP robusto com roteamento organizado
- **Ingestão de PDFs** — upload e indexação automática com LangChain
- **Busca Semântica** — recuperação vetorial com Qdrant
- **Streaming de Respostas** — tokens em tempo real via OpenAI
- **Saúde da API** — endpoints de status, readiness e diagnósticos
- **Testes Unitários** — 28 testes com Jest + TypeScript
- **Docker Compose** — ambiente local consistente (API + Qdrant)

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
# Obrigatório
OPENAI_API_KEY=sk-...
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION_NAME=rag_collection

# Opcionais (têm defaults)
PORT=3000
NODE_ENV=development
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
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

A API sobe em `http://localhost:3000`.

## 📡 API Endpoints

### Health & Status

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/health` | GET | Health check da API |
| `/api/rag/status` | GET | Status operacional + dependências |
| `/api/rag/ready` | GET | Readiness check (para deploy) |
| `/api/rag/qdrant-info` | GET | Diagnósticos do Qdrant |

### RAG Operations

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/rag/ingest` | POST | Upload e indexação de PDF |
| `/api/rag/query` | POST | Consulta com streaming |
| `/api/rag/question` | POST | Alias para `/query` |
| `/api/rag/pergunta` | POST | Outro alias para `/query` |

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

**Resposta (Qdrant reachable):**
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
  "collectionName": "rag_collection",
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
  "qdrant": {
    "qdrantUrl": "http://localhost:6333",
    "collectionName": "rag_collection",
    "reachable": true,
    "collectionExists": true,
    "totalCollections": 1,
    "pointsCount": 42,
    "expectedVectorSize": 1536,
    "collectionStatus": "green"
  },
  "rag": {
    "topK": 4,
    "embeddingModel": "text-embedding-3-small",
    "collectionName": "rag_collection"
  }
}
```

### Upload de PDF

```bash
curl -X POST \
  -F "file=@documento.pdf" \
  http://localhost:3000/api/rag/ingest
```

**Resposta:**
```json
{
  "message": "PDF ingested successfully",
  "chunks": 12
}
```

### Consulta com Streaming

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"question":"O que é RAG?"}' \
  http://localhost:3000/api/rag/query
```

**Resposta (streaming):**
```
RAG é uma abordagem que combina retrieval...
```

## 🏗️ Arquitetura

```
src/
├── config/
│   └── config.ts           # Env vars centralizadas
├── controllers/
│   └── ragController.ts    # Handlers HTTP
├── middleware/
│   └── uploadMiddleware.ts # Validação de PDF
├── routes/
│   └── ragRoutes.ts        # Roteamento
├── services/
│   ├── ragService.ts       # Ingestão + streaming
│   └── queryService.ts     # Busca semântica
├── utils/
│   ├── qdrant.ts           # Client Qdrant
│   └── chunking.ts         # Splitter de texto
└── server.ts               # Entry point Express
```

### Fluxo de Ingestão

1. **Upload** → PDF temporário via multer
2. **Load** → PDFLoader extrai conteúdo
3. **Split** → RecursiveCharacterTextSplitter em chunks
4. **Embed** → OpenAI embeddings (text-embedding-3-small)
5. **Store** → Qdrant persiste vetores (cria collection se não existir)

### Fluxo de Consulta

1. **Search** → similaritySearch no Qdrant retorna topK chunks
2. **Assemble** → contexto montado a partir dos chunks
3. **Generate** → LLM responde com contexto (streaming)
4. **Stream** → tokens escritos diretamente no response

## 🧪 Testes

O projeto inclui 28 testes unitários cobrindo:
- Configuração e env vars
- Utilitários de chunking e Qdrant
- Handlers de API (status, readiness, qdrant-info)
- Middleware de upload

```bash
npm test                 # Rodar todos
npm test:watch          # Modo watch
npm test:coverage       # Com relatório de cobertura
```

Consulte [README.TESTING.md](README.TESTING.md) para detalhes completos.

## 📦 Scripts

```bash
npm run dev             # Desenvolver (ts-node + watch)
npm run build           # Compilar TypeScript
npm run start           # Rodar em produção (node dist/server.js)
npm test                # Executar testes
npm test:watch          # Testes em watch mode
npm test:coverage       # Cobertura de testes
```

## 🐳 Docker Compose

O projeto inclui `docker-compose.yml` com:
- **Qdrant** — vetor DB on `port 6333` com volume persistente
- **API** — Node.js app on `port 3000`

Ambos na mesma rede com `platform: linux/amd64` explícito.

### Rodar Tudo

```bash
docker compose up
```

### Rodar Apenas Qdrant (deixa API local)

```bash
docker compose up qdrant -d
```

### Limpar

```bash
docker compose down
docker volume rm rag_qdrant_data  # Remove dados persistidos
```

## 🔧 Variáveis de Ambiente

| Var | Obrigatória | Default | Descrição |
|-----|-------------|---------|-----------|
| `OPENAI_API_KEY` | ✓ | — | Chave da API OpenAI |
| `QDRANT_URL` | ✓ | — | URL do Qdrant (ex: http://localhost:6333) |
| `QDRANT_COLLECTION_NAME` | ✓ | — | Nome da collection no Qdrant |
| `PORT` | — | 3000 | Porta da API |
| `NODE_ENV` | — | development | Ambiente (development/production/test) |
| `OPENAI_CHAT_MODEL` | — | gpt-4o-mini | Modelo para geração |
| `OPENAI_EMBEDDING_MODEL` | — | text-embedding-3-small | Modelo de embeddings |
| `QDRANT_API_KEY` | — | — | API key do Qdrant (opcional) |
| `CHUNK_SIZE` | — | 1000 | Tamanho de chunk em caracteres |
| `CHUNK_OVERLAP` | — | 200 | Sobreposição entre chunks |
| `TOP_K` | — | 4 | Número de chunks para retrieval |

## 📚 Estrutura de Código

### Separação de Responsabilidades

- **config/** — Validação e loading de env vars (fail-fast)
- **controllers/** — Camada HTTP (parsing, status codes)
- **services/** — Lógica de negócio (ingestão, querys, streaming)
- **middleware/** — Validação de entrada (upload PDF)
- **routes/** — Roteamento Express
- **utils/** — Helpers (Qdrant client, chunking)

### Erros e Respostas

Todas as respostas de erro incluem status HTTP apropriado:
- `400` — Input inválido (PDF faltando, question vazia)
- `503` — Dependência indisponível (Qdrant offline)
- `500` — Erro interno

## 🎓 Design Educacional

O código foi estruturado para ensinar:
- Organização de API em camadas
- Padrão de retry/readiness para deploy
- Streaming com Express
- Integração LangChain + Qdrant
- Validação centralizada de config
- Testes de unidade com Jest + mocks

Cada função tem nomes claros e comentários mínimos (apenas onde não óbvio).

## 📋 Critérios de Aceite (PRD)

- ✅ `POST /ingest` aceita PDF e indexa no Qdrant
- ✅ Collection criada automaticamente
- ✅ Chunks salvos com UUIDs e metadados
- ✅ `POST /query` retorna resposta com contexto
- ✅ Resposta em streaming
- ✅ Projeto sobe com `docker compose up`
- ✅ Testes unitários (28 testes)
- ✅ Configuração centralizada com fail-fast

## 🤝 Contribuindo

1. Instale dependências: `npm install`
2. Rode testes: `npm test`
3. Compile: `npm run build`
4. Faça suas mudanças em `src/`
5. Envie PR

## 📝 Licença

MIT

## 🔗 Referências

- [LangChain Docs](https://js.langchain.com)
- [Qdrant Docs](https://qdrant.tech/documentation)
- [OpenAI API](https://platform.openai.com/docs)
- [Express.js](https://expressjs.com)

---

**Criado em 27 de abril de 2026** como exemplo educacional de RAG API com TypeScript.
