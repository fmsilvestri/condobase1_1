import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface JWTPayload {
  sub: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      jwtUser?: JWTPayload;
    }
  }
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Token ausente" });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error("[Auth] JWT_SECRET não configurado");
    return res.status(500).json({ error: "Erro de configuração do servidor" });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    req.jwtUser = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

export function optionalJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return next();
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    req.jwtUser = decoded;
  } catch {
  }
  
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.condominiumContext?.userId) {
    return res.status(401).json({ error: "Autenticação necessária" });
  }
  next();
}
