# Requirements Document: Delete Last Week Transactions

## Introduction

This document specifies the requirements for a feature that allows users to delete all transactions from the most recent week (Monday-Sunday) in the Aquarius Golf Competition Transaction Summary view. Users sometimes upload CSV files containing partial or incorrect data for the last week and need a way to remove these transactions without affecting earlier weeks. The feature provides a safe deletion mechanism with confirmation and automatic UI refresh.

## Glossary

- **Transaction_Summary_View**: The UI component that displays weekly summaries of golf competition transactions
- **Delete_Last_Week_Button**: A UI button that initiates the deletion of the most recent week's transactions
- **Last_Week**: The most recent Monday-Sunday week that contains at least one transaction in the database
- **Week_Range**: A date range starting on Monday at 00:00:00 and ending on Sunday at 23:59:59
- **Confirmation_Dialog**: A UI dialog that displays deletion details and requires user confirmation before proceeding
- **Transaction_Service**: The backend service responsible for transaction business logic
- **API_Client**: The frontend service that communicates with backend REST API endpoints
- **Database_Service**: The backend service that executes database queries

## Requirements

### Requirement 1: Display Delete Button

**User Story:** As a user, I want to see a "Delete Last Week" button in the transaction summary view, so that I can easily access the deletion functionality.

#### Acceptance Criteria

1. WHEN the Transaction_Summary_View is rendered, THE System SHALL display a Delete_Last_Week_Button
2. THE Delete_Last_Week_Button SHALL be positioned at the top of the Transaction_Summary_View
3. THE Delete_Last_Week_Button SHALL have clear, descriptive text "Delete Last Week"

### Requirement 2: Button State Management

**User Story:** As a user, I want the delete button to be disabled when there are no transactions, so that I don't attempt invalid operations.

#### Acceptance Criteria

1. WHEN no transactions exist in the database, THE System SHALL disable the Delete_Last_Week_Button
2. WHEN at least one transaction exists in the database, THE System SHALL enable the Delete_Last_Week_Button
3. WHEN a deletion operation is in progress, THE System SHALL disable the Delete_Last_Week_Button

### Requirement 3: Calculate Last Week Range

**User Story:** As a developer, I want the system to correctly identify the last week's date range, so that only the intended transactions are deleted.

#### Acceptance Criteria

1. WHEN calculating the Last_Week, THE Transaction_Service SHALL find the most recent transaction date in the database
2. WHEN a transaction date is found, THE Transaction_Service SHALL calculate the Monday of that week as the start date
3. WHEN a transaction date is found, THE Transaction_Service SHALL calculate the Sunday of that week as the end date
4. THE System SHALL ensure the start date is always a Monday (day of week = 1)
5. THE System SHALL ensure the end date is always a Sunday (day of week = 0)
6. THE System SHALL ensure the end date is exactly 6 days after the start date

### Requirement 4: Retrieve Week Information

**User Story:** As a user, I want to see details about the week being deleted, so that I can make an informed decision before confirming.

#### Acceptance Criteria

1. WHEN the Delete_Last_Week_Button is clicked, THE API_Client SHALL request last week information from the backend
2. WHEN last week information is requested, THE Transaction_Service SHALL return the start date, end date, and transaction count
3. WHEN no transactions exist, THE Transaction_Service SHALL return null for the week information
4. THE System SHALL count all transactions within the Week_Range (inclusive of start and end dates)

### Requirement 5: Display Confirmation Dialog

**User Story:** As a user, I want to confirm the deletion before it happens, so that I don't accidentally delete important data.

#### Acceptance Criteria

1. WHEN week information is retrieved successfully, THE System SHALL display a Confirmation_Dialog
2. THE Confirmation_Dialog SHALL show the start date of the Last_Week
3. THE Confirmation_Dialog SHALL show the end date of the Last_Week
4. THE Confirmation_Dialog SHALL show the count of transactions to be deleted
5. THE Confirmation_Dialog SHALL display a warning that the action cannot be undone
6. THE Confirmation_Dialog SHALL provide options to confirm or cancel the deletion

### Requirement 6: Handle User Cancellation

**User Story:** As a user, I want to cancel the deletion if I change my mind, so that no changes are made to my data.

#### Acceptance Criteria

1. WHEN the user cancels the Confirmation_Dialog, THE System SHALL not make any API calls to delete transactions
2. WHEN the user cancels the Confirmation_Dialog, THE System SHALL not modify any transactions in the database
3. WHEN the user cancels the Confirmation_Dialog, THE System SHALL re-enable the Delete_Last_Week_Button

### Requirement 7: Delete Transactions

**User Story:** As a user, I want to delete all transactions from the last week, so that I can remove incorrect or partial data.

#### Acceptance Criteria

1. WHEN the user confirms deletion, THE API_Client SHALL send a delete request to the backend
2. WHEN a delete request is received, THE Transaction_Service SHALL delete all transactions within the Last_Week date range
3. THE Transaction_Service SHALL use a database transaction to ensure atomic deletion
4. THE Transaction_Service SHALL return the count of deleted transactions
5. IF the deletion fails, THEN THE Transaction_Service SHALL roll back the database transaction

