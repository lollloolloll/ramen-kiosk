// src/app/api/auth/[...nextauth]/route.ts

import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { login } from "@/lib/auth/actions"; // 이 경로는 실제 파일 위치에 맞게 확인해주세요.
import { loginSchema } from "@/lib/validators/auth"; // 이 경로도 확인해주세요.

// v4에서는 NextAuthOptions 타입을 사용하여 모든 설정을 하나의 객체에 정의합니다.
export const authOptions: NextAuthOptions = {
  // 1. Providers 설정
  providers: [
    CredentialsProvider({
      // 로그인 폼에 표시될 이름 (선택 사항)
      name: "Credentials",
      // v4에서는 credentials 객체를 비워두면 안 됩니다.
      // 로그인 폼을 직접 만들 것이므로, 빈 객체 대신 간단한 정의를 넣어줍니다.
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // credentials가 undefined일 수 있으므로 예외 처리
        if (!credentials) {
          return null;
        }

        const validatedFields = loginSchema.safeParse(credentials);

        if (validatedFields.success) {
          const { username, password } = validatedFields.data;
          // 여기서 login 함수는 DB에서 유저를 찾아 반환해야 합니다.
          const user = await login(username, password);

          // 유저를 찾았고, 인증에 성공했다면 user 객체를 반환합니다.
          if (user) {
            return user;
          }
        }
        // 인증 실패 시 null을 반환합니다.
        return null;
      },
    }),
  ],

  // 2. 페이지 설정
  pages: {
    signIn: "/login", // 커스텀 로그인 페이지 경로
  },

  // 3. 세션 전략 설정 (JWT 사용)
  session: {
    strategy: "jwt",
  },

  // 4. 콜백 설정
  callbacks: {
    // JWT가 생성되거나 업데이트될 때마다 호출됩니다.
    // user 파라미터는 authorize에서 반환된 값입니다 (로그인 시에만 존재).
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.username = user.username;
      }
      return token;
    },

    // 클라이언트에서 세션을 조회할 때마다 호출됩니다.
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.username = token.username;
      }
      return session;
    },
  },
};

// NextAuth 함수를 실행하고, 결과를 GET과 POST 핸들러로 export합니다.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
