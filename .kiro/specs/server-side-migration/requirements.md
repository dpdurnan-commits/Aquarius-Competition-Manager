# Requirements Document

## Introduction

This document specifies the requirements for migrating the competition-account-management application from a client-side IndexedDB architecture to a server-side architecture with a centralized PostgreSQL database. The migration enables multi-user access, centralized data persistence, and cloud deployment while preserving all existing functionality including CSV import, transaction management, competition management, weekly financial summaries, transaction flagging, and competition association.

## Glossary

- **API_Server**: The Node.js + Express + TypeScript backend server that handles HTTP requests and database operations
- **Database_Service**: The component responsible for PostgreSQL database operations and connection management
- **REST_API**: The HTTP endpoints that expose data operations to the frontend
- **Frontend_Client**: The existing vanilla JavaScript browser application that will be modified to use REST API calls instead of IndexedDB
- **Migration_Service**: The component that handles data migration from IndexedDB export to PostgreSQL import
- **Authentication_Service**: The component that manages user authentication and session management for multi-user access
- **Transaction_Record**: A database record containing golf competition transaction data with fields: date, time, till, type, member, player, competition, price, discount, subtotal, vat, total, sourceRowIndex, isComplete
- **Competition_Record**: A database record containing competition metadata: name, date, description, prize structure
- **Flagged_Transaction**: A transaction marked as a prize winning that should be associated with a competition
- **Weekly_Summary**: A calculated view of financial data grouped by Monday-Sunday periods showing Competition Purse and Competition Pot balances
- **Concurrent_User**: Multiple users accessing the system simultaneously from different browsers or machines

## Requirements

### Requirement 1: PostgreSQL Database Schema

**User Story:** As a system administrator, I want a PostgreSQL database schema that mirrors the existing IndexedDB structure, so that all current data and relationships are preserved.

#### Acceptance Criteria

1. THE Database_Service SHALL create a "transactions" table with columns: id (serial primary key), date, time, till, type, member, player, competition, price, discount, subtotal, vat, total, source_row_index, is_complete, created_at, updated_at
2. THE Database_Service SHALL create a "competitions" table with columns: id (serial primary key), name, date, description, prize_structure, created_at, updated_at
3. THE Database_Service SHALL create a "flagged_transactions" table with columns: id (serial primary key), transaction_id (foreign key), competition_id (foreign key nullable), flagged_at, created_at, updated_at
4. THE Database_Service SHALL create appropriate indexes on date, time, and type columns for query performance
5. THE Database_Service SHALL enforce foreign key constraints to maintain referential integrity

### Requirement 2: REST API Endpoints for Transactions

**User Story:** As a frontend developer, I want REST API endpoints for transaction operations, so that I can replace IndexedDB calls with HTTP requests.

#### Acceptance Criteria

1. THE REST_API SHALL provide POST /api/transactions/import endpoint that accepts an array of transaction records and stores them in the database
2. THE REST_API SHALL provide GET /api/transactions endpoint that returns all transactions ordered by date and time
3. THE REST_API SHALL provide GET /api/transactions?startDate=X&endDate=Y endpoint that returns transactions within the specified date range
4. THE REST_API SHALL provide DELETE /api/transactions endpoint that removes all transaction records
5. THE REST_API SHALL provide GET /api/transactions/latest endpoint that returns the latest transaction timestamp for chronological validation
6. WHEN any transaction endpoint encounters an error, THE REST_API SHALL return appropriate HTTP status codes (400 for validation errors, 500 for server errors) with descriptive error messages

### Requirement 3: REST API Endpoints for Competitions

**User Story:** As a frontend developer, I want REST API endpoints for competition management, so that users can create, edit, and delete competitions.

#### Acceptance Criteria

1. THE REST_API SHALL provide POST /api/competitions endpoint that creates a new competition record
2. THE REST_API SHALL provide GET /api/competitions endpoint that returns all competitions ordered by date
3. THE REST_API SHALL provide PUT /api/competitions/:id endpoint that updates an existing competition
4. THE REST_API SHALL provide DELETE /api/competitions/:id endpoint that removes a competition
5. WHEN deleting a competition, THE REST_API SHALL also remove all flagged_transaction associations for that competition

### Requirement 4: REST API Endpoints for Transaction Flagging

**User Story:** As a user, I want REST API endpoints for flagging transactions as prize winnings, so that I can mark and associate transactions with competitions.

#### Acceptance Criteria

