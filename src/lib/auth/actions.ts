"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { registerSchema } from "@/lib/validators/auth";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

export async function login(username: string, password: string): Promise<any> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!user) {
      throw new Error("Incorrect username or password");
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.hashedPassword
    );

    if (!isPasswordCorrect) {
      throw new Error("Incorrect username or password");
    }

    return {
      id: user.id,
      name: user.username,
      username: user.username,
      role: user.role,
    };
  } catch (error) {
    console.error("Login error:", error);
    return null;
  }
}

export async function register(values: unknown) {
  const validatedFields = registerSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid fields!" };
  }

  const { username, password } = validatedFields.data;

  const existingUser = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (existingUser) {
    return { error: "Username already in use!" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await db.insert(users).values({
    username,
    hashedPassword,
  });

  return { success: "User created successfully!" };
}
