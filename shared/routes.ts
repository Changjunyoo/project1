import { z } from 'zod';
import { insertIngredientSchema, createTransactionRequestSchema, updateTransactionSchema, insertBranchSchema, insertCategorySchema, insertOriginSchema, ingredients, inventoryTransactions, branches, categories, origins } from './schema';
import type { IngredientWithNames } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  ingredients: {
    list: {
      method: 'GET' as const,
      path: '/api/ingredients' as const,
      responses: {
        200: z.array(z.custom<IngredientWithNames>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/ingredients/:id' as const,
      responses: {
        200: z.custom<IngredientWithNames>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/ingredients' as const,
      input: insertIngredientSchema,
      responses: {
        201: z.custom<IngredientWithNames>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/ingredients/:id' as const,
      input: insertIngredientSchema.partial().extend({ currentStock: z.number().int().min(0).optional() }),
      responses: {
        200: z.custom<IngredientWithNames>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/ingredients/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  transactions: {
    list: {
      method: 'GET' as const,
      path: '/api/transactions' as const,
      input: z.object({
        ingredientId: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof inventoryTransactions.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/transactions' as const,
      input: createTransactionRequestSchema,
      responses: {
        201: z.custom<typeof inventoryTransactions.$inferSelect>(),
        400: errorSchemas.validation,
        422: z.object({ message: z.string() }),
      },
    },
    confirm: {
      method: 'PATCH' as const,
      path: '/api/transactions/:id/confirm' as const,
      responses: {
        200: z.custom<typeof inventoryTransactions.$inferSelect>(),
        404: errorSchemas.notFound,
        422: z.object({ message: z.string() }),
      },
    },
    reject: {
      method: 'PATCH' as const,
      path: '/api/transactions/:id/reject' as const,
      responses: {
        200: z.custom<typeof inventoryTransactions.$inferSelect>(),
        404: errorSchemas.notFound,
        422: z.object({ message: z.string() }),
      },
    },
    reset: {
      method: 'PATCH' as const,
      path: '/api/transactions/:id/reset' as const,
      responses: {
        200: z.custom<typeof inventoryTransactions.$inferSelect>(),
        404: errorSchemas.notFound,
        422: z.object({ message: z.string() }),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/transactions/:id' as const,
      input: updateTransactionSchema,
      responses: {
        200: z.custom<typeof inventoryTransactions.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
        422: z.object({ message: z.string() }),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/transactions/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        422: z.object({ message: z.string() }),
      },
    },
  },
  branches: {
    list: {
      method: 'GET' as const,
      path: '/api/branches' as const,
      responses: {
        200: z.array(z.custom<typeof branches.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/branches' as const,
      input: insertBranchSchema,
      responses: {
        201: z.custom<typeof branches.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/branches/:id' as const,
      input: insertBranchSchema.partial(),
      responses: {
        200: z.custom<typeof branches.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/branches/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  categories: {
    list: {
      method: 'GET' as const,
      path: '/api/categories' as const,
      responses: {
        200: z.array(z.custom<typeof categories.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/categories' as const,
      input: insertCategorySchema,
      responses: {
        201: z.custom<typeof categories.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/categories/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  origins: {
    list: {
      method: 'GET' as const,
      path: '/api/origins' as const,
      responses: {
        200: z.array(z.custom<typeof origins.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/origins' as const,
      input: insertOriginSchema,
      responses: {
        201: z.custom<typeof origins.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/origins/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
