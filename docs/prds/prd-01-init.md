# PRD 01 - RAG Simples e Limpo (TypeScript + LangChain + Express + Qdrant)

## 1. Resumo do Projeto

Criar uma API RAG (Retrieval-Augmented Generation) didatica, simples e limpa, usando TypeScript no Node.js com Express, LangChain, OpenAI embeddings/chat model, Qdrant como vetor store e Docker Compose para ambiente local consistente.

Objetivo principal: aprender o processo ponta a ponta com boa separacao de responsabilidades e decisoes tecnicas explicadas.

## 2. Objetivos

- Subir uma API HTTP em Express para ingestao e consulta de PDFs.
- Processar PDFs com `PDFLoader` do LangChain.
- Quebrar documentos em chunks, gerar embeddings e persistir no Qdrant.
- Criar a colecao no Qdrant automaticamente se ela nao existir.
- Consultar contexto relevante e responder via fluxo RAG.
- Entregar resposta em streaming para o cliente.
- Manter codigo organizado por camadas: `config`, `server`, `services`, `controllers`, `middleware`.

## 3. Fora de Escopo (nesta fase)

- Autenticacao/autorizacao.
- Multi-tenant.
- UI frontend completa.
- Banco relacional.
- Pipeline avancado de observabilidade (tracing detalhado, dashboards).

## 4. Requisitos Funcionais

1. Configuracao centralizada em `config.ts` com `dotenv`.
2. Servidor e rotas em `server.ts`.
3. Middleware com `multer` para upload de arquivos.
4. Aceitar apenas PDFs no endpoint de ingestao.
5. Usar `PDFLoader` para carregar arquivos.
6. Separar documento em chunks para indexacao.
7. Gerar `uuid` para identificar chunks/documentos.
8. Garantir existencia da colecao no Qdrant antes da escrita.
9. Criar `ragService` para orquestrar ingestao e geracao RAG.
10. Criar `queryService` para fluxo de consulta/retrieval.
11. Controller para coordenar request/response.
12. Suportar streaming de resposta no endpoint de query.

## 5. Requisitos Nao Funcionais

- Codigo limpo, com nomes claros e separacao por responsabilidade.
- Erros tratados com respostas HTTP apropriadas.
- Docker Compose com `platform` e `volume` para reduzir problemas de arquitetura e persistencia de dados.
- Estrutura simples para onboarding rapido.

## 6. Arquitetura Proposta

### 6.1 Componentes

- `Express API`: recebe upload e perguntas do usuario.
- `Multer Middleware`: valida e disponibiliza PDF temporario para processamento.
- `ragService`: fluxo de ingestao (load, split, embed, persist) e orquestracao de resposta com contexto.
- `queryService`: busca semantica no Qdrant e composicao do contexto relevante.
- `Qdrant`: armazenamento vetorial dos chunks.
- `OpenAI`: embeddings e modelo de chat para resposta final.

### 6.2 Fluxo de Ingestao

1. Usuario envia PDF.
2. Controller valida request e chama `ragService.ingestPdf(...)`.
3. `ragService` usa `PDFLoader` para extrair conteudo.
4. Documento e dividido em chunks.
5. Cada chunk recebe `uuid` e metadados.
6. `ragService` garante colecao no Qdrant (create if not exists).
7. Embeddings sao gerados e chunks persistidos.

### 6.3 Fluxo de Consulta (Streaming)

1. Usuario envia pergunta.
2. Controller chama `queryService` para recuperar chunks relevantes.
3. `ragService` monta prompt com contexto recuperado.
4. Modelo responde em streaming.
5. API transmite os tokens ao cliente em tempo real.

## 7. Estrutura Inicial de Pastas

```txt
src/
	config/
		config.ts
	controllers/
		ragController.ts
	middleware/
		uploadMiddleware.ts
	routes/
		ragRoutes.ts
	services/
		ragService.ts
		queryService.ts
	utils/
		qdrant.ts
		chunking.ts
	server.ts
```

## 8. Contrato Inicial de API

### `POST /api/rag/ingest`

- Form-data: `file` (PDF).
- Comportamento:
	- valida tipo PDF;
	- processa e indexa chunks no Qdrant;
	- retorna resumo da ingestao (ex.: quantidade de chunks).

### `POST /api/rag/query`

- JSON: `{ "question": "..." }`.
- Comportamento:
	- recupera contexto via similaridade;
	- gera resposta com LLM;
	- retorna em streaming.

## 9. Configuracoes (`config.ts`)

Variaveis esperadas no `.env`:

