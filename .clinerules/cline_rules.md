---
description: Guidelines for creating and maintaining Cline rules to ensure consistency and effectiveness.
globs: .cline/rules/*.md
alwaysApply: true
---

- **Required Rule Structure:**

  ```markdown
  ---
  description: Clear, one-line description of what the rule enforces
  globs: path/to/files/*.ext, other/path/**/*
  alwaysApply: boolean
  ---

  - **Main Points in Bold**
    - Sub-points with details
    - Examples and explanations
  ```

- **File References:**

  - Use `[filename](mdc:path/to/file)` ([filename](mdc:filename)) to reference files
  - Example: [prisma.md](.clinerules/prisma.md) for rule references
  - Example: [schema.prisma](mdc:prisma/schema.prisma) for code references

- **Code Examples:**

  - Use language-specific code blocks

  ```typescript
  // ✅ DO: Show good examples
  const goodExample = true;

  // ❌ DON'T: Show anti-patterns
  const badExample = false;
  ```

- **Rule Content Guidelines:**

  - Start with high-level overview
  - Include specific, actionable requirements
  - Show examples of correct implementation
  - Reference existing code when possible
  - Keep rules DRY by referencing other rules

- **Rule Maintenance:**

  - Update rules when new patterns emerge
  - Add examples from actual codebase
  - Remove outdated patterns
  - Cross-reference related rules

- **Best Practices:**

  - Use bullet points for clarity
  - Keep descriptions concise
  - Include both DO and DON'T examples
  - Reference actual code over theoretical examples
  - Use consistent formatting across rules

- **Drizzle ORM Schema Guidelines:**

  - **Table and Column Naming:**
    - Use `sqliteTable` for table definitions.
    - Column names should be descriptive and follow `snake_case` in the database, but `camelCase` in TypeScript.
    - Example: `hashedPassword: text("hashed_password")`
  - **Primary Keys:**
    - Every table should have a primary key, typically `id`.
    - Use `notNull().primaryKey()` for primary key columns.
    - For UUIDs, use `$defaultFn(() => crypto.randomUUID())`.
    - Example: `id: text("id").notNull().primaryKey().$defaultFn(() => crypto.randomUUID())`
  - **Foreign Keys:**
    - Define foreign key relationships using `references(() => otherTable.id)`.
    - Ensure referenced columns are `notNull()`.
    - Example: `userId: text("user_id").notNull().references(() => users.id)`
  - **Default Values:**
    - Use `default()` for columns that should have a default value.
    - For timestamps, use `sql` template literal with `CURRENT_TIMESTAMP`.
    - Example: `rentalDate: integer("rental_date", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`)`
  - **Uniqueness:**
    - Use `unique()` for columns that must have unique values (e.g., usernames).
    - Example: `username: text("username").notNull().unique()`
  - **Data Types:**
    - Use appropriate Drizzle ORM data types (`text`, `integer`, etc.) for columns.
    - For timestamp columns, specify `mode: "timestamp"`.
    - Example: `rentalDate: integer("rental_date", { mode: "timestamp" })`

- **Use next-auth@4.24.11:**
