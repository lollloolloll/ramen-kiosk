# Repository Planning Graph (RPG) Method - PRD Template

This template teaches you (AI or human) how to create structured, dependency-aware PRDs using the RPG methodology from Microsoft Research. The key insight: separate WHAT (functional) from HOW (structural), then connect them with explicit dependencies.
...

# Overview

Problem Statement

The current process for lending ramen to teenagers at the center relies on a manual, paper-based logbook. This system is inefficient, prone to human error (illegible handwriting, forgotten entries), provides zero real-time visibility into inventory, and makes it impossible to gather data on usage patterns. It creates administrative overhead for staff and a slow, analog experience for tech-savvy teenagers.

Target Users

Teenager (Kiosk User): Wants a quick, self-service, and modern way to borrow ramen without interacting with staff. They are comfortable with digital interfaces and expect instant feedback.

Center Staff/Intern (Admin): Needs to manage ramen inventory, track lending history, and understand which products are popular. They have limited time for administrative tasks and require a simple, intuitive interface to get their job done quickly.

Success Metrics

Efficiency: >80% reduction in time spent by staff on manually logging rentals and checking stock.

Data Accuracy: 100% accuracy for all rental records and real-time inventory counts.

User Adoption: >90% of ramen rentals are processed through the kiosk system within the first month of deployment.

# Functional Decomposition

Capability Tree
Capability: User Authentication & Authorization

Handles user identity, session management, and access control for both regular users and administrators.

Feature: User Registration

Description: Allows a new user to create an account with their name, phone number, birth date, school, and consent to personal information collection. The PIN is no longer used.

Inputs: name (string), phoneNumber (string), birthDate (date), school (string), personalInfoConsent (boolean).

Outputs: Newly created user object or an error if the phone number is already in use.

Behavior: Assigns a default role of 'USER'.

Feature: User Login

Description: Authenticates a user with their credentials and establishes a session.

Inputs: username (string), password (string).

Outputs: A session token/cookie for subsequent requests.

Behavior: Compares the provided password against the stored hash.

Feature: Role-Based Access Control (RBAC)

Description: Restricts access to specific features (like the admin panel) based on the user's role.

Inputs: User session/token.

Outputs: Access granted or denied decision (e.g., redirect, HTTP 403).

Behavior: Checks if the user's role property is 'ADMIN' before rendering admin-only routes or executing admin-only actions.

Capability: Inventory Management

Covers all operations related to creating, updating, and viewing the ramen product catalog and stock levels. This is primarily an admin-facing capability.

Feature: CRUD for Ramens

Description: Allows administrators to Create, Read, Update, and Delete ramen products.

Inputs: Ramen data (name, manufacturer, stock, imageUrl).

Outputs: Confirmation of the operation and the updated state of the ramen data.

Behavior: Directly manipulates the ramens table in the database. Stock updates are atomic.

Capability: Rental Processing

The core user-facing workflow for borrowing ramen from the kiosk.

Feature: View Available Ramens

Description: Displays a list of all ramen products that are currently in stock.

Inputs: None.

Outputs: An array of ramen objects.

Behavior: Fetches all ramens from the database where the stock count is greater than zero.

Feature: Execute Rental

Description: Allows a logged-in user to rent a selected ramen, which updates inventory and records the transaction. After the rental is complete, a confirmation message is displayed.

Inputs: userId, ramenId.

Outputs: A new rental record object.

Behavior: Creates a new entry in the rentalRecords table and atomically decrements the stock count for the chosen ramen in the ramens table. This should be a database transaction.

Capability: Data & Reporting

Enables administrators to view historical data and gain insights from system usage.

Feature: View Rental History

Description: Displays a searchable and filterable log of all rental transactions. The dashboard will have daily, weekly, and monthly tabs. It will also show statistics on which school and gender consumed how many ramens within a specific period.

Inputs: Optional filters like userId or date range.

Outputs: A list of rental record objects.

Behavior: Queries the rentalRecords table, joining with user and ramen data for display.

Feature: Export Rental History

Description: Allows administrators to export the rental history to an Excel file.

Inputs: None.

Outputs: An Excel file containing the rental history.

Behavior: Generates an Excel file from the rental records data.

# Structural Decomposition

Repository Structure
code
Code
download
content_copy
expand_less
ramen-kiosk/
├── app/
│   ├── (auth)/              # Maps to: User Auth UI
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (admin)/             # Maps to: Admin UI
│   │   ├── layout.tsx       # RBAC logic here
│   │   ├── stock/page.tsx
│   │   └── records/page.tsx
│   ├── (kiosk)/             # Maps to: Kiosk UI
│   │   └── page.tsx
│   └── api/
│       ├── auth/            # Maps to: User Auth API
│       └── ramens/          # Maps to: Inventory API
├── components/
│   ├── ui/                  # shadcn/ui components
│   └── shared/
├── lib/
│   ├── auth/                # Maps to: Auth Capability logic
│   ├── db/                  # Maps to: Database Schema & Queries
│   └── validators/          # Maps to: Zod Schemas
└── Dockerfile
└── docker-compose.yml
Module Definitions
Module: Database (lib/db/)

Maps to capability: Foundation for all data-driven capabilities.

Responsibility: Defines the complete database schema (users, ramens, rentals) using Drizzle ORM and provides typed query functions.

