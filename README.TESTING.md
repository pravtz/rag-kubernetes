# Testing Guide

## Overview

This project includes unit tests for all major components written with Jest and TypeScript. The tests validate configuration loading, utility functions, middleware, and API controllers.

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode (re-run on file changes)
```bash
npm test:watch
```

### Run tests with coverage report
```bash
npm test:coverage
```

### Run specific test file
```bash
npm test -- config.test.ts
```

## Test Suites

### 1. `config.test.ts`
Tests for centralized environment variable loading and validation.

**Coverage:**
- Default values for optional env vars
- Custom values when provided
- Error throwing for missing required vars
- All config properties structure

**Run:**
```bash
npm test -- config.test.ts
```

### 2. `chunking.test.ts`
Tests for document splitting and chunk management.

**Coverage:**
- Long document splitting into chunks
- Metadata preservation during splits
- Multiple document handling
- Short document handling (no split)
- Configured chunk size respect

**Run:**
```bash
npm test -- chunking.test.ts
```

### 3. `qdrant-utils.test.ts`
Tests for Qdrant utility functions.

**Coverage:**
- Vector size resolution based on embedding model
- Support for different embedding models (text-embedding-3-small, text-embedding-3-large, text-embedding-ada-002)
- Default vector size fallback

**Run:**
```bash
npm test -- qdrant-utils.test.ts
```

### 4. `controllers.test.ts`
Tests for RAG API controller handlers (status, readiness, qdrant-info).

**Coverage:**

#### `/api/rag/status` endpoint
- Returns `200` with `status: "ok"` when Qdrant is reachable
- Returns `503` with `status: "degraded"` when Qdrant is unreachable
- Includes uptime seconds in response
- Returns correct dependency status

#### `/api/rag/ready` endpoint (readiness check)
- Returns `200` with `status: "ready"` when ready (Qdrant + collection exist)
- Returns `503` with `status: "not-ready"` when collection missing
- Returns `503` when Qdrant unreachable
- Handles errors gracefully

#### `/api/rag/qdrant-info` endpoint
- Returns full Qdrant diagnostics (URL, collection, status, points count, etc.)
- Returns error status `503` when diagnostics fail
- Includes RAG configuration in response

**Run:**
```bash
npm test -- controllers.test.ts
```

### 5. `upload-middleware.test.ts`
Basic tests for the PDF upload middleware.

**Coverage:**
- Multer middleware is properly created
- Middleware has correct structure

> **Note:** Full integration testing of multer file validation requires an Express server environment. Consider e2e tests or integration tests using `supertest` for complete coverage.

**Run:**
```bash
npm test -- upload-middleware.test.ts
```

## Environment Setup for Tests

Tests use mocked configuration and Qdrant clients. You do **not** need to have:
- A running Qdrant instance
- A `.env` file

The tests set up their own mock environment variables and mock dependencies.

## Coverage Thresholds

The project is configured with minimum coverage thresholds:
- **Branches:** 50%
- **Functions:** 50%
- **Lines:** 50%
- **Statements:** 50%

Run `npm test:coverage` to see current coverage metrics.

## Mocking Strategy

Tests use Jest mocks for external dependencies:
- `@qdrant/js-client-rest` — QdrantClient is mocked to avoid requiring a real Qdrant instance
- `../config/config` — Configuration is mocked with test values
- Express Request/Response — Mocked in controller tests

## Best Practices

1. **Isolation:** Each test is isolated; mocks are reset between tests.
2. **Clarity:** Test names describe what is being tested and expected outcome.
3. **Independence:** Tests do not depend on other tests or file system state.
4. **Performance:** Unit tests run in seconds; integration tests are e2e tests.

## Adding New Tests

When adding new functionality:

1. Create a test file in `src/__tests__/` with the pattern `<component>.test.ts`
2. Use Jest's `describe()` for test suites and `it()` for individual tests
3. Mock external dependencies to avoid external calls
4. Aim for clear test names that document expected behavior

## Troubleshooting

### Tests fail with "Cannot read properties of undefined"
- Ensure mocks are set up before importing modules
- Check that mocks are reset in `beforeEach()` if using `jest.resetModules()`

### "Cannot log after tests are done"
- Ensure async operations are properly awaited in tests
- Be aware that mocked Qdrant client may emit async logs

### Build succeeds but tests fail
- Ensure `jest` and `ts-jest` are installed: `npm install`
- Check that TypeScript compilation is not the issue: `npm run build`

## CI/CD Integration

Add to your CI/CD pipeline:
```bash
npm test -- --coverage
```

This runs tests and generates a coverage report for metrics tracking.
