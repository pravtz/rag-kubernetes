import { Request, Response } from 'express';
import fs from 'fs';
import { ingestPdf, generateStreamingResponse } from '../services/ragService';
import { retrieveContext } from '../services/queryService';
import { config } from '../config/config';
import { getQdrantDiagnostics, isQdrantReachable } from '../utils/qdrant';

export async function ingest(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ error: 'No PDF file provided' });
    return;
  }

  const filePath = req.file.path;

  try {
    const result = await ingestPdf(filePath);
    res.status(200).json({
      message: 'PDF ingested successfully',
      chunks: result.chunks,
    });
  } catch (error) {
    console.error('Ingestion error:', error);
    res.status(500).json({ error: 'Failed to ingest PDF' });
  } finally {
    // Remove the temporary file regardless of success or failure
    fs.unlink(filePath, (err) => {
      if (err) console.error('Failed to delete temp file:', err);
    });
  }
}

export async function query(req: Request, res: Response): Promise<void> {
  const { question } = req.body as { question?: string };

  if (!question || question.trim() === '') {
    res.status(400).json({ error: 'question is required' });
    return;
  }

  try {
    const context = await retrieveContext(question);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.flushHeaders();

    await generateStreamingResponse(question, context, (token) => {
      res.write(token);
    });

    res.end();
  } catch (error) {
    console.error('Query error:', error);
    // Only send error payload if headers have not been flushed yet
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process query' });
    }
  }
}

export async function getApiStatus(_req: Request, res: Response): Promise<void> {
  const qdrantReachable = await isQdrantReachable();
  const statusCode = qdrantReachable ? 200 : 503;

  res.status(statusCode).json({
    status: qdrantReachable ? 'ok' : 'degraded',
    service: 'rag-api',
    env: config.nodeEnv,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    dependencies: {
      qdrant: qdrantReachable ? 'reachable' : 'unreachable',
    },
  });
}

export async function getQdrantInfo(_req: Request, res: Response): Promise<void> {
  try {
    const diagnostics = await getQdrantDiagnostics();

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      qdrant: diagnostics,
      rag: {
        topK: config.chunking.topK,
        embeddingModel: config.openai.embeddingModel,
        collectionName: config.qdrant.collectionName,
      },
    });
  } catch (error) {
    console.error('Qdrant diagnostics error:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Failed to read Qdrant diagnostics',
      qdrantUrl: config.qdrant.url,
      collectionName: config.qdrant.collectionName,
    });
  }
}

export async function getApiReadiness(_req: Request, res: Response): Promise<void> {
  try {
    const qdrantReachable = await isQdrantReachable();

    if (!qdrantReachable) {
      res.status(503).json({
        status: 'not-ready',
        timestamp: new Date().toISOString(),
        checks: {
          qdrant: 'unreachable',
          collection: 'unknown',
        },
      });
      return;
    }

    const diagnostics = await getQdrantDiagnostics();
    const isReady = diagnostics.reachable && diagnostics.collectionExists;

    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'ready' : 'not-ready',
      timestamp: new Date().toISOString(),
      checks: {
        qdrant: diagnostics.reachable ? 'reachable' : 'unreachable',
        collection: diagnostics.collectionExists ? 'present' : 'missing',
      },
      collectionName: diagnostics.collectionName,
      pointsCount: diagnostics.pointsCount,
    });
  } catch (error) {
    console.error('Readiness check error:', error);
    res.status(503).json({
      status: 'not-ready',
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed',
    });
  }
}
