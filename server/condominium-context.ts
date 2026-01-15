import { Request, Response, NextFunction } from "express";
import { createStorage } from "./supabase-storage";

const storage = createStorage();

export interface CondominiumContext {
  condominiumId: string | null;
  userId: string | null;
  userRole: string | null;
  isAdmin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      condominiumContext?: CondominiumContext;
    }
  }
}

export async function condominiumContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const condominiumId = req.headers["x-condominium-id"] as string | undefined;
    const userId = req.headers["x-user-id"] as string | undefined;

    const context: CondominiumContext = {
      condominiumId: condominiumId || null,
      userId: userId || null,
      userRole: null,
      isAdmin: false,
    };

    if (userId) {
      const user = await storage.getUser(userId);
      if (user) {
        context.userRole = user.role;
        context.isAdmin = user.role === "admin";

        if (condominiumId && !context.isAdmin) {
          const userCondos = await storage.getUserCondominiums(userId);
          const hasAccess = userCondos.some((uc) => uc.condominiumId === condominiumId);
          if (!hasAccess) {
            context.condominiumId = null;
          }
        }
      }
    }

    req.condominiumContext = context;
    next();
  } catch (error) {
    console.error("[CondominiumContext] Error:", error);
    next();
  }
}

export function requireCondominium(req: Request, res: Response, next: NextFunction) {
  if (!req.condominiumContext?.condominiumId) {
    return res.status(400).json({ error: "Condomínio não selecionado" });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.condominiumContext?.isAdmin) {
    return res.status(403).json({ error: "Acesso negado: requer permissão de administrador" });
  }
  next();
}

export function requireSindicoOrAdmin(req: Request, res: Response, next: NextFunction) {
  const role = req.condominiumContext?.userRole;
  if (role !== "admin" && role !== "síndico") {
    return res.status(403).json({ error: "Acesso negado: requer permissão de síndico ou administrador" });
  }
  next();
}

export function getCondominiumId(req: Request): string | null {
  return req.condominiumContext?.condominiumId || null;
}

export function getUserId(req: Request): string | null {
  return req.condominiumContext?.userId || null;
}

export function isAdmin(req: Request): boolean {
  return req.condominiumContext?.isAdmin || false;
}