File structure: schema.ts, queries.ts, index.ts

Exports: db instance, table definitions, and functions like getAllRamens(), createUser().

Module: Authentication (lib/auth/, app/api/auth/, app/(auth)/)

Maps to capability: User Authentication & Authorization.

Responsibility: Handles all logic for registration, login, session management, and role checks.

File structure: actions.ts (Server Actions), route.ts (API handlers), page.tsx (UI).

Exports: login(), register() server actions; auth middleware/utility functions.

Module: Kiosk App (app/(kiosk)/, components/shared/)

Maps to capability: Rental Processing.

Responsibility: Provides the user interface for viewing and renting ramen.

File structure: page.tsx, RamenCard.tsx, RentalDialog.tsx.

Exports: The primary Kiosk user interface component.

Module: Admin Panel (app/(admin)/)

Maps to capability: Inventory Management, Data & Reporting.

Responsibility: Provides the UI for administrators to manage stock and view records.

File structure: stock/page.tsx, records/page.tsx, layout, and related components.

Exports: The Admin dashboard interface.

# Dependency Graph

Dependency Chain
Foundation Layer (Phase 0)

Database: Defines all data structures (schemas for users, ramens, rental records). Has no dependencies.

Logic Layer (Phase 1)

Authentication: Implements user creation, login logic, and session handling. Depends on [Database] (to read/write user records).

Application Layer (Phase 2)

Admin Panel: Implements the UI for managing inventory and viewing reports. Depends on [Authentication] (for RBAC) and [Database] (to perform CRUD operations).

Kiosk App: Implements the user-facing UI for renting ramen. Depends on [Authentication] (to know who is renting) and [Database] (to list ramens and execute rentals).

# Implementation Roadmap

Development Phases
Phase 0: Database & Project Foundation

Goal: Establish the data schema and core project setup.
Entry Criteria: Empty Next.js project repository.
Tasks:

Setup Drizzle ORM with SQLite.

Define users, ramens, and rentalRecords table schemas in lib/db/schema.ts.

Configure TailwindCSS and initialize shadcn/ui.
Exit Criteria: The database schema is finalized and can be migrated. Project can be run locally.
Delivers: A solid data foundation for all subsequent features.

Phase 1: User Authentication System

Goal: Implement a fully functional registration and login system.
Entry Criteria: Phase 0 complete.
Tasks:

Create login (/login) and registration (/register) UI pages using React Hook Form and Zod. (Depends on: [Foundation])

Implement register and login Server Actions, including password hashing. (Depends on: [Foundation])

Implement session management (e.g., using Next-Auth or JWT cookies). (Depends on: [Foundation])
Exit Criteria: Users can create an account, log in, and their session is persisted.
Delivers: A secure way for users to access the system.

Phase 2: Core Admin Panel

Goal: Empower administrators to manage the ramen inventory.
Entry Criteria: Phase 1 complete.

Tasks:

Implement RBAC to protect /admin routes. (Depends on: [Authentication])

Create the UI for listing, adding, editing, and deleting ramens (/admin/stock). (Depends on: [Authentication, Database])

Connect the UI to the backend via Server Actions or API routes to perform CRUD operations. (Depends on: [Database])
Exit Criteria: An administrator can log in and fully manage the ramen catalog and stock.
Delivers: A functional backend management tool.

Phase 3: Kiosk Rental Experience

Goal: Build the primary user-facing feature: renting ramen.
Entry Criteria: Phase 1 & 2 complete.

Tasks:

Create the main Kiosk UI to display available ramens. (Depends on: [Database])

Implement the rental confirmation dialog and the executeRental Server Action. (Depends on: [Authentication, Database])

Add user feedback (toasts) for successful or failed rentals.
Exit Criteria: A logged-in user can view and successfully rent a ramen, and the stock is correctly updated.
Delivers: The Minimum Viable Product (MVP) for end-users.

Phase 4: Reporting, Deployment & Polish

Goal: Finalize reporting features and prepare the application for deployment.
Entry Criteria: Phase 3 complete.

Tasks:

Build the admin page for viewing rental history (/admin/records). (Depends on: [Database])

Write Dockerfile and docker-compose.yml for easy deployment.

Configure PWA manifest for "Add to Home Screen" functionality.

Conduct end-to-end testing of all user flows.
Exit Criteria: The application is running successfully inside a Docker container.
Delivers: A complete, deployable, and polished product.

Phase 5: Additional Features

Goal: Implement additional features requested by the client.
Entry Criteria: Phase 4 complete.

Tasks:

Update the database schema to include the new user fields. (Depends on: [Foundation])

Update the rental process to include the new fields and remove the PIN number. (Depends on: [Authentication, Database])

Add a confirmation message after a rental is completed. (Depends on: [Kiosk App])

Implement the Excel export functionality. (Depends on: [Admin Panel])

Enhance the dashboard with daily, weekly, and monthly tabs and new data visualizations. (Depends on: [Admin Panel])
Exit Criteria: All additional features are implemented and tested.
Delivers: A more feature-rich and user-friendly application.

# Test Strategy
<instruction>
...
</instruction>

# Architecture
<instruction>
...
</instruction>
# Risks
<instruction>
...
</instruction>
# Appendix
<instruction>
...
</instruction>

# How Task Master Uses This PRD
...
