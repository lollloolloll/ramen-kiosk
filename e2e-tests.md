# End-to-End Test Scenarios

## User Roles
-   **User**: Regular user who can rent ramen.
-   **Admin**: User with administrative privileges to manage stock.

## Test Scenarios

### 1. User Registration and Login
-   **1.1**: A new user can register for an account.
-   **1.2**: A registered user can log in.
-   **1.3**: An unregistered user cannot log in.
-   **1.4**: A user cannot register with a username that is already taken.

### 2. Kiosk and Ramen Rental
-   **2.1**: A logged-in user can see the list of available ramens on the kiosk page.
-   **2.2**: A user can rent a ramen that is in stock.
-   **2.3**: After renting, the stock of the ramen is decreased by 1.
-   **2.4**: A user cannot rent a ramen that is out of stock.
-   **2.5**: The rental is recorded in the rental records.

### 3. Admin Stock Management
-   **3.1**: An admin user can access the `/admin/stock` page.
-   **3.2**: A non-admin user is redirected from the `/admin/stock` page.
-   **3.3**: An admin can add a new ramen.
-   **3.4**: An admin can edit an existing ramen's details.
-   **3.5**: An admin can delete a ramen.

### 4. Admin Rental Records
-   **4.1**: An admin can view all rental records at `/admin/records`.
-   **4.2**: An admin can filter rental records by username.
-   **4.3**: An admin can filter rental records by date range.
