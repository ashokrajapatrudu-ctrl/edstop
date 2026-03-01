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
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 🔥 VERY IMPORTANT — do NOT use getUser()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const user = session?.user ?? null
  const pathname = request.nextUrl.pathname

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

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(
      new URL('/student-dashboard', request.url)
    )
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}