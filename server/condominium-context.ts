import { Request, Response, NextFunction } from "express";
import { createStorage } from "./supabase-storage";

const storage = createStorage();

export interface CondominiumContext {
  condominiumId: string | null;
  userId: string | null;
  userRole: string | null;
  condominiumRole: string | null;
  isAdmin: boolean;
  isSindicoInCondominium: boolean;
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
    const requestedCondominiumId = req.headers["x-condominium-id"] as string | undefined;
    const jwtUserId = req.jwtUser?.sub;
    const jwtEmail = req.jwtUser?.email;
    const devUserId = process.env.NODE_ENV === "development" ? req.headers["x-user-id"] as string | undefined : undefined;

    const context: CondominiumContext = {
      condominiumId: null,
      userId: null,
      userRole: null,
      condominiumRole: null,
      isAdmin: false,
      isSindicoInCondominium: false,
    };

    let user = null;
    
    if (jwtUserId) {
      user = await storage.getUser(jwtUserId);
      if (!user && jwtEmail) {
        user = await storage.getUserByEmail(jwtEmail);
      }
    } else if (devUserId) {
      user = await storage.getUser(devUserId);
    }
    
    if (user) {
      context.userId = user.id;
      context.userRole = user.role;
      context.isAdmin = user.role === "admin";

      if (requestedCondominiumId) {
        const userCondos = await storage.getUserCondominiums(user.id);
        const userCondoEntry = userCondos.find((uc) => uc.condominiumId === requestedCondominiumId);
        
        if (userCondoEntry || context.isAdmin) {
          context.condominiumId = requestedCondominiumId;
          context.condominiumRole = userCondoEntry?.role || null;
          context.isSindicoInCondominium = userCondoEntry?.role === "síndico" || context.isAdmin;
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
  const ctx = req.condominiumContext;
  const isPlatformAdmin = ctx?.isAdmin;
  const isSindicoInCondo = ctx?.isSindicoInCondominium;
  
  if (!isPlatformAdmin && !isSindicoInCondo) {
    return res.status(403).json({ error: "Acesso negado: requer permissão de síndico ou administrador" });
  }
  next();
}

export function requireGestao(req: Request, res: Response, next: NextFunction) {
  const ctx = req.condominiumContext;
  const isPlatformAdmin = ctx?.isAdmin;
  const role = ctx?.condominiumRole;
  const gestaoRoles = ["síndico", "conselheiro", "administradora"];
  
  if (!isPlatformAdmin && (!role || !gestaoRoles.includes(role))) {
    return res.status(403).json({ error: "Acesso negado: requer permissão de gestão (síndico, conselheiro ou administradora)" });
  }
  next();
}

export function isGestao(req: Request): boolean {
  const ctx = req.condominiumContext;
  const gestaoRoles = ["síndico", "conselheiro", "administradora"];
  return ctx?.isAdmin || (ctx?.condominiumRole && gestaoRoles.includes(ctx.condominiumRole)) || false;
}

export function getCondominiumRole(req: Request): string | null {
  return req.condominiumContext?.condominiumRole || null;
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
