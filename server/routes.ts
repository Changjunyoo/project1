
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

async function seedDatabase() {
  const ingredients = await storage.getIngredients();
  if (ingredients.length === 0) {
    console.log("Seeding database...");
    
    // Create Ingredients
    const rice = await storage.createIngredient({
      name: "쌀 (Rice)",
      unit: "kg",
      minStockLevel: 20
    });
    
    const kimchi = await storage.createIngredient({
      name: "김치 (Kimchi)",
      unit: "kg",
      minStockLevel: 10
    });
    
    const beef = await storage.createIngredient({
      name: "소고기 (Beef)",
      unit: "kg",
      minStockLevel: 5
    });

    const onions = await storage.createIngredient({
      name: "양파 (Onion)",
      unit: "망 (Bag)",
      minStockLevel: 3
    });

    // Add Initial Stock (IN transactions)
    await storage.createTransaction({
      ingredientId: rice.id,
      type: "IN",
      quantity: 50,
      unitPrice: 3000
    });

    await storage.createTransaction({
      ingredientId: kimchi.id,
      type: "IN",
      quantity: 30,
      unitPrice: 5000
    });
    
    await storage.createTransaction({
      ingredientId: beef.id,
      type: "IN",
      quantity: 10,
      unitPrice: 25000
    });

    // Use some stock (OUT transactions)
    await storage.createTransaction({
      ingredientId: rice.id,
      type: "OUT",
      quantity: 5,
      destination: "강남점 (Gangnam Branch)"
    });

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

  return httpServer;
}
