import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // 🔥 Always use getSession() in middleware (NOT getUser)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const user = session?.user ?? null
  const pathname = request.nextUrl.pathname

  // Protect only these routes
  const protectedRoutes = [
    '/dashboard',
    '/food',
    '/store',
    '/wallet',
    '/ai',
    '/rider',
    '/admin',
  ]

  const isProtected = protectedRoutes.some(route =>
    pathname.startsWith(route)
  )

  // If not logged in and accessing protected route → redirect to login
  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If logged in and trying to access login → redirect to dashboard
  if (user && pathname === '/login') {
    return NextResponse.redirect(
      new URL('/student-dashboard', request.url)
    )
  }

  return response
}

// 🔥 IMPORTANT: Only match protected routes (DO NOT match everything)
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/food/:path*',
    '/store/:path*',
    '/wallet/:path*',
    '/ai/:path*',
    '/rider/:path*',
    '/admin/:path*',
  ],
}