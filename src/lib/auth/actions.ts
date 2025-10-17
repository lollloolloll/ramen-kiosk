"use server";

import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { db } from "../db";
import { users } from "../db/schema";
import { loginSchema, registerSchema } from "../validators/auth";
import { ZodError } from "zod";
import { createSession, deleteSession } from "./session";

export async function register(formData: FormData) {
  try {
    const { username, password } = registerSchema.parse(Object.fromEntries(formData));

    const existingUser = await db.select().from(users).where(eq(users.username, username));

    if (existingUser.length > 0) {
      return { error: "Username already exists." };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.insert(users).values({
      id: crypto.randomUUID(),
      username,
      hashedPassword,
      role: "USER",
    });

    return { success: true };
  } catch (error) {
    if (error instanceof ZodError) {
      return { error: error.issues.map((issue) => issue.message).join(", ") };
    }
    return { error: "Failed to register user." };
  }
}

export async function login(formData: FormData) {
  try {
    const { username, password } = loginSchema.parse(Object.fromEntries(formData));

    const [user] = await db.select().from(users).where(eq(users.username, username));

    if (!user) {
      return { error: "Invalid credentials." };
    }

    const passwordMatch = await bcrypt.compare(password, user.hashedPassword);

    if (!passwordMatch) {
      return { error: "Invalid credentials." };
    }

    await createSession(user.id, user.role);
    return { success: true };
  } catch (error) {
    if (error instanceof ZodError) {
      return { error: error.issues.map((issue) => issue.message).join(", ") };
    }
    return { error: "Failed to login." };
  }
}

export async function logout() {
  await deleteSession();
  return { success: true };
}
