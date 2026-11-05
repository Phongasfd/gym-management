import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import './zod';

// Every endpoint registers itself here (lib/endpoint.ts), so the docs are generated from the
// same zod schemas that validate the requests and cannot drift from the code.
export const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'cookieAuth', {
  type: 'apiKey',
  in: 'cookie',
  name: 'access_token',
});
registry.registerComponent('securitySchemes', 'csrfToken', {
  type: 'apiKey',
  in: 'header',
  name: 'X-CSRF-Token',
  description: 'Required on every POST/PUT/PATCH/DELETE. Get it from GET /api/auth/csrf-token.',
});

export function buildOpenApiDocument() {
  return new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'Gym Management System API',
      version: '2.0.0',
      description: 'Generated from the zod schemas that validate each request.',
    },
    servers: [{ url: '/' }],
  });
}
