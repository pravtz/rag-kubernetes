import { DomainError } from '../../../../shared/errors/DomainError';

export class InvalidDocumentError extends DomainError {
  constructor(reason: string) {
    super(`Invalid document: ${reason}`, 'INVALID_DOCUMENT');
    this.name = 'InvalidDocumentError';
  }
}

export class EmptyQuestionError extends DomainError {
  constructor() {
    super('question is required', 'VALIDATION_ERROR');
    this.name = 'EmptyQuestionError';
  }
}

export class ChunkingError extends DomainError {
  constructor(reason: string) {
    super(`Chunking failed: ${reason}`, 'CHUNKING_ERROR');
    this.name = 'ChunkingError';
  }
}

export class UnknownCollectionError extends DomainError {
  constructor(collectionName: string) {
    super(`Unknown collection: ${collectionName}`, 'UNKNOWN_COLLECTION');
    this.name = 'UnknownCollectionError';
  }
}

export class QueryRoutingError extends DomainError {
  constructor(reason: string) {
    super(`Query routing failed: ${reason}`, 'QUERY_ROUTING_ERROR');
    this.name = 'QueryRoutingError';
  }
}
