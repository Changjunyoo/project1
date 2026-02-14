
import { db } from "./db";
import {
  ingredients,
  inventoryTransactions,
  branches,
  type Ingredient,
  type InsertIngredient,
  type Transaction,
  type InsertTransaction,
  type CreateTransactionRequest,
  type Branch,
  type InsertBranch,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Ingredients
  getIngredients(): Promise<Ingredient[]>;
  getIngredient(id: number): Promise<Ingredient | undefined>;
  createIngredient(ingredient: InsertIngredient): Promise<Ingredient>;
  updateIngredient(id: number, updates: Partial<InsertIngredient>): Promise<Ingredient>;
  deleteIngredient(id: number): Promise<void>;

  // Transactions & Stock Management
  getTransactions(ingredientId?: number): Promise<Transaction[]>;
  createTransaction(transaction: CreateTransactionRequest): Promise<Transaction>;

  // Branches
  getBranches(): Promise<Branch[]>;
  getBranch(id: number): Promise<Branch | undefined>;
  createBranch(branch: InsertBranch): Promise<Branch>;
  updateBranch(id: number, updates: Partial<InsertBranch>): Promise<Branch>;
  deleteBranch(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getIngredients(): Promise<Ingredient[]> {
    return await db.select().from(ingredients).orderBy(ingredients.name);
  }

  async getIngredient(id: number): Promise<Ingredient | undefined> {
    const [ingredient] = await db.select().from(ingredients).where(eq(ingredients.id, id));
    return ingredient;
  }

  async createIngredient(insertIngredient: InsertIngredient): Promise<Ingredient> {
    const [ingredient] = await db
      .insert(ingredients)
      .values(insertIngredient)
      .returning();
    return ingredient;
  }

  async updateIngredient(id: number, updates: Partial<InsertIngredient>): Promise<Ingredient> {
    const [updated] = await db
      .update(ingredients)
      .set(updates)
      .where(eq(ingredients.id, id))
      .returning();
    return updated;
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

  async createTransaction(txRequest: CreateTransactionRequest): Promise<Transaction> {
    // This should ideally be a transaction to ensure data integrity
    // 1. Get current stock
    const ingredient = await this.getIngredient(txRequest.ingredientId);
    if (!ingredient) {
      throw new Error("Ingredient not found");
    }

    // 2. Calculate new stock
    let newStock = ingredient.currentStock;
    if (txRequest.type === "IN") {
      newStock += txRequest.quantity;
    } else {
      if (ingredient.currentStock < txRequest.quantity) {
        throw new Error("Insufficient stock");
      }
      newStock -= txRequest.quantity;
    }

    // 3. Update ingredient stock
    await db
      .update(ingredients)
      .set({ 
        currentStock: newStock,
        lastUpdated: new Date()
      })
      .where(eq(ingredients.id, txRequest.ingredientId));

    // 4. Create transaction record
    const [transaction] = await db
      .insert(inventoryTransactions)
      .values(txRequest)
      .returning();

    return transaction;
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
}

export const storage = new DatabaseStorage();
