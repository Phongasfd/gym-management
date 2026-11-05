import { AppError } from '../lib/AppError';
import { endpoint } from '../lib/endpoint';
import { pageArgs, pageQuery, toPage } from '../lib/pagination';
import { prisma } from '../lib/prisma';
import { z } from '../lib/zod';
import { idParams, name, optional } from '../schemas/common';

const packageFields = z.object({
  name,
  description: optional(z.string().trim().max(1000)),
  price: z.coerce.number().positive().max(1_000_000_000),
  duration_days: z.coerce.number().int().min(1).max(3650),
  is_active: z.boolean().optional(),
});

export const listPackages = endpoint(
  {
    summary: 'List membership packages, cheapest first',
    description: 'Inactive packages are hidden unless `include_inactive=true`.',
    auth: 'public',
    query: pageQuery.extend({ include_inactive: z.enum(['true', 'false']).default('false') }),
  },
  async ({ query, res }) => {
    const rows = await prisma.package.findMany({
      where: query.include_inactive === 'true' ? undefined : { is_active: true },
      orderBy: [{ price: 'asc' }, { id: 'asc' }],
      ...pageArgs(query),
    });
    res.json(toPage(rows, query.limit));
  },
);

export const getPackage = endpoint({ summary: 'Get a package', auth: 'user', params: idParams }, async ({ params, res }) => {
  const pkg = await prisma.package.findUnique({ where: { id: params.id } });
  if (!pkg) throw new AppError('Package not found', 404);
  res.json(pkg);
});

export const createPackage = endpoint(
  { summary: 'Create a package (staff)', auth: 'staff', body: packageFields, responses: { 201: 'Created' } },
  async ({ body, res }) => {
    res.status(201).json(await prisma.package.create({ data: body }));
  },
);

export const updatePackage = endpoint(
  {
    summary: 'Edit a package (staff)',
    description: 'Orders already created keep the price they were created with.',
    auth: 'staff',
    params: idParams,
    body: packageFields.partial(),
  },
  async ({ params, body, res }) => {
    res.json(await prisma.package.update({ where: { id: params.id }, data: body }));
  },
);

export const deletePackage = endpoint(
  {
    summary: 'Delete a package (staff)',
    description: 'A package that has subscriptions cannot be deleted (409); deactivate it instead.',
    auth: 'staff',
    params: idParams,
    responses: { 204: 'Deleted', 409: 'Package has subscriptions' },
  },
  async ({ params, res }) => {
    const used = await prisma.subscription.count({ where: { package_id: params.id } });
    if (used > 0) {
      throw new AppError('This package has subscriptions; set is_active=false instead of deleting it', 409, { code: 'PACKAGE_IN_USE' });
    }
    await prisma.package.delete({ where: { id: params.id } });
    res.status(204).send();
  },
);
