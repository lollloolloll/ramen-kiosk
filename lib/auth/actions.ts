"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { registerSchema } from "@/lib/validators/auth";
import { z } from "zod";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from 'uuid';

type RegisterFormData = z.infer<typeof registerSchema>;

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

    await db.insert(users).values({
      id: uuidv4(),
      username,
      hashedPassword,
      role: "USER",
    });

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Registration error:", error);
    return { error: "An unexpected error occurred." };
  }
}