1. THE REST_API SHALL provide POST /api/flagged-transactions endpoint that accepts a transaction_id and creates a flagged transaction record
2. THE REST_API SHALL provide GET /api/flagged-transactions endpoint that returns all flagged transactions with their associated transaction details
3. THE REST_API SHALL provide PUT /api/flagged-transactions/:id endpoint that associates a flagged transaction with a competition_id
4. THE REST_API SHALL provide DELETE /api/flagged-transactions/:id endpoint that removes a flagged transaction record
5. WHEN flagging a transaction that is already flagged, THE REST_API SHALL return an error indicating the transaction is already flagged

### Requirement 5: REST API Endpoints for Weekly Summaries

**User Story:** As a user, I want REST API endpoints for weekly financial summaries, so that the frontend can display calculated weekly balances.

#### Acceptance Criteria

1. THE REST_API SHALL provide GET /api/summaries/weekly endpoint that calculates and returns weekly summaries for all transactions in the database
2. THE REST_API SHALL provide GET /api/summaries/weekly?startDate=X&endDate=Y endpoint that returns weekly summaries for the specified date range
3. WHEN calculating weekly summaries, THE API_Server SHALL apply the same calculation logic as the existing client-side Weekly_Summarizer
4. WHEN no transactions exist, THE REST_API SHALL return an empty array for weekly summaries

### Requirement 6: Frontend API Client

**User Story:** As a frontend developer, I want an API client module that replaces IndexedDB calls, so that I can migrate the frontend with minimal code changes.

#### Acceptance Criteria

1. THE Frontend_Client SHALL create an API client module that provides the same interface as the existing Database_Manager
2. WHEN the API client stores records, THE Frontend_Client SHALL send POST requests to /api/transactions/import
3. WHEN the API client retrieves records, THE Frontend_Client SHALL send GET requests to /api/transactions
4. WHEN the API client queries by date range, THE Frontend_Client SHALL send GET requests with startDate and endDate query parameters
5. WHEN the API client clears all data, THE Frontend_Client SHALL send DELETE requests to /api/transactions
6. THE Frontend_Client SHALL handle network errors gracefully and display appropriate error messages to users

### Requirement 7: Data Migration Support

**User Story:** As a system administrator, I want to migrate existing IndexedDB data to PostgreSQL, so that historical data is preserved during the transition.

#### Acceptance Criteria

1. THE Migration_Service SHALL provide a function to export all IndexedDB records to JSON format
2. THE Migration_Service SHALL provide a function to import JSON records into PostgreSQL via the REST API
3. WHEN migrating data, THE Migration_Service SHALL preserve all field values and data types
4. WHEN migration encounters errors, THE Migration_Service SHALL log failed records and continue processing remaining records
5. THE Migration_Service SHALL validate that the number of records in PostgreSQL matches the number exported from IndexedDB

### Requirement 8: Multi-User Authentication

**User Story:** As a system administrator, I want user authentication for the application, so that only authorized users can access and modify competition data.

#### Acceptance Criteria

1. THE Authentication_Service SHALL provide user registration with email and password
2. THE Authentication_Service SHALL provide user login that returns a session token
3. THE Authentication_Service SHALL validate session tokens on all protected API endpoints
4. WHEN an unauthenticated request is made to a protected endpoint, THE REST_API SHALL return HTTP 401 Unauthorized
5. THE Authentication_Service SHALL provide user logout that invalidates the session token
6. THE Frontend_Client SHALL store session tokens securely and include them in all API requests

### Requirement 9: Concurrent User Support

**User Story:** As a user, I want to work with competition data while other users are also accessing the system, so that multiple staff members can collaborate.

#### Acceptance Criteria

1. WHEN multiple users query transaction data simultaneously, THE API_Server SHALL return consistent results to all users
2. WHEN multiple users import CSV files concurrently, THE API_Server SHALL process each import sequentially to maintain chronological integrity
3. WHEN one user modifies competition data, THE API_Server SHALL ensure other users see the updated data on their next request
4. THE Database_Service SHALL use database transactions to prevent race conditions during concurrent writes
5. WHERE real-time updates are enabled, THE API_Server SHALL broadcast data changes to connected clients via WebSocket

### Requirement 10: Data Backup and Export

**User Story:** As a system administrator, I want to export and backup all competition data, so that data is recoverable in case of system failure.

#### Acceptance Criteria

