import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

async function seedDatabase() {
  const ingredients = await storage.getIngredients();
  if (ingredients.length === 0) {
    console.log("Seeding database...");

    // Seed categories
    const catList = await storage.getCategories();
    if (catList.length === 0) {
      await storage.createCategory({ name: "공산품" });
      await storage.createCategory({ name: "야채" });
      await storage.createCategory({ name: "육류" });
    }

    console.log("Database seeded successfully!");
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Seed on startup
  seedDatabase().catch(console.error);
  
  // Ingredients Routes
  app.get(api.ingredients.list.path, async (req, res) => {
    const ingredients = await storage.getIngredients();
    res.json(ingredients);
  });

  app.get(api.ingredients.get.path, async (req, res) => {
    const id = Number(req.params.id);
    const ingredient = await storage.getIngredient(id);
    if (!ingredient) {
      return res.status(404).json({ message: "Ingredient not found" });
    }
    res.json(ingredient);
  });

  app.post(api.ingredients.create.path, async (req, res) => {
    try {
      const input = api.ingredients.create.input.parse(req.body);
      const ingredient = await storage.createIngredient(input);
      res.status(201).json(ingredient);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.ingredients.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.ingredients.update.input.parse(req.body);
      
      const existing = await storage.getIngredient(id);
      if (!existing) {
        return res.status(404).json({ message: "Ingredient not found" });
      }

      const updated = await storage.updateIngredient(id, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.ingredients.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getIngredient(id);
    if (!existing) {
      return res.status(404).json({ message: "Ingredient not found" });
    }
    await storage.deleteIngredient(id);
    res.status(204).send();
  });

  // Transaction Routes
  app.get(api.transactions.list.path, async (req, res) => {
    const ingredientId = req.query.ingredientId ? Number(req.query.ingredientId) : undefined;
    const transactions = await storage.getTransactions(ingredientId);
    res.json(transactions);
  });

  app.post(api.transactions.create.path, async (req, res) => {
    try {
      const input = api.transactions.create.input.parse(req.body);
      const transaction = await storage.createTransaction(input);
      res.status(201).json(transaction);
    } catch (err) {
      if (err instanceof z.ZodError) {
        console.error("Transaction validation error:", JSON.stringify(err.errors, null, 2));
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      if (err instanceof Error && err.message === "Insufficient stock") {
        return res.status(422).json({ message: "Insufficient stock available" });
      }
      throw err;
    }
  });

  app.patch(api.transactions.confirm.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const transaction = await storage.confirmTransaction(id);
      res.json(transaction);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "Transaction not found") {
          return res.status(404).json({ message: err.message });
        }
        return res.status(422).json({ message: err.message });
      }
      throw err;
    }
  });

  app.patch(api.transactions.reject.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const transaction = await storage.rejectTransaction(id);
      res.json(transaction);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "Transaction not found") {
          return res.status(404).json({ message: err.message });
        }
        return res.status(422).json({ message: err.message });
      }
      throw err;
    }
  });

  app.patch(api.transactions.reset.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const transaction = await storage.resetTransaction(id);
      res.json(transaction);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "Transaction not found") {
          return res.status(404).json({ message: err.message });
        }
        return res.status(422).json({ message: err.message });
      }
      throw err;
    }
  });

  app.patch(api.transactions.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.transactions.update.input.parse(req.body);
      const transaction = await storage.updateTransaction(id, input);
      res.json(transaction);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      if (err instanceof Error) {
        if (err.message === "Transaction not found") {
          return res.status(404).json({ message: err.message });
        }
        return res.status(422).json({ message: err.message });
      }
      throw err;
    }
  });

  app.delete(api.transactions.delete.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteTransaction(id);
      res.status(204).send();
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "Transaction not found") {
          return res.status(404).json({ message: err.message });
        }
        return res.status(422).json({ message: err.message });
      }
      throw err;
    }
  });

  // Branch Routes
  app.get(api.branches.list.path, async (req, res) => {
    const branches = await storage.getBranches();
    res.json(branches);
  });

  app.post(api.branches.create.path, async (req, res) => {
    try {
      const input = api.branches.create.input.parse(req.body);
      const branch = await storage.createBranch(input);
      res.status(201).json(branch);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.patch(api.branches.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.branches.update.input.parse(req.body);
      const existing = await storage.getBranch(id);
      if (!existing) return res.status(404).json({ message: "Branch not found" });
      const updated = await storage.updateBranch(id, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.delete(api.branches.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getBranch(id);
    if (!existing) return res.status(404).json({ message: "Branch not found" });
    await storage.deleteBranch(id);
    res.status(204).send();
  });

  // Category Routes
  app.get(api.categories.list.path, async (req, res) => {
    const cats = await storage.getCategories();
    res.json(cats);
  });

  app.post(api.categories.create.path, async (req, res) => {
    try {
      const input = api.categories.create.input.parse(req.body);
      const category = await storage.createCategory(input);
      res.status(201).json(category);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.delete(api.categories.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteCategory(id);
    res.status(204).send();
  });

  // Origin Routes
  app.get(api.origins.list.path, async (req, res) => {
    const origs = await storage.getOrigins();
    res.json(origs);
  });

  app.post(api.origins.create.path, async (req, res) => {
    try {
      const input = api.origins.create.input.parse(req.body);
      const origin = await storage.createOrigin(input);
      res.status(201).json(origin);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.delete(api.origins.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteOrigin(id);
    res.status(204).send();
  });

  return httpServer;
}
