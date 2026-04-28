export const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'RAG API',
    version: '1.0.0',
    description:
      'API educacional de Retrieval-Augmented Generation com TypeScript, LangChain, OpenAI e Qdrant.',
  },
  servers: [{ url: '/api/rag', description: 'RAG endpoints' }],
  tags: [
    { name: 'Health', description: 'Status e readiness da API' },
    { name: 'RAG', description: 'Ingestão e consulta de documentos' },
  ],
  paths: {
    '/status': {
      get: {
        tags: ['Health'],
        summary: 'Status operacional da API',
        responses: {
          '200': {
            description: 'API operacional',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiStatus' },
              },
            },
          },
          '503': {
            description: 'API degradada (dependência indisponível)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiStatus' },
              },
            },
          },
        },
      },
    },
    '/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness check para deploy',
        responses: {
          '200': {
            description: 'API pronta',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Readiness' },
              },
            },
          },
          '503': {
            description: 'API não está pronta',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Readiness' },
              },
            },
          },
        },
      },
    },
    '/qdrant-info': {
      get: {
        tags: ['Health'],
        summary: 'Diagnósticos do Qdrant',
        responses: {
          '200': {
            description: 'Informações do Qdrant',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/QdrantInfo' },
              },
            },
          },
          '503': {
            description: 'Qdrant indisponível',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/ingest': {
      post: {
        tags: ['RAG'],
        summary: 'Upload e indexação de PDF',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Arquivo PDF para ingestão',
                  },
                  collection: {
                    type: 'string',
                    description: 'Nome da collection de destino (opcional)',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'PDF ingerido com sucesso',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/IngestResult' },
              },
            },
          },
          '400': {
            description: 'Arquivo inválido ou ausente',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/query': {
      post: {
        tags: ['RAG'],
        summary: 'Consulta com resposta em streaming',
        description:
          'Envia uma pergunta e recebe a resposta em streaming (text/plain chunked). Os endpoints /question e /pergunta são aliases.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/QueryRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Resposta em streaming',
            content: {
              'text/plain': {
                schema: { type: 'string' },
              },
            },
          },
          '400': {
            description: 'question é obrigatório',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      ApiStatus: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          service: { type: 'string', example: 'rag-api' },
          env: { type: 'string', example: 'development' },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2026-04-27T10:15:30.123Z',
          },
          uptimeSeconds: { type: 'number', example: 42 },
          dependencies: {
            type: 'object',
            properties: {
              qdrant: { type: 'string', example: 'reachable' },
            },
          },
        },
      },
      Readiness: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ready' },
          timestamp: { type: 'string', format: 'date-time' },
          checks: {
            type: 'object',
            properties: {
              qdrant: { type: 'string', example: 'reachable' },
              collection: { type: 'string', example: 'present' },
            },
          },
          collectionName: { type: 'string', example: 'docs_padronizacao, docs_normas, docs_gerais' },
          pointsCount: { type: 'number', example: 42 },
        },
      },
      QdrantInfo: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          timestamp: { type: 'string', format: 'date-time' },
          collections: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                storeUrl: { type: 'string', example: 'http://qdrant:6333' },
                collectionName: { type: 'string', example: 'docs_padronizacao' },
                reachable: { type: 'boolean', example: true },
                collectionExists: { type: 'boolean', example: true },
                totalCollections: { type: 'number', example: 3 },
                pointsCount: { type: 'number', nullable: true, example: 42 },
                expectedVectorSize: { type: 'number', example: 1536 },
                collectionStatus: { type: 'string', nullable: true, example: 'green' },
              },
            },
          },
          rag: {
            type: 'object',
            properties: {
              topK: { type: 'number', example: 4 },
              embeddingModel: {
                type: 'string',
                example: 'text-embedding-3-small',
              },
              collectionNames: {
                type: 'array',
                items: { type: 'string' },
                example: ['docs_padronizacao', 'docs_normas', 'docs_gerais'],
              },
            },
          },
        },
      },
      QueryRequest: {
        type: 'object',
        required: ['question'],
        properties: {
          question: {
            type: 'string',
            example: 'O que é RAG?',
            description: 'Pergunta a ser respondida com base nos documentos indexados',
          },
          topK: {
            type: 'number',
            example: 4,
            description: 'Número de chunks para retrieval (opcional, usa config padrão)',
          },
          forceCollections: {
            type: 'array',
            items: { type: 'string' },
            example: ['docs_padronizacao'],
            description: 'Força busca em collections específicas, ignorando o routing automático',
          },
        },
      },
      IngestResult: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'PDF ingested successfully' },
          chunks: { type: 'number', example: 12 },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'question is required' },
            },
          },
        },
      },
    },
  },
};
