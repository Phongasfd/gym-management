import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import type { ZodTypeAny, z } from 'zod';
import { authMiddleware, memberMiddleware, staffMiddleware } from '../middleware/auth';
import type { AuthUser, MemberAuth, StaffAuth } from '../types/auth';
import { AppError } from './AppError';
import { registry } from './openapi';

// One declaration per endpoint gives: request validation (zod), typed handler input,
// the auth check, and the OpenAPI entry. Nothing to keep in sync by hand.

export type AuthLevel = 'public' | 'user' | 'member' | 'staff';
type Schema = ZodTypeAny | undefined;
type Out<S extends Schema> = S extends ZodTypeAny ? z.output<S> : undefined;
type AuthFor<A extends AuthLevel> = A extends 'member'
  ? MemberAuth
  : A extends 'staff'
    ? StaffAuth
    : A extends 'user'
      ? AuthUser
      : AuthUser | undefined;

export interface EndpointSpec<A extends AuthLevel, B extends Schema, Q extends Schema, P extends Schema> {
  summary: string;
  description?: string;
  auth: A;
  body?: B;
  query?: Q;
  params?: P;
  // Extra middleware run after auth and before validation (rate limiters, Passport, ...).
  middleware?: RequestHandler[];
  responses?: Record<number, string>;
}

export interface Ctx<A extends AuthLevel, B extends Schema, Q extends Schema, P extends Schema> {
  body: Out<B>;
  query: Out<Q>;
  params: Out<P>;
  auth: AuthFor<A>;
  req: Request;
  res: Response;
}

export interface Endpoint {
  spec: EndpointSpec<AuthLevel, Schema, Schema, Schema>;
  handlers: RequestHandler[];
}

type Issue = { path: string; message: string };

// Collects issues instead of throwing, so one response lists every problem in body, query and params.
function parse<S extends Schema>(schema: S, input: unknown, where: 'body' | 'query' | 'params', issues: Issue[]): Out<S> {
  if (!schema) return undefined as Out<S>;
  const result = schema.safeParse(input ?? {});
  if (!result.success) {
    for (const issue of result.error.issues) {
      issues.push({ path: [where, ...issue.path].join('.'), message: issue.message });
    }
    return undefined as Out<S>;
  }
  return result.data as Out<S>;
}

const AUTH_MIDDLEWARE: Record<AuthLevel, RequestHandler[]> = {
  public: [],
  user: [authMiddleware],
  member: [authMiddleware, memberMiddleware],
  staff: [authMiddleware, staffMiddleware],
};

export function endpoint<
  A extends AuthLevel,
  B extends Schema = undefined,
  Q extends Schema = undefined,
  P extends Schema = undefined,
>(spec: EndpointSpec<A, B, Q, P>, handler: (ctx: Ctx<A, B, Q, P>) => Promise<void>): Endpoint {
  const run: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const issues: Issue[] = [];
      const ctx: Ctx<A, B, Q, P> = {
        body: parse(spec.body as B, req.body, 'body', issues),
        query: parse(spec.query as Q, req.query, 'query', issues),
        params: parse(spec.params as P, req.params, 'params', issues),
        auth: req.auth as AuthFor<A>,
        req,
        res,
      };
      if (issues.length > 0) {
        throw new AppError('Validation failed', 400, { code: 'VALIDATION_ERROR', details: issues });
      }
      await handler(ctx);
    } catch (err) {
      next(err);
    }
  };

  return {
    spec: spec as EndpointSpec<AuthLevel, Schema, Schema, Schema>,
    handlers: [...AUTH_MIDDLEWARE[spec.auth], ...(spec.middleware ?? []), run],
  };
}

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

// Express router that also writes each route into the OpenAPI registry.
export class ApiRouter {
  readonly router = Router();

  constructor(
    private readonly basePath: string,
    private readonly tag: string,
  ) {}

  get(path: string, ep: Endpoint) {
    return this.add('get', path, ep);
  }
  post(path: string, ep: Endpoint) {
    return this.add('post', path, ep);
  }
  put(path: string, ep: Endpoint) {
    return this.add('put', path, ep);
  }
  patch(path: string, ep: Endpoint) {
    return this.add('patch', path, ep);
  }
  delete(path: string, ep: Endpoint) {
    return this.add('delete', path, ep);
  }

  private add(method: Method, path: string, ep: Endpoint) {
    this.router[method](path, ...ep.handlers);

    const { spec } = ep;
    const security: Record<string, string[]>[] = [];
    if (spec.auth !== 'public') security.push({ cookieAuth: [] });
    if (method !== 'get') security.push({ csrfToken: [] });

    const responses: Record<string, { description: string }> = {};
    for (const [status, description] of Object.entries(spec.responses ?? { 200: 'OK' })) {
      responses[status] = { description };
    }
    if (spec.body || spec.query || spec.params) responses['400'] = { description: 'Validation failed' };
    if (spec.auth !== 'public') responses['401'] = { description: 'Not authenticated' };
    if (spec.auth === 'member' || spec.auth === 'staff') responses['403'] = { description: 'Wrong user type' };

    registry.registerPath({
      method,
      path: (this.basePath + (path === '/' ? '' : path)).replace(/:(\w+)/g, '{$1}'),
      tags: [this.tag],
      summary: spec.summary,
      description: spec.description,
      security: security.length ? security : undefined,
      request: {
        params: spec.params as never,
        query: spec.query as never,
        body: spec.body ? { content: { 'application/json': { schema: spec.body } } } : undefined,
      },
      responses,
    });
    return this;
  }
}