- `PORT`
- `NODE_ENV`
- `OPENAI_API_KEY`
- `OPENAI_CHAT_MODEL`
- `OPENAI_EMBEDDING_MODEL`
- `QDRANT_URL`
- `QDRANT_API_KEY` (opcional, dependendo do ambiente)
- `QDRANT_COLLECTION_NAME`
- `CHUNK_SIZE`
- `CHUNK_OVERLAP`
- `TOP_K`

Decisao: centralizar validacao dessas variaveis no startup para falhar cedo e evitar erros em runtime.

## 10. Docker Compose (Requisito de Arquitetura)

Diretrizes obrigatorias:

- Definir `platform` nos servicos para evitar inconsistencias entre ARM/x86.
- Definir `volume` persistente para dados do Qdrant.

Exemplo de intencao:

- Servico `qdrant` com volume nomeado (ex.: `qdrant_data`).
- API e Qdrant na mesma network do compose.

## 11. Decisoes Tecnicas e Motivacoes

1. `Express`:
	 Simples, maduro e ideal para aprender arquitetura em camadas sem overhead.
2. `LangChain`:
	 Agiliza integracao com loader, splitters, vetorstores e modelos.
3. `Qdrant`:
	 Vetor DB focado em busca semantica, facil de rodar localmente via Docker.
4. `Multer`:
	 Padrao para upload em Express com validacao de mime/file extension.
5. `UUID` nos chunks:
	 Evita colisao de IDs e facilita rastreio de dados.
6. Streaming:
	 Melhora UX e mostra resposta progressiva do modelo.

## 12. Plano de Implementacao (Etapas Comentadas)

### Etapa 1 - Bootstrap do projeto

- Iniciar projeto TypeScript com scripts `dev`, `build`, `start`.
- Instalar dependencias principais e de tipos.
- Criar `.env.example`.

Porque: estabelece base reprodutivel para evolucao.

### Etapa 2 - Configuracao central (`config.ts`)

- Carregar `dotenv`.
- Expor objeto de configuracao tipado.
- Validar envs obrigatorias.

Porque: evita espalhar `process.env` no codigo.

### Etapa 3 - Servidor e rotas (`server.ts`)

- Configurar Express, CORS, JSON parser, health check.
- Registrar rotas do modulo RAG.

Porque: separa infraestrutura HTTP da regra de negocio.

### Etapa 4 - Upload PDF (`multer`)

- Criar middleware de upload.
- Filtrar para aceitar apenas PDF.

Porque: bloqueia entrada invalida antes de chegar na camada de negocio.

### Etapa 5 - Ingestao (`ragService`)

- Usar `PDFLoader` para leitura.
- Fazer chunking com parametros configuraveis.
- Atribuir `uuid` por chunk.
- Garantir colecao no Qdrant e persistir embeddings.

Porque: indexacao confiavel e repetivel e a base do RAG.

### Etapa 6 - Consulta (`queryService` + `ragService`)

- Recuperar `topK` chunks relevantes.
- Montar contexto e prompt.
- Chamar modelo com streaming.

Porque: separa retrieval da orquestracao final da resposta.

### Etapa 7 - Controller e contratos HTTP

- Controller para ingestao e query.
- Respostas padronizadas de sucesso/erro.

Porque: camada de borda limpa e testavel.

### Etapa 8 - Docker Compose

- Subir API + Qdrant com `platform` e `volume`.
- Testar persistencia dos vetores ao reiniciar container.

Porque: ambiente local consistente e sem perda de dados.

## 13. Criterios de Aceite

- `POST /ingest` aceita PDF valido e indexa no Qdrant.
- Colecao e criada automaticamente quando nao existir.
- Chunks sao salvos com IDs UUID e metadados basicos.
- `POST /query` retorna resposta usando contexto recuperado.
- Resposta da query chega em streaming.
- Projeto sobe com `docker compose up` sem ajustes manuais.

## 14. Riscos e Mitigacoes

- Risco: documentos longos causarem latencia alta.
	Mitigacao: ajustar `chunk_size`, `chunk_overlap`, `top_k`.
- Risco: erros de ambiente por variaveis faltantes.
	Mitigacao: validacao no startup em `config.ts`.
- Risco: incompatibilidade de arquitetura local.
	Mitigacao: declarar `platform` explicitamente no Compose.

## 15. Proximos Artefatos (apos este PRD)

- `docs/adr/adr-01-arquitetura-rag.md` (opcional, para registrar decisoes).
- Scaffold inicial do codigo conforme estrutura definida.
- Colecao de requests para testes locais (HTTPie/curl/Insomnia/Postman).




