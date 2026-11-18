/**
 * Mock auth helpers for local development without a Supabase project.
 *
 * When NEXT_PUBLIC_DEV_MOCK_AUTH=true, these functions simulate auth behaviour
 * so the login/signup UI can be tested without any backend.
 */

export const IS_MOCK_AUTH = process.env.NEXT_PUBLIC_DEV_MOCK_AUTH === "true";

export interface MockUser {
  id: string;
  email: string;
  full_name: string;
  company_name: string;
}

export const DEFAULT_MOCK_USER: MockUser = {
  id: "mock-user-001",
  email: "demo@smartrecon.in",
  full_name: "CA Rajesh Sharma",
  company_name: "Sharma & Associates",
};

const STORAGE_KEY = "mock-auth-session";
const COOKIE_NAME = "mock-session";

function setMockCookie(value: string) {
  if (typeof document !== "undefined") {
    document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=604800; SameSite=Lax`;
  }
}

function clearMockCookie() {
  if (typeof document !== "undefined") {
    document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

/**
 * Simulates a login. Stores user in localStorage and sets a session cookie.
 */
export function mockSignIn(email: string, _password: string): MockUser {
  if (!email || !email.includes("@")) {
    throw new Error("Please enter a valid email address.");
  }
  const user: MockUser = {
    ...DEFAULT_MOCK_USER,
    email,
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    setMockCookie("true");
  }
  return user;
}

/**
 * Simulates a signup.
 */
export function mockSignUp(
  email: string,
  _password: string,
  fullName: string,
  companyName?: string
): MockUser {
  if (!email || !email.includes("@")) {
    throw new Error("Please enter a valid email address.");
  }
  const user: MockUser = {
    id: `mock-user-${Date.now()}`,
    email,
    full_name: fullName || "New User",
    company_name: companyName || "My Accounting Firm",
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    setMockCookie("true");
  }
  return user;
}

/**
 * Returns the current mock session, or null if not logged in.
 */
export function getMockSession(): MockUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MockUser;
  } catch {
    return null;
  }
}

/**
 * Clears the mock session (logout).
 */
export function mockSignOut(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
    clearMockCookie();
  }
}

