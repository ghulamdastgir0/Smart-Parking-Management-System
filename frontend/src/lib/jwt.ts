export interface DecodedToken {
  sub: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "CUSTOMER";
  exp: number;
}

/**
 * Decodes the JWT payload without verifying the signature — only used for UI routing
 * decisions (which nav/pages to show). The backend guards are the real authorization
 * boundary; a forged token here would simply be rejected by the API.
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized);
    return JSON.parse(decoded) as DecodedToken;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded) return true;
  return decoded.exp * 1000 < Date.now();
}
