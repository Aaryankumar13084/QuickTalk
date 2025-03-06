import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express"; // Added import for express.static

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Ensure uploads directory exists
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

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

  app.delete("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.deleteUser(req.user!.id);
    req.logout((err) => {
      if (err) {
        res.status(500).json({ message: "Failed to logout after account deletion" });
      } else {
        res.sendStatus(200);
      }
    });
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

  app.post("/api/messages/upload", upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      fileUrl,
      fileName: req.file.originalname,
      fileType: req.file.mimetype
    });
  });

  app.delete("/api/messages/:messageId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      await storage.deleteMessage(req.params.messageId, req.user!.id);
      res.sendStatus(200);
    } catch (error) {
      res.status(403).json({ message: "Unauthorized to delete this message" });
    }
  });

  app.patch("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { username, password } = req.body;

      if (username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== req.user!.id) {
          return res.status(400).send("Username already exists");
        }
      }

      const user = await storage.updateUser(req.user!.id, {
        ...req.body,
        password: password ? await hashPassword(password) : undefined,
      });

      res.json(user);
    } catch (err) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  const httpServer = createServer(app);
  return httpServer;
}