import { Request, Response, NextFunction } from "express";
import { createStorage } from "./supabase-storage";

const storage = createStorage();

export async function identificarAdminPlataforma(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.condominiumContext?.userId;
    
    if (!userId) {
      req.isAdminPlataforma = false;
      return next();
    }
    
    const user = await storage.getUser(userId);
    req.isAdminPlataforma = user?.role === "admin";
    next();
  } catch (error) {
    console.error("[AdminMiddleware] Error:", error);
    req.isAdminPlataforma = false;
    next();
  }
}

export function permitirApenasAdminPlataforma(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.isAdminPlataforma) {
    return res.status(403).json({ error: "Acesso restrito à plataforma" });
  }
  next();
}

declare global {
  namespace Express {
    interface Request {
      isAdminPlataforma?: boolean;
    }
  }
}
