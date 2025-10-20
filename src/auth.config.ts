// src/auth.config.ts

// 1. 'next-auth'에서 값(value)이 아닌 타입(type)을 올바르게 가져옵니다.
//    `import type NextAuthConfig` -> `import type { NextAuthConfig }`
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { login } from "@/lib/auth/actions";
import { loginSchema } from "@/lib/validators/auth";

// 2. authConfig 객체에 `NextAuthConfig` 타입을 명시적으로 적용합니다.
//    `satisfies` 대신 `: NextAuthConfig`를 사용하면 타입 추론이 더 강력해집니다.
//    이것 하나만으로 TypeScript가 모든 내부 타입을 추론할 수 있게 됩니다.
export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      // 3. (중요!) `credentials` 속성이 누락되었다는 에러를 해결하기 위해
      //    빈 객체라도 추가해줍니다. 이는 타입스크립트의 요구사항을 만족시키기 위함입니다.
      credentials: {},
      async authorize(credentials) {
        const validatedFields = loginSchema.safeParse(credentials);

        if (validatedFields.success) {
          const { username, password } = validatedFields.data;
          const user = await login(username, password);
          if (!user) return null;
          return user;
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // 4. `auth`와 `nextUrl`의 타입이 자동으로 추론되어 'any' 에러가 사라집니다.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtectedRoute = nextUrl.pathname.startsWith("/admin");

      if (isProtectedRoute) {
        if (isLoggedIn) return true;
        return false; // 로그인 페이지로 리디렉션
      } else if (isLoggedIn) {
        if (
          nextUrl.pathname.startsWith("/login") ||
          nextUrl.pathname.startsWith("/register")
        ) {
          return Response.redirect(new URL("/", nextUrl));
        }
      }
      return true;
    },
    // 5. `token`과 `user`의 타입이 자동으로 추론됩니다.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.username = user.username;
      }
      return token;
    },
    // 6. `session`과 `token`의 타입이 자동으로 추론됩니다.
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.username = token.username as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
};
