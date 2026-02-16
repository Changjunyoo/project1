import { db } from "./db";
import {
  ingredients,
  inventoryTransactions,
  branches,
  categories,
  origins,
  departments,
  persons,
  type Ingredient,
  type InsertIngredient,
  type Transaction,
  type CreateTransactionRequest,
  type UpdateTransactionRequest,
  type Branch,
  type InsertBranch,
  type Category,
  type InsertCategory,
  type Origin,
  type InsertOrigin,
  type Department,
  type InsertDepartment,
  type Person,
  type InsertPerson,
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
  updateTransaction(id: number, updates: UpdateTransactionRequest): Promise<Transaction>;
  deleteTransaction(id: number): Promise<void>;
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

  // Departments
  getDepartments(): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  deleteDepartment(id: number): Promise<void>;

  // Persons
  getPersons(): Promise<Person[]>;
  createPerson(person: InsertPerson): Promise<Person>;
  deletePerson(id: number): Promise<void>;
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

  async updateTransaction(id: number, updates: UpdateTransactionRequest): Promise<Transaction> {
    const tx = await this.getTransaction(id);
    if (!tx) throw new Error("Transaction not found");

    // PURCHASE transactions with confirmed status cannot be edited
    if (tx.type === "PURCHASE" && tx.confirmed === "CONFIRMED") {
      throw new Error("확인된 사입 내역은 수정할 수 없습니다");
    }

    // If quantity changed, adjust ingredient stock
    if (updates.quantity !== undefined && updates.quantity !== tx.quantity) {
      const [ingredient] = await db.select().from(ingredients).where(eq(ingredients.id, tx.ingredientId));
      if (!ingredient) throw new Error("Ingredient not found");

      const diff = updates.quantity - tx.quantity;

      if (tx.type === "IN") {
        // IN: more quantity = more stock
        const newStock = ingredient.currentStock + diff;
        if (newStock < 0) throw new Error("재고가 부족하여 수량을 줄일 수 없습니다");
        await db.update(ingredients).set({ currentStock: newStock, lastUpdated: new Date() }).where(eq(ingredients.id, tx.ingredientId));
      } else if (tx.type === "OUT") {
        // OUT: more quantity = less stock
        const newStock = ingredient.currentStock - diff;
        if (newStock < 0) throw new Error("재고가 부족하여 출고 수량을 늘릴 수 없습니다");
        await db.update(ingredients).set({ currentStock: newStock, lastUpdated: new Date() }).where(eq(ingredients.id, tx.ingredientId));
      }
      // PURCHASE PENDING: stock not yet applied, so no adjustment needed
    }

    const setValues: Record<string, any> = {};
    if (updates.quantity !== undefined) setValues.quantity = updates.quantity;
    if (updates.destination !== undefined) setValues.destination = updates.destination;
    if (updates.unitPrice !== undefined) setValues.unitPrice = updates.unitPrice;
    if (updates.supplier !== undefined) setValues.supplier = updates.supplier;
    if (updates.department !== undefined) setValues.department = updates.department;
    if (updates.personName !== undefined) setValues.personName = updates.personName;
    if (updates.expiryDate !== undefined) setValues.expiryDate = updates.expiryDate;
    if (updates.createdAt !== undefined) setValues.createdAt = updates.createdAt;

    const [updated] = await db
      .update(inventoryTransactions)
      .set(setValues)
      .where(eq(inventoryTransactions.id, id))
      .returning();

    return updated;
  }

  async deleteTransaction(id: number): Promise<void> {
    const tx = await this.getTransaction(id);
    if (!tx) throw new Error("Transaction not found");

    // PURCHASE confirmed cannot be deleted
    if (tx.type === "PURCHASE" && tx.confirmed === "CONFIRMED") {
      throw new Error("확인된 사입 내역은 삭제할 수 없습니다");
    }

    // Reverse the stock change
    const [ingredient] = await db.select().from(ingredients).where(eq(ingredients.id, tx.ingredientId));
    if (ingredient) {
      let newStock = ingredient.currentStock;
      if (tx.type === "IN") {
        newStock = Math.max(0, ingredient.currentStock - tx.quantity);
      } else if (tx.type === "OUT") {
        newStock = ingredient.currentStock + tx.quantity;
      }
      // PURCHASE PENDING: stock not yet applied
      if (tx.type !== "PURCHASE" || tx.confirmed === "CONFIRMED") {
        // Only adjust if stock was previously applied
      }
      if (tx.type === "IN" || tx.type === "OUT") {
        await db.update(ingredients).set({ currentStock: newStock, lastUpdated: new Date() }).where(eq(ingredients.id, tx.ingredientId));
      }
    }

    await db.delete(inventoryTransactions).where(eq(inventoryTransactions.id, id));
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

  // === DEPARTMENTS ===

  async getDepartments(): Promise<Department[]> {
    return await db.select().from(departments).orderBy(departments.name);
  }

  async createDepartment(insertDepartment: InsertDepartment): Promise<Department> {
    const [department] = await db.insert(departments).values(insertDepartment).returning();
    return department;
  }

  async deleteDepartment(id: number): Promise<void> {
    await db.delete(departments).where(eq(departments.id, id));
  }

  // === PERSONS ===

  async getPersons(): Promise<Person[]> {
    return await db.select().from(persons).orderBy(persons.name);
  }

  async createPerson(insertPerson: InsertPerson): Promise<Person> {
    const [person] = await db.insert(persons).values(insertPerson).returning();
    return person;
  }

  async deletePerson(id: number): Promise<void> {
    await db.delete(persons).where(eq(persons.id, id));
  }
}

export const storage = new DatabaseStorage();
