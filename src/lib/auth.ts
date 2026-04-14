import jwt from "jsonwebtoken";
import { env } from "../config/env";

export type VerifiedAuth =
  | { kind: "parent"; parentId: string; email: string }
  | { kind: "child"; userId: string; username: string };

/** Tiempo de vida del JWT (access token). */
const ACCESS_TOKEN_EXPIRES_IN: jwt.SignOptions["expiresIn"] = "7d";

const signOptions: jwt.SignOptions = {
  expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  algorithm: "HS256",
};

const verifyOptions: jwt.VerifyOptions = {
  algorithms: ["HS256"],
  /** Tolerancia de desfase de reloj entre emisor y validador (segundos). */
  clockTolerance: 60,
};

/** JWT para padre/tutor (`typ: parent`). */
export function createParentAuthToken(parentId: string, email: string): string {
  return jwt.sign({ sub: parentId, email, typ: "parent" }, env.jwtSecret, signOptions);
}

/** JWT para menor (`typ: child`). */
export function createChildAuthToken(userId: string, username: string): string {
  return jwt.sign({ sub: userId, typ: "child", username, email: "" }, env.jwtSecret, signOptions);
}

export function verifyAuthToken(token: string): VerifiedAuth {
  const decoded = jwt.verify(token, env.jwtSecret, verifyOptions) as jwt.JwtPayload;
  const sub = typeof decoded.sub === "string" ? decoded.sub : "";
  if (!sub) {
    throw new Error("Invalid token payload");
  }
  const typ = decoded.typ === "child" ? "child" : "parent";
  if (typ === "child") {
    const username = typeof decoded.username === "string" ? decoded.username : "";
    if (!username) {
      throw new Error("Invalid child token");
    }
    return { kind: "child", userId: sub, username };
  }
  const email = typeof decoded.email === "string" ? decoded.email : "";
  if (!email) {
    throw new Error("Invalid token payload");
  }
  return { kind: "parent", parentId: sub, email };
}
