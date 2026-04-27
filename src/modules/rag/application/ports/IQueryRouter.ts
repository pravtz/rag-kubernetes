import { QueryIntent } from '../../domain/value-objects/QueryIntent';

export interface CollectionInfo {
  name: string;
  description: string;
}

export interface IQueryRouter {
  classify(
    question: string,
    collections: CollectionInfo[],
  ): Promise<QueryIntent>;
}