### Requirement 8: Deletion Isolation

**User Story:** As a user, I want only the last week's transactions deleted, so that my earlier data remains intact.

#### Acceptance Criteria

1. WHEN transactions are deleted, THE System SHALL only delete transactions with dates within the Last_Week range
2. WHEN transactions are deleted, THE System SHALL preserve all transactions with dates before the Last_Week start date
3. WHEN transactions are deleted, THE System SHALL preserve all transactions with dates after the Last_Week end date

### Requirement 9: Display Success Feedback

**User Story:** As a user, I want to see confirmation that the deletion succeeded, so that I know the operation completed.

#### Acceptance Criteria

1. WHEN deletion completes successfully, THE System SHALL display a success message to the user
2. THE success message SHALL include the count of deleted transactions
3. THE System SHALL re-enable the Delete_Last_Week_Button after displaying the success message

### Requirement 10: Refresh Summary View

**User Story:** As a user, I want the summary view to update automatically after deletion, so that I see the current state of my data.

#### Acceptance Criteria

1. WHEN deletion completes successfully, THE Transaction_Summary_View SHALL fetch all remaining transactions from the backend
2. WHEN remaining transactions are fetched, THE Transaction_Summary_View SHALL regenerate weekly summaries
3. WHEN weekly summaries are regenerated, THE Transaction_Summary_View SHALL re-render the summary table
4. THE System SHALL complete the refresh within 2 seconds of deletion completion

### Requirement 11: Handle Empty Database

**User Story:** As a user, I want appropriate feedback when there are no transactions to delete, so that I understand why the operation cannot proceed.

#### Acceptance Criteria

1. WHEN the Delete_Last_Week_Button is clicked and no transactions exist, THE System SHALL display a message "No transactions to delete"
2. WHEN no transactions exist, THE System SHALL not make a delete API call
3. WHEN no transactions exist, THE System SHALL not modify the database

### Requirement 12: Handle Database Errors

**User Story:** As a user, I want to see clear error messages when something goes wrong, so that I can understand what happened and potentially retry.

#### Acceptance Criteria

1. IF a database connection failure occurs, THEN THE System SHALL display an error message "Unable to connect to database"
2. IF a deletion operation fails, THEN THE System SHALL roll back any partial changes
3. IF an error occurs, THEN THE System SHALL re-enable the Delete_Last_Week_Button
4. THE System SHALL log all errors with sufficient detail for debugging

### Requirement 13: API Endpoint for Week Information

**User Story:** As a developer, I want a REST API endpoint to retrieve last week information, so that the frontend can display it to users.

#### Acceptance Criteria

1. THE System SHALL provide a GET endpoint at /api/transactions/last-week-info
2. WHEN the endpoint is called with no transactions in the database, THE System SHALL return HTTP status 404
3. WHEN the endpoint is called with transactions in the database, THE System SHALL return HTTP status 200 with week information
4. THE week information response SHALL include startDate, endDate, and count fields

### Requirement 14: API Endpoint for Deletion

**User Story:** As a developer, I want a REST API endpoint to delete last week's transactions, so that the frontend can trigger the deletion.

#### Acceptance Criteria

1. THE System SHALL provide a DELETE endpoint at /api/transactions/last-week
2. WHEN the endpoint is called with no transactions in the database, THE System SHALL return HTTP status 404
3. WHEN the endpoint is called with transactions in the database, THE System SHALL return HTTP status 200 with deletion results
4. THE deletion response SHALL include the count of deleted transactions and a success message
5. IF an error occurs during deletion, THEN THE System SHALL return HTTP status 500 with an error message

### Requirement 15: Date Calculation Functions

**User Story:** As a developer, I want reliable date calculation functions, so that week boundaries are always correct.

#### Acceptance Criteria

1. THE System SHALL provide a getMondayOfWeek function that accepts any date and returns the Monday of that week
2. THE System SHALL provide a getSundayOfWeek function that accepts any date and returns the Sunday of that week
3. WHEN getMondayOfWeek is called, THE System SHALL set the time to 00:00:00.000
4. WHEN getSundayOfWeek is called, THE System SHALL set the time to 23:59:59.999
5. THE System SHALL follow ISO 8601 standard where weeks start on Monday

### Requirement 16: SQL Injection Prevention

**User Story:** As a security-conscious developer, I want all database queries to be safe from SQL injection, so that the system is secure.

#### Acceptance Criteria

1. THE Database_Service SHALL use parameterized queries for all date range queries
2. THE Database_Service SHALL use parameterized queries for all deletion operations
3. THE System SHALL not concatenate user input directly into SQL strings

### Requirement 17: Performance Requirements

**User Story:** As a user, I want the deletion operation to complete quickly, so that I can continue working without long delays.

#### Acceptance Criteria

1. THE Transaction_Service SHALL retrieve last week information in less than 100 milliseconds for databases with up to 100,000 transactions
2. THE Transaction_Service SHALL complete deletion in less than 500 milliseconds for up to 1,000 transactions
3. THE Transaction_Summary_View SHALL complete the refresh in less than 1 second after deletion
4. THE Database_Service SHALL use indexed date columns for range queries
