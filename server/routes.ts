import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const users = await storage.getAllUsers();
    res.json(users.filter(u => u.id !== req.user!.id));
  });

  app.get("/api/users/search", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const query = req.query.q as string;
    if (!query) return res.json([]);

    const users = await storage.searchUsers(query);
    res.json(users.filter(u => u.id !== req.user!.id));
  });

  app.get("/api/messages/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.params.userId;
    if (!userId) return res.sendStatus(400);

    const messages = await storage.getMessagesBetweenUsers(req.user!.id, userId);
    res.json(messages);
  });

  app.post("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const data = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage({
        ...data,
        senderId: req.user!.id,
      });
      res.json(message);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json(err.errors);
      } else {
        res.sendStatus(500);
      }
    }
  });

  app.post("/api/online", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.setUserOnlineStatus(req.user!.id, true);
    res.sendStatus(200);
  });

  app.post("/api/offline", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.setUserOnlineStatus(req.user!.id, false);
    res.sendStatus(200);
  });

  const httpServer = createServer(app);
  return httpServer;
}