// src/auth.ts

import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export const {
  handlers: { GET, POST }, // 이 부분이 route.ts에서 사용됩니다.
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig);
