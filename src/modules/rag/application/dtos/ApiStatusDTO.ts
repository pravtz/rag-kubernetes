export interface ApiStatusDTO {
  status: 'ok' | 'degraded';
  service: string;
  env: string;
  timestamp: string;
  uptimeSeconds: number;
  dependencies: {
    qdrant: 'reachable' | 'unreachable';
  };
}
