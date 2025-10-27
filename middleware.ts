// middleware.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Middleware 함수 정의
export async function middleware(req: NextRequest) {
  // 1. JWT 토큰을 요청(req)으로부터 가져옵니다.
  //    'secret'은 .env 파일에 정의된 NEXTAUTH_SECRET과 동일해야 합니다.
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  const { nextUrl } = req;

  // 보호할 경로와 인증 관련 경로 정의
  const protectedRoutes = ["/items", "/records"];
  const authRoutes = ["/login", "/register"];

  // 현재 경로가 인증 관련 경로인지 확인
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);
  // 현재 경로가 보호된 경로인지 확인
  const isProtectedRoute = protectedRoutes.includes(nextUrl.pathname);

  // 2. 로그인 여부 확인 (토큰 존재 유무)
  const isLoggedIn = !!token;

  // 3. 분기 처리 로직 (v5 코드와 유사하게 구현)

  // Case 1: 인증 페이지(/login, /register)에 접근 시
  if (isAuthRoute) {
    // 이미 로그인한 상태라면 메인 페이지로 리디렉션
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    // 로그인하지 않았다면 페이지를 그대로 보여줌
    return NextResponse.next();
  }

  // Case 2: 보호된 페이지(/admin)에 접근 시
  if (isProtectedRoute) {
    // 로그인하지 않았다면 로그인 페이지로 리디렉션
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
    // 로그인은 했지만, 권한이 'ADMIN'이 아니라면 메인 페이지로 리디렉션
    // token.role은 jwt 콜백에서 설정한 값입니다.
    if (token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
  }

  // 그 외의 모든 경우는 요청을 그대로 통과시킴
  return NextResponse.next();
}

// Middleware를 적용할 경로 설정 (기존 config 유지)
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    "/login",
    "/register",
  ],
};
