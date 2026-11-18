import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a Supabase client for use in Server Components, Server Actions,
 * and Route Handlers.
 *
 * Must be called fresh for every request — never cache or share across requests.
 *
 * Uses the Next.js `cookies()` API to read/write the Supabase auth session.
 * In Server Components cookies can be read but not written, so `setAll`
 * is a no-op there (the proxy handles session refresh writes).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // `setAll` is called from Server Components where cookies cannot be
            // written. This is expected — the proxy handles session refresh.
          }
        },
      },
    }
  );
}
