import Cookies from "js-cookie";

const TOKEN_COOKIE = "spms_token";

const COOKIE_OPTIONS = {
  expires: 7,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export function getAuthToken(): string | undefined {
  return Cookies.get(TOKEN_COOKIE);
}

export function setAuthToken(token: string): void {
  Cookies.set(TOKEN_COOKIE, token, COOKIE_OPTIONS);
}

export function clearAuthToken(): void {
  Cookies.remove(TOKEN_COOKIE);
}
