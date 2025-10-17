"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { loginSchema, registerSchema } from "@/lib/validators/auth";
import { z } from "zod";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from 'uuid';
import { createSession, deleteSession } from "./session";

type RegisterFormData = z.infer<typeof registerSchema>;
type LoginFormData = z.infer<typeof loginSchema>;

export async function register(formData: RegisterFormData) {
  try {
    const { username, password } = registerSchema.parse(formData);

    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, username),
    });

    if (existingUser) {
      return { error: "Username already taken." };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.insert(users).values({
      id: uuidv4(),
      username,
      hashedPassword,
      role: "USER",
    }).returning({ id: users.id });

    if (newUser[0]?.id) {
      await createSession(newUser[0].id);
      return { success: true };
    } else {
      return { error: "Failed to create user." };
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Registration error:", error);
    return { error: "An unexpected error occurred." };
  }
}

export async function login(formData: LoginFormData) {
  try {
    const { username, password } = loginSchema.parse(formData);

    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, username),
    });

    if (!user) {
      return { error: "Invalid credentials." };
    }

    const passwordMatch = await bcrypt.compare(password, user.hashedPassword);

    if (!passwordMatch) {
      return { error: "Invalid credentials." };
    }

    await createSession(user.id);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Login error:", error);
    return { error: "An unexpected error occurred." };
  }
}

export async function logout() {
  deleteSession();
  return { success: true };
}
