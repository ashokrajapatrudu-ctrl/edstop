import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  // Access environment variables at runtime in browser
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // Validate that environment variables exist
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase environment variables:', {
      url: supabaseUrl ? 'present' : 'missing',
      key: supabaseAnonKey ? 'present' : 'missing'
    });
    throw new Error(
      'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
    );
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          if (typeof document === 'undefined') return [];
          return document.cookie.split(';').map((cookie) => {
            const [name, ...rest] = cookie.trim().split('=');
            return { name, value: decodeURIComponent(rest.join('=')) };
          });
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          if (typeof document === 'undefined') return;
          cookiesToSet.forEach(({ name, value, options }) => {
            let cookieString = `${name}=${encodeURIComponent(value)}; Path=${options?.path || '/'}; Secure; SameSite=None`;

            if (options?.maxAge) {
              cookieString += `; max-age=${options.maxAge}`;
            }
            if (options?.domain) {
              cookieString += `; domain=${options.domain}`;
            }
            if (options?.expires) {
              cookieString += `; expires=${options.expires}`;
            }
            document.cookie = cookieString;
          });
        },
      },
    }
  );
}
