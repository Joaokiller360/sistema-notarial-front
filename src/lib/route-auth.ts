import { jwtDecode } from "jwt-decode";
import { NextRequest } from "next/server";

interface JwtPayload {
  sub: string;
  exp: number;
  iat: number;
}

export function requireAuth(req: NextRequest): string | null {
  const token = req.cookies.get("notaria_access_token")?.value;
  if (!token) return null;

  try {
    const decoded = jwtDecode<JwtPayload>(token);
    if (!decoded.sub || !decoded.exp) return null;
    if (decoded.exp * 1000 < Date.now()) return null;
    return decoded.sub;
  } catch {
    return null;
  }
}
