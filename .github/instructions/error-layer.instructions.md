---
description: "Use when implementing or refactoring API error handling in Express routes/controllers/middleware. Enforces AppError, asyncHandler, and centralized error middleware patterns for the RAG API."
name: "RAG Error Layer Standards"
applyTo: "src/routes/**/*.ts, src/controllers/**/*.ts, src/middleware/**/*.ts"
---
# Error Layer Standards

Use these rules for error handling in the API.
These rules are a strong preference: if a different approach is required, add a short justification in the PR description.

- Use `AppError` for operational failures and validation errors.
- Throw errors from async route handlers and let `asyncHandler` forward them to `errorHandler`.
- In middleware that wraps external libraries (for example, `multer`), map library errors to `AppError` with stable error codes.
- Keep response formatting centralized in `errorHandler`; avoid duplicating JSON error payloads in controllers.
- Use semantic error codes (for example, `VALIDATION_ERROR`, `UPLOAD_ERROR`, `DEPENDENCY_ERROR`, `INTERNAL_ERROR`).
- Preserve expected non-error API behavior for health/readiness endpoints, but convert true technical failures into exceptions.
- For streaming responses, do not attempt JSON error responses after headers are sent; log and close the stream safely.
- When changing route/controller/middleware exception flow, add or update tests in `src/__tests__` that cover the new error path.

## Route/Controller Pattern

```ts
router.post('/query', asyncHandler(query));

export async function query(req: Request, res: Response): Promise<void> {
  if (!req.body.question) {
    throw new AppError('question is required', 400, 'VALIDATION_ERROR');
  }

  // normal flow
}
```

## Middleware Wrapper Pattern

```ts
export const uploadPdfHandler: RequestHandler = (req, res, next) => {
  uploadPdf(req, res, (err) => {
    if (!err) return next();
    next(new AppError((err as Error).message, 400, 'UPLOAD_ERROR'));
  });
};
```
