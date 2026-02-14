
import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
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

// 식자재 (Ingredients)
export const ingredients = pgTable("ingredients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand"), // 브랜드 필드 추가
  unit: text("unit").notNull(), // e.g., kg, g, box, ea
  currentStock: integer("current_stock").notNull().default(0),
  minStockLevel: integer("min_stock_level").notNull().default(10), // Low stock alert threshold
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// 입출고 기록 (Inventory Transactions)
export const inventoryTransactions = pgTable("inventory_transactions", {
  id: serial("id").primaryKey(),
  ingredientId: integer("ingredient_id").notNull(),
  type: text("type").notNull(), // 'IN' (입고), 'OUT' (출고), 'PURCHASE' (사입)
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price"), // 입고/사입 단가 (Optional for OUT)
  destination: text("destination"), // 출고 지점/사용처 (Optional for IN/PURCHASE)
  supplier: text("supplier"), // 사입처 (Optional)
  createdAt: timestamp("created_at").defaultNow(),
});

// === SCHEMAS ===

export const insertBranchSchema = createInsertSchema(branches).omit({
  id: true,
  createdAt: true,
});

export const insertIngredientSchema = createInsertSchema(ingredients).omit({ 
  id: true, 
  currentStock: true, // Managed by transactions
  lastUpdated: true 
});

export const insertTransactionSchema = createInsertSchema(inventoryTransactions).omit({ 
  id: true, 
  createdAt: true 
});

// === EXPLICIT TYPES ===

export type Branch = typeof branches.$inferSelect;
export type InsertBranch = z.infer<typeof insertBranchSchema>;

export type Ingredient = typeof ingredients.$inferSelect;
export type InsertIngredient = z.infer<typeof insertIngredientSchema>;

export type Transaction = typeof inventoryTransactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

// API Request/Response Types
export type CreateIngredientRequest = InsertIngredient;
export type UpdateIngredientRequest = Partial<InsertIngredient>;

// For creating a transaction, we might want to validate positive quantities
export const createTransactionRequestSchema = insertTransactionSchema.extend({
  quantity: z.number().int().positive(),
  type: z.enum(["IN", "OUT", "PURCHASE"]),
});

export type CreateTransactionRequest = z.infer<typeof createTransactionRequestSchema>;

export type IngredientWithHistory = Ingredient & {
  transactions?: Transaction[];
};