1. THE REST_API SHALL provide GET /api/export/transactions endpoint that returns all transactions in JSON format
2. THE REST_API SHALL provide GET /api/export/competitions endpoint that returns all competitions in JSON format
3. THE REST_API SHALL provide GET /api/export/all endpoint that returns a complete database export including transactions, competitions, and flagged transactions
4. WHEN exporting data, THE REST_API SHALL include metadata such as export timestamp and record counts
5. THE REST_API SHALL provide POST /api/import/backup endpoint that restores data from a previously exported backup file

### Requirement 11: Environment Configuration

**User Story:** As a developer, I want environment-based configuration, so that the application can run in development, staging, and production environments.

#### Acceptance Criteria

1. THE API_Server SHALL read database connection parameters from environment variables (DATABASE_URL or individual host, port, database, user, password variables)
2. THE API_Server SHALL read server port from environment variable (PORT) with a default fallback
3. THE API_Server SHALL read authentication secret key from environment variable (JWT_SECRET)
4. THE API_Server SHALL read CORS allowed origins from environment variable (CORS_ORIGINS)
5. WHERE environment variables are missing, THE API_Server SHALL use secure defaults for development and fail explicitly in production

### Requirement 12: Error Handling and Logging

**User Story:** As a developer, I want comprehensive error handling and logging, so that I can diagnose and fix issues in production.

#### Acceptance Criteria

1. WHEN database connection fails, THE API_Server SHALL log the error and return HTTP 503 Service Unavailable
2. WHEN validation errors occur, THE REST_API SHALL return HTTP 400 Bad Request with detailed validation error messages
3. WHEN unhandled exceptions occur, THE API_Server SHALL log the full error stack and return HTTP 500 Internal Server Error with a generic message
4. THE API_Server SHALL log all incoming requests with timestamp, method, path, and response status
5. THE API_Server SHALL log all database queries for debugging and performance monitoring

### Requirement 13: Database Connection Management

**User Story:** As a system administrator, I want reliable database connection management, so that the application handles connection failures gracefully.

#### Acceptance Criteria

1. THE Database_Service SHALL use connection pooling to manage PostgreSQL connections efficiently
2. WHEN a database query fails due to connection loss, THE Database_Service SHALL attempt to reconnect automatically
3. WHEN connection pool is exhausted, THE Database_Service SHALL queue requests and process them when connections become available
4. THE Database_Service SHALL close all connections gracefully during application shutdown
5. THE Database_Service SHALL validate database connectivity on application startup and fail fast if database is unreachable

### Requirement 14: API Request Validation

**User Story:** As a backend developer, I want request validation for all API endpoints, so that invalid data is rejected before reaching the database.

#### Acceptance Criteria

1. WHEN POST /api/transactions/import receives data, THE REST_API SHALL validate that all required fields (date, time, type, total) are present
2. WHEN POST /api/competitions receives data, THE REST_API SHALL validate that name and date fields are present and properly formatted
3. WHEN date parameters are provided in query strings, THE REST_API SHALL validate they are in ISO 8601 format (YYYY-MM-DD)
4. WHEN numeric fields are provided, THE REST_API SHALL validate they are valid numbers
5. WHEN validation fails, THE REST_API SHALL return HTTP 400 with a JSON response containing all validation errors

### Requirement 15: Chronological Validation Preservation

**User Story:** As a user, I want the same chronological validation rules enforced on the server, so that data integrity is maintained in the multi-user environment.

#### Acceptance Criteria

1. WHEN importing transactions via POST /api/transactions/import, THE API_Server SHALL validate that the earliest new transaction is not before the latest existing transaction
2. WHEN chronological validation fails, THE REST_API SHALL return HTTP 409 Conflict with error details including both timestamps
3. WHEN the database is empty, THE API_Server SHALL allow any transaction import regardless of dates
4. THE API_Server SHALL perform chronological validation atomically within a database transaction to prevent race conditions

### Requirement 16: CSV Import Endpoint

**User Story:** As a user, I want to upload CSV files directly to the server, so that the server can handle parsing, transformation, and storage.

#### Acceptance Criteria

1. THE REST_API SHALL provide POST /api/import/csv endpoint that accepts multipart/form-data file uploads
2. WHEN a CSV file is uploaded, THE API_Server SHALL parse, transform, extract fields, validate chronology, and store records
3. WHEN CSV import succeeds, THE REST_API SHALL return HTTP 201 Created with a summary of imported records
4. WHEN CSV import fails validation, THE REST_API SHALL return HTTP 400 or 409 with detailed error information
5. THE API_Server SHALL limit CSV file uploads to a reasonable size (e.g., 10MB) to prevent resource exhaustion

### Requirement 17: Frontend Backward Compatibility

**User Story:** As a user, I want the UI and user experience to remain unchanged, so that I can continue using familiar workflows.

