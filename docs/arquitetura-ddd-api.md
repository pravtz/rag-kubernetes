# Refatoração da API para Arquitetura DDD

Você deve reorganizar esta API Node.js + Express seguindo Domain-Driven Design (DDD) 
combinado com Clean Architecture e os principais padrões de projeto da indústria.

## OBJETIVO
Transformar a estrutura atual em uma arquitetura em camadas (Layered Architecture) 
orientada ao domínio, com separação clara de responsabilidades, baixo acoplamento 
e alta coesão.

## ESTRUTURA DE PASTAS OBRIGATÓRIA

src/
├── modules/                          # Bounded Contexts (DDD)
│   └── <nome-do-contexto>/
│       ├── domain/                   # Camada de Domínio (núcleo, sem dependências externas)
│       │   ├── entities/             # Entidades com identidade e regras de negócio
│       │   ├── value-objects/        # Objetos de valor (imutáveis, sem identidade)
│       │   ├── aggregates/           # Agregados (raiz de consistência)
│       │   ├── repositories/         # Interfaces (contratos) dos repositórios
│       │   ├── services/             # Domain Services (regras que não pertencem a 1 entidade)
│       │   ├── events/               # Domain Events
│       │   └── errors/               # Exceções de domínio
│       │
│       ├── application/              # Camada de Aplicação (orquestração)
│       │   ├── use-cases/            # Casos de uso (1 caso = 1 classe)
│       │   ├── dtos/                 # Data Transfer Objects
│       │   ├── mappers/              # Conversão Entity <-> DTO
│       │   └── ports/                # Interfaces para serviços externos
│       │
│       ├── infrastructure/           # Camada de Infraestrutura (detalhes técnicos)
│       │   ├── persistence/
│       │   │   ├── qdrant/           # Implementação do repositório com Qdrant
│       │   │   └── mappers/          # Domain <-> Modelo de persistência
│       │   ├── http/
│       │   │   ├── controllers/      # Controllers Express
│       │   │   ├── routes/           # Definição de rotas
│       │   │   ├── middlewares/      # Middlewares específicos do módulo
│       │   │   └── validators/       # Schemas de validação (Zod/Joi)
│       │   └── adapters/             # Adapters para serviços externos
│       │
│       └── index.ts                  # Composition Root do módulo (DI)
│
├── shared/                           # Código compartilhado entre módulos
│   ├── domain/                       # Base classes (Entity, ValueObject, AggregateRoot)
│   ├── application/                  # UseCase base, Result pattern
│   ├── infrastructure/               # Logger, config, DB connections
│   └── errors/                       # Erros base da aplicação
│
├── config/                           # Configurações (env, DI container)
├── server.ts                         # Bootstrap do Express
└── app.ts                            # Configuração do app Express

## PADRÕES DE PROJETO QUE DEVEM SER APLICADOS

### Padrões Táticos do DDD
1. **Entity**: objetos com identidade única e ciclo de vida
2. **Value Object**: objetos imutáveis comparados por valor (use `equals()`)
3. **Aggregate Root**: ponto único de entrada para modificar um cluster de entidades
4. **Repository Pattern**: abstração de persistência (interface no domain, 
   implementação na infrastructure)
5. **Domain Service**: lógica de domínio que não pertence naturalmente a uma entidade
6. **Domain Event**: eventos que representam algo que aconteceu no domínio
7. **Factory**: criação de agregados complexos

### Padrões de Aplicação
8. **Use Case (Interactor)**: cada operação de negócio é uma classe com método 
   `execute()`. Princípio: Single Responsibility
9. **DTO**: nunca exponha entidades de domínio diretamente
10. **Mapper**: converta entre camadas explicitamente
11. **Result Pattern**: retorne `Result<T, E>` em vez de lançar exceções para 
    erros previsíveis
12. **Ports & Adapters (Hexagonal)**: domínio define interfaces (ports), 
    infraestrutura implementa (adapters)

### Padrões Estruturais
13. **Dependency Injection**: use um container (tsyringe, awilix, ou inversão manual)
14. **Inversion of Control**: dependa de abstrações, não de implementações concretas
15. **Composition Root**: monte as dependências em um único lugar por módulo
16. **Middleware Chain (Express)**: validação → autenticação → autorização → controller

### Padrões de Tratamento de Erros
17. Crie hierarquia de erros: `DomainError`, `ApplicationError`, `InfrastructureError`
18. **Error Handler Middleware** centralizado no Express
19. Mapeie erros de domínio para códigos HTTP apropriados

## REGRAS DE DEPENDÊNCIA (REGRA DE OURO)

A direção das dependências DEVE ser sempre de fora para dentro:

infrastructure → application → domain

- `domain/` NÃO pode importar de `application/` ou `infrastructure/`
- `application/` NÃO pode importar de `infrastructure/`
- `infrastructure/` PODE importar de `application/` e `domain/`
- Domínio é puro: zero dependências de Express, Qdrant, libs HTTP, etc.

## INSTRUÇÕES ESPECÍFICAS

1. Identifique os **Bounded Contexts** existentes na API atual (analise as rotas 
   e modelos para descobrir os contextos).
2. Para cada contexto, crie um módulo seguindo a estrutura acima.
3. Extraia regras de negócio dos controllers para entidades e use cases.
4. Crie interfaces de repositório no `domain/repositories/` ANTES de implementar 
   em `infrastructure/persistence/`.
5. Para o Qdrant: crie a interface genérica no domínio (ex: `IVectorRepository`) 
   e deixe a implementação concreta em `infrastructure/persistence/qdrant/`. 
   A pasta `qdrant/` ficará vazia ou com placeholder — será ajustada depois.
6. Use **Zod** ou **class-validator** para validação na camada de infraestrutura 
   HTTP (não no domínio).
7. Controllers devem ser "burros": apenas extrair dados da requisição, chamar 
   o use case e formatar a resposta.
8. Adicione um **Error Handler** global no Express que traduz erros de domínio 
   para respostas HTTP.
9. Configure path aliases no `tsconfig.json` (ex: `@modules/*`, `@shared/*`).
10. Documente decisões arquiteturais importantes em `docs/adr/` 
    (Architecture Decision Records).

## ENTREGA ESPERADA

- Estrutura de pastas reorganizada
- Pelo menos 1 módulo (bounded context) refatorado completamente como exemplo
- Composition root funcionando
- Error handler global implementado
- README explicando a arquitetura e como adicionar novos módulos