import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

// 지점 (Branches)
export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 카테고리 (Categories)
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

// 원산지 (Origins)
export const origins = pgTable("origins", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

// 식자재 (Ingredients)
export const ingredients = pgTable("ingredients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand"),
  categoryId: integer("category_id"),
  originId: integer("origin_id"),
  unit: text("unit").notNull(),
  currentStock: integer("current_stock").notNull().default(0),
  minStockLevel: integer("min_stock_level").notNull().default(10),
  shelfLifeDays: integer("shelf_life_days"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// 입출고 기록 (Inventory Transactions)
export const inventoryTransactions = pgTable("inventory_transactions", {
  id: serial("id").primaryKey(),
  ingredientId: integer("ingredient_id").notNull(),
  type: text("type").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price"),
  destination: text("destination"),
  supplier: text("supplier"),
  expiryDate: timestamp("expiry_date"),
  confirmed: text("confirmed"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === SCHEMAS ===

export const insertBranchSchema = createInsertSchema(branches).omit({
  id: true,
  createdAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export const insertOriginSchema = createInsertSchema(origins).omit({
  id: true,
});

export const insertIngredientSchema = createInsertSchema(ingredients).omit({
  id: true,
  currentStock: true,
  lastUpdated: true,
});

export const insertTransactionSchema = createInsertSchema(inventoryTransactions).omit({
  id: true,
  createdAt: true,
});

// === EXPLICIT TYPES ===

export type Branch = typeof branches.$inferSelect;
export type InsertBranch = z.infer<typeof insertBranchSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Origin = typeof origins.$inferSelect;
export type InsertOrigin = z.infer<typeof insertOriginSchema>;

export type Ingredient = typeof ingredients.$inferSelect;
export type InsertIngredient = z.infer<typeof insertIngredientSchema>;

export type Transaction = typeof inventoryTransactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

// API Request/Response Types
export type CreateIngredientRequest = InsertIngredient;
export type UpdateIngredientRequest = Partial<InsertIngredient>;

// Extended ingredient type with resolved names (for API responses)
export type IngredientWithNames = Ingredient & {
  categoryName?: string | null;
  originName?: string | null;
};

export const createTransactionRequestSchema = insertTransactionSchema.extend({
  quantity: z.number().int().positive(),
  type: z.enum(["IN", "OUT", "PURCHASE"]),
  expiryDate: z.union([z.string(), z.date(), z.null()]).optional().transform((val) => {
    if (!val) return null;
    if (val instanceof Date) return val;
    return new Date(val);
  }),
});

export type CreateTransactionRequest = z.infer<typeof createTransactionRequestSchema>;

export const updateTransactionSchema = z.object({
  quantity: z.number().int().positive().optional(),
  destination: z.string().optional(),
  unitPrice: z.number().int().min(0).optional().nullable(),
  supplier: z.string().optional().nullable(),
  expiryDate: z.union([z.string(), z.date(), z.null()]).optional().transform((val) => {
    if (val === undefined) return undefined;
    if (!val) return null;
    if (val instanceof Date) return val;
    return new Date(val);
  }),
});

export type UpdateTransactionRequest = z.infer<typeof updateTransactionSchema>;

export type IngredientWithHistory = IngredientWithNames & {
  transactions?: Transaction[];
};