#### Acceptance Criteria

1. THE Frontend_Client SHALL preserve all existing UI components and layouts
2. THE Frontend_Client SHALL maintain the same user interaction patterns for CSV import, viewing transactions, and viewing weekly summaries
3. THE Frontend_Client SHALL preserve the existing Data_Viewer functionality for viewing individual transformed records
4. THE Frontend_Client SHALL preserve the existing CSV export functionality
5. THE Frontend_Client SHALL maintain the database reset functionality via API call

### Requirement 18: Cloud Deployment Readiness

**User Story:** As a system administrator, I want the application to be deployable to cloud platforms, so that it can run in production environments.

#### Acceptance Criteria

1. THE API_Server SHALL support deployment to Railway, Heroku, AWS, or similar platforms
2. THE API_Server SHALL read all configuration from environment variables (no hardcoded values)
3. THE API_Server SHALL serve static frontend files from a public directory
4. THE API_Server SHALL support HTTPS connections in production
5. THE Database_Service SHALL support PostgreSQL connection strings in the format used by cloud database providers

### Requirement 19: API Response Format Consistency

**User Story:** As a frontend developer, I want consistent API response formats, so that error handling and data parsing are predictable.

#### Acceptance Criteria

1. THE REST_API SHALL return all successful responses with HTTP 2xx status codes and JSON body containing data or success message
2. THE REST_API SHALL return all error responses with appropriate HTTP status codes and JSON body containing error message and optional details
3. THE REST_API SHALL use consistent field naming conventions (camelCase) in all JSON responses
4. THE REST_API SHALL include appropriate Content-Type headers (application/json) in all responses
5. THE REST_API SHALL support CORS headers to allow frontend requests from different origins during development

### Requirement 20: Database Migration Scripts

**User Story:** As a developer, I want database migration scripts, so that schema changes can be applied consistently across environments.

#### Acceptance Criteria

1. THE Database_Service SHALL provide SQL migration scripts for creating initial schema
2. THE Database_Service SHALL provide SQL migration scripts for creating indexes
3. THE Database_Service SHALL provide SQL migration scripts for creating foreign key constraints
4. THE Migration_Service SHALL track which migrations have been applied to prevent duplicate execution
5. THE API_Server SHALL run pending migrations automatically on startup in development mode

### Requirement 21: Testing Infrastructure Migration

**User Story:** As a developer, I want to migrate existing property-based tests to work with the new server-side architecture, so that test coverage is maintained.

#### Acceptance Criteria

1. THE API_Server SHALL support a test database configuration separate from development and production
2. WHEN running backend tests, THE Database_Service SHALL use the test database and reset it between test runs
3. THE Frontend_Client SHALL support API mocking for frontend tests without requiring a running server
4. THE test suite SHALL preserve all existing property-based tests by adapting them to use API calls
5. THE test suite SHALL include new integration tests that verify end-to-end API workflows

### Requirement 22: Performance and Scalability

**User Story:** As a system administrator, I want the application to handle reasonable data volumes efficiently, so that users experience fast response times.

#### Acceptance Criteria

1. WHEN querying all transactions, THE REST_API SHALL return results within 2 seconds for databases containing up to 10,000 transactions
2. WHEN importing CSV files, THE API_Server SHALL process and store up to 1,000 transactions within 5 seconds
3. WHEN calculating weekly summaries, THE API_Server SHALL complete calculations within 3 seconds for up to 52 weeks of data
4. THE Database_Service SHALL use connection pooling with appropriate pool size limits (minimum 2, maximum 10 connections)
5. THE REST_API SHALL implement pagination for transaction queries when result sets exceed 1,000 records

### Requirement 23: Data Integrity and Transactions

**User Story:** As a user, I want data operations to be atomic, so that partial failures don't corrupt the database.

#### Acceptance Criteria

1. WHEN importing multiple transactions, THE Database_Service SHALL use database transactions to ensure all-or-nothing storage
2. WHEN chronological validation fails during import, THE Database_Service SHALL rollback any partial changes
3. WHEN deleting a competition with associated flagged transactions, THE Database_Service SHALL delete both the competition and associations in a single transaction
4. WHEN database transaction fails, THE REST_API SHALL return an error and leave the database in its previous consistent state
5. THE Database_Service SHALL use appropriate transaction isolation levels to prevent dirty reads and phantom reads

### Requirement 24: Health Check and Monitoring

**User Story:** As a system administrator, I want health check endpoints, so that I can monitor application and database status.

