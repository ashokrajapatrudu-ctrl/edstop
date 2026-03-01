import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set(name, value, options);
        },
        remove(name: string, options: any) {
          response.cookies.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );

  // 🔥 IMPORTANT: refresh session first
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;

  const pathname = request.nextUrl.pathname;

  // Redirect logged-in users away from login page
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/student-dashboard', request.url));
  }

  const protectedRoutes = [
    '/dashboard',
    '/food',
    '/store',
    '/wallet',
    '/ai',
    '/rider',
    '/admin',
  ];

  const isProtected = protectedRoutes.some(route =>
    pathname.startsWith(route)
  );

  // 🔴 If not logged in and trying to access protected route
  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Role-based logic
  if (user && isProtected) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role ?? 'student';

    if (pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    if (pathname.startsWith('/rider') && role !== 'rider') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    if (
      ['/dashboard', '/food', '/store', '/wallet', '/ai'].some(route =>
        pathname.startsWith(route)
      ) &&
      role !== 'student'
    ) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};