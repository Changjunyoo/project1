import { db } from "./db";
import {
  ingredients,
  inventoryTransactions,
  branches,
  categories,
  origins,
  type Ingredient,
  type InsertIngredient,
  type Transaction,
  type CreateTransactionRequest,
  type Branch,
  type InsertBranch,
  type Category,
  type InsertCategory,
  type Origin,
  type InsertOrigin,
  type IngredientWithNames,
} from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Ingredients
  getIngredients(): Promise<IngredientWithNames[]>;
  getIngredient(id: number): Promise<IngredientWithNames | undefined>;
  createIngredient(ingredient: InsertIngredient): Promise<IngredientWithNames>;
  updateIngredient(id: number, updates: Partial<InsertIngredient & { currentStock?: number }>): Promise<IngredientWithNames>;
  deleteIngredient(id: number): Promise<void>;

  // Transactions & Stock Management
  getTransactions(ingredientId?: number): Promise<Transaction[]>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  createTransaction(transaction: CreateTransactionRequest): Promise<Transaction>;
  confirmTransaction(id: number): Promise<Transaction>;
  rejectTransaction(id: number): Promise<Transaction>;
  resetTransaction(id: number): Promise<Transaction>;

  // Branches
  getBranches(): Promise<Branch[]>;
  getBranch(id: number): Promise<Branch | undefined>;
  createBranch(branch: InsertBranch): Promise<Branch>;
  updateBranch(id: number, updates: Partial<InsertBranch>): Promise<Branch>;
  deleteBranch(id: number): Promise<void>;

  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  deleteCategory(id: number): Promise<void>;

  // Origins
  getOrigins(): Promise<Origin[]>;
  createOrigin(origin: InsertOrigin): Promise<Origin>;
  deleteOrigin(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {

  // Helper: get ingredient with joined category/origin names
  private async getIngredientWithNames(id: number): Promise<IngredientWithNames | undefined> {
    const rows = await db
      .select({
        id: ingredients.id,
        name: ingredients.name,
        brand: ingredients.brand,
        categoryId: ingredients.categoryId,
        originId: ingredients.originId,
        unit: ingredients.unit,
        currentStock: ingredients.currentStock,
        minStockLevel: ingredients.minStockLevel,
        shelfLifeDays: ingredients.shelfLifeDays,
        lastUpdated: ingredients.lastUpdated,
        categoryName: categories.name,
        originName: origins.name,
      })
      .from(ingredients)
      .leftJoin(categories, eq(ingredients.categoryId, categories.id))
      .leftJoin(origins, eq(ingredients.originId, origins.id))
      .where(eq(ingredients.id, id));

    return rows[0] || undefined;
  }

  async getIngredients(): Promise<IngredientWithNames[]> {
    return await db
      .select({
        id: ingredients.id,
        name: ingredients.name,
        brand: ingredients.brand,
        categoryId: ingredients.categoryId,
        originId: ingredients.originId,
        unit: ingredients.unit,
        currentStock: ingredients.currentStock,
        minStockLevel: ingredients.minStockLevel,
        shelfLifeDays: ingredients.shelfLifeDays,
        lastUpdated: ingredients.lastUpdated,
        categoryName: categories.name,
        originName: origins.name,
      })
      .from(ingredients)
      .leftJoin(categories, eq(ingredients.categoryId, categories.id))
      .leftJoin(origins, eq(ingredients.originId, origins.id))
      .orderBy(ingredients.name);
  }

  async getIngredient(id: number): Promise<IngredientWithNames | undefined> {
    return this.getIngredientWithNames(id);
  }

  async createIngredient(insertIngredient: InsertIngredient): Promise<IngredientWithNames> {
    const [ingredient] = await db
      .insert(ingredients)
      .values(insertIngredient)
      .returning();
    return (await this.getIngredientWithNames(ingredient.id))!;
  }

  async updateIngredient(id: number, updates: Partial<InsertIngredient & { currentStock?: number }>): Promise<IngredientWithNames> {
    const setValues: any = { ...updates };
    await db
      .update(ingredients)
      .set(setValues)
      .where(eq(ingredients.id, id));
    return (await this.getIngredientWithNames(id))!;
  }

  async deleteIngredient(id: number): Promise<void> {
    await db.delete(ingredients).where(eq(ingredients.id, id));
  }

  async getTransactions(ingredientId?: number): Promise<Transaction[]> {
    if (ingredientId) {
      return await db
        .select()
        .from(inventoryTransactions)
        .where(eq(inventoryTransactions.ingredientId, ingredientId))
        .orderBy(desc(inventoryTransactions.createdAt));
    }
    return await db
      .select()
      .from(inventoryTransactions)
      .orderBy(desc(inventoryTransactions.createdAt));
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(inventoryTransactions).where(eq(inventoryTransactions.id, id));
    return transaction;
  }

  async createTransaction(txRequest: CreateTransactionRequest): Promise<Transaction> {
    const ingredient = await db.select().from(ingredients).where(eq(ingredients.id, txRequest.ingredientId));
    if (!ingredient[0]) {
      throw new Error("Ingredient not found");
    }

    if (txRequest.type === "PURCHASE") {
      const [transaction] = await db
        .insert(inventoryTransactions)
        .values({ ...txRequest, confirmed: "PENDING" })
        .returning();
      return transaction;
    }

    let newStock = ingredient[0].currentStock;
    if (txRequest.type === "IN") {
      newStock += txRequest.quantity;
    } else {
      if (ingredient[0].currentStock < txRequest.quantity) {
        throw new Error("Insufficient stock");
      }
      newStock -= txRequest.quantity;
    }

    await db
      .update(ingredients)
      .set({ currentStock: newStock, lastUpdated: new Date() })
      .where(eq(ingredients.id, txRequest.ingredientId));

    const [transaction] = await db
      .insert(inventoryTransactions)
      .values(txRequest)
      .returning();

    return transaction;
  }

  async confirmTransaction(id: number): Promise<Transaction> {
    const tx = await this.getTransaction(id);
    if (!tx) throw new Error("Transaction not found");
    if (tx.type !== "PURCHASE" || (tx.confirmed !== "PENDING" && tx.confirmed !== null)) {
      throw new Error("Transaction cannot be confirmed");
    }

    const [ingredient] = await db.select().from(ingredients).where(eq(ingredients.id, tx.ingredientId));
    if (!ingredient) throw new Error("Ingredient not found");

    await db
      .update(ingredients)
      .set({ currentStock: ingredient.currentStock + tx.quantity, lastUpdated: new Date() })
      .where(eq(ingredients.id, tx.ingredientId));

    const [updated] = await db
      .update(inventoryTransactions)
      .set({ confirmed: "CONFIRMED" })
      .where(eq(inventoryTransactions.id, id))
      .returning();

    return updated;
  }

  async rejectTransaction(id: number): Promise<Transaction> {
    const tx = await this.getTransaction(id);
    if (!tx) throw new Error("Transaction not found");
    if (tx.type !== "PURCHASE" || (tx.confirmed !== "PENDING" && tx.confirmed !== null)) {
      throw new Error("Transaction cannot be rejected");
    }

    const [updated] = await db
      .update(inventoryTransactions)
      .set({ confirmed: "REJECTED" })
      .where(eq(inventoryTransactions.id, id))
      .returning();

    return updated;
  }

  async resetTransaction(id: number): Promise<Transaction> {
    const tx = await this.getTransaction(id);
    if (!tx) throw new Error("Transaction not found");
    if (tx.type !== "PURCHASE") {
      throw new Error("Only purchase transactions can be reset");
    }
    if (tx.confirmed !== "CONFIRMED" && tx.confirmed !== "REJECTED") {
      throw new Error("Transaction is already pending");
    }

    if (tx.confirmed === "CONFIRMED") {
      const [ingredient] = await db.select().from(ingredients).where(eq(ingredients.id, tx.ingredientId));
      if (!ingredient) throw new Error("Ingredient not found");
      await db
        .update(ingredients)
        .set({ currentStock: Math.max(0, ingredient.currentStock - tx.quantity), lastUpdated: new Date() })
        .where(eq(ingredients.id, tx.ingredientId));
    }

    const [updated] = await db
      .update(inventoryTransactions)
      .set({ confirmed: "PENDING" })
      .where(eq(inventoryTransactions.id, id))
      .returning();

    return updated;
  }

  // === BRANCHES ===

  async getBranches(): Promise<Branch[]> {
    return await db.select().from(branches).orderBy(branches.name);
  }

  async getBranch(id: number): Promise<Branch | undefined> {
    const [branch] = await db.select().from(branches).where(eq(branches.id, id));
    return branch;
  }

  async createBranch(insertBranch: InsertBranch): Promise<Branch> {
    const [branch] = await db.insert(branches).values(insertBranch).returning();
    return branch;
  }

  async updateBranch(id: number, updates: Partial<InsertBranch>): Promise<Branch> {
    const [updated] = await db.update(branches).set(updates).where(eq(branches.id, id)).returning();
    return updated;
  }

  async deleteBranch(id: number): Promise<void> {
    await db.delete(branches).where(eq(branches.id, id));
  }

  // === CATEGORIES ===

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.name);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(insertCategory).returning();
    return category;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // === ORIGINS ===

  async getOrigins(): Promise<Origin[]> {
    return await db.select().from(origins).orderBy(origins.name);
  }

  async createOrigin(insertOrigin: InsertOrigin): Promise<Origin> {
    const [origin] = await db.insert(origins).values(insertOrigin).returning();
    return origin;
  }

  async deleteOrigin(id: number): Promise<void> {
    await db.delete(origins).where(eq(origins.id, id));
  }
}

export const storage = new DatabaseStorage();