#### Acceptance Criteria

1. THE REST_API SHALL provide GET /health endpoint that returns HTTP 200 when the application is running
2. THE REST_API SHALL provide GET /health/db endpoint that checks database connectivity and returns HTTP 200 if connected, HTTP 503 if not
3. THE REST_API SHALL provide GET /health/ready endpoint that returns HTTP 200 only when both application and database are ready
4. WHEN health check endpoints are called, THE API_Server SHALL not require authentication
5. THE REST_API SHALL include version information in health check responses

### Requirement 25: Security Best Practices

**User Story:** As a security-conscious developer, I want the application to follow security best practices, so that user data is protected.

#### Acceptance Criteria

1. THE Authentication_Service SHALL hash passwords using bcrypt with appropriate salt rounds (minimum 10)
2. THE Authentication_Service SHALL use JWT tokens with expiration times (maximum 24 hours)
3. THE API_Server SHALL sanitize all user inputs to prevent SQL injection attacks
4. THE API_Server SHALL use parameterized queries for all database operations
5. THE API_Server SHALL set security headers (helmet middleware) including Content-Security-Policy, X-Frame-Options, X-Content-Type-Options
6. THE API_Server SHALL rate-limit authentication endpoints to prevent brute force attacks

### Requirement 26: Development and Production Modes

**User Story:** As a developer, I want different behaviors for development and production, so that I have debugging tools in development and security in production.

#### Acceptance Criteria

1. WHEN running in development mode, THE API_Server SHALL enable detailed error messages with stack traces
2. WHEN running in production mode, THE API_Server SHALL return generic error messages without exposing internal details
3. WHEN running in development mode, THE API_Server SHALL enable CORS for all origins
4. WHEN running in production mode, THE API_Server SHALL restrict CORS to configured allowed origins
5. WHEN running in development mode, THE API_Server SHALL enable request logging with full request/response bodies

### Requirement 27: Graceful Shutdown

**User Story:** As a system administrator, I want the application to shut down gracefully, so that in-flight requests complete and connections close properly.

#### Acceptance Criteria

1. WHEN the API_Server receives a shutdown signal (SIGTERM or SIGINT), THE API_Server SHALL stop accepting new requests
2. WHEN shutting down, THE API_Server SHALL wait for in-flight requests to complete (with a timeout of 30 seconds)
3. WHEN shutting down, THE Database_Service SHALL close all database connections
4. WHEN shutdown timeout is reached, THE API_Server SHALL force-close remaining connections and exit
5. THE API_Server SHALL log shutdown events for monitoring and debugging

### Requirement 28: API Documentation

**User Story:** As a frontend developer, I want API documentation, so that I understand how to use all endpoints correctly.

#### Acceptance Criteria

1. THE API_Server SHALL provide OpenAPI/Swagger documentation for all endpoints
2. THE API documentation SHALL include request/response schemas for all endpoints
3. THE API documentation SHALL include example requests and responses
4. THE API documentation SHALL be accessible via GET /api/docs endpoint
5. THE API documentation SHALL include authentication requirements for each endpoint

### Requirement 29: CSV Parsing and Transformation Server-Side

**User Story:** As a user, I want CSV parsing to happen on the server, so that the frontend doesn't need to handle large file processing.

#### Acceptance Criteria

1. WHEN a CSV file is uploaded, THE API_Server SHALL parse the CSV using the same parsing logic as the existing client-side parser
2. WHEN parsing completes, THE API_Server SHALL apply the same record transformation logic as the existing Record_Transformer
3. WHEN transformation completes, THE API_Server SHALL apply field extraction using the same logic as the existing Field_Extractor
4. THE API_Server SHALL preserve the existing CSV format expectations and column mappings
5. WHEN CSV parsing fails, THE REST_API SHALL return HTTP 400 with details about which row or column caused the failure

### Requirement 30: Preserve Existing Business Logic

**User Story:** As a user, I want all existing calculations and business rules to work identically, so that financial summaries remain accurate and consistent.

#### Acceptance Criteria

1. THE API_Server SHALL implement weekly period grouping using the same Monday 00:00:00 to Sunday 23:59:59 definition
2. THE API_Server SHALL calculate Competition Purse balances using the same formulas as the existing Weekly_Summarizer
3. THE API_Server SHALL calculate Competition Pot balances using the same formulas as the existing Weekly_Summarizer
4. THE API_Server SHALL handle refund values as negative numbers in the same way as the existing system
5. THE API_Server SHALL generate weekly summaries for all periods including weeks with zero transactions
