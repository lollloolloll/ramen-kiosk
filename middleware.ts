import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession, getSession } from '@/lib/auth/session';

const protectedRoutes = ['/admin', '/kiosk'];
const authRoutes = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  await updateSession(request);

  const session = await getSession();
  const { pathname } = request.nextUrl;

  if (protectedRoutes.some(route => pathname.startsWith(route)) && !session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (authRoutes.includes(pathname) && session) {
    const url = request.nextUrl.clone();
    url.pathname = '/'; // Redirect authenticated users from login/register to home
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
