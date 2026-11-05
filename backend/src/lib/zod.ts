import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Must run before any schema is built so `.openapi()` exists on every zod type.
extendZodWithOpenApi(z);

export { z };
