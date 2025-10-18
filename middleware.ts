import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';

const protectedRoutes = ['/admin'];
const authRoutes = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const session = await getSession();
  const { pathname } = request.nextUrl;

  // Redirect authenticated users from login/register to home
  if (authRoutes.includes(pathname) && session) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Protect routes that require authentication
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    // RBAC for admin routes
    if (pathname.startsWith('/admin') && session.role !== 'ADMIN') {
      const url = request.nextUrl.clone();
      url.pathname = '/'; // Redirect non-admin users from admin routes
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
