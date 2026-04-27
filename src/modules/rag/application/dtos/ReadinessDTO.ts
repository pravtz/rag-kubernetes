export interface ReadinessDTO {
  status: 'ready' | 'not-ready';
  timestamp: string;
  checks: {
    qdrant: 'reachable' | 'unreachable';
    collection: 'present' | 'missing' | 'unknown';
  };
  collectionName?: string;
  pointsCount?: number | null;
}
