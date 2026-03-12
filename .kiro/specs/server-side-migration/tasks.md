# Implementation Plan: Server-Side Migration

## Overview

This plan migrates the competition-account-management application from client-side IndexedDB to a server-side architecture with PostgreSQL and Node.js + Express + TypeScript backend. The implementation follows an incremental approach: set up infrastructure, implement backend services, migrate frontend to use REST API, add authentication, and provide migration tooling. Each step builds on previous work and includes validation through tests.

## Tasks

- [x] 1. Set up project structure and database infrastructure
  - Create backend directory structure (src/server, src/services, src/routes, src/middleware, src/types)
  - Initialize TypeScript configuration for backend
  - Set up PostgreSQL database schema with migrations
  - Create .env.example file with required environment variables
  - Set up database connection pooling service
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 11.1, 11.2, 11.3, 11.4, 11.5, 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 2. Implement Database Service
  - [x] 2.1 Create DatabaseService class with connection management
    - Implement connect(), disconnect(), query(), and transaction() methods
    - Configure connection pooling with min 2, max 10 connections
    - Add connection validation on startup
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [x] 2.2 Create database migration system
    - Implement migration runner that tracks applied migrations
    - Create initial schema migration (transactions, competitions, flagged_transactions tables)
    - Create indexes migration for date, time, and type columns
    - Add automatic migration execution on startup in development mode
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 20.1, 20.2, 20.3, 20.4, 20.5_
  
  - [x] 2.3 Write unit tests for DatabaseService
    - Test connection pooling behavior
    - Test transaction rollback on errors
    - Test migration tracking
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 23.1, 23.2, 23.3, 23.4, 23.5_

- [x] 3. Implement Transaction Service
  - [x] 3.1 Create TransactionService with field extraction logic
    - Migrate extractFields() function from frontend to backend
    - Implement member/player/competition parsing logic
    - Create TypeScript interfaces for TransactionRecord and ImportResult
    - _Requirements: 2.1, 29.1, 29.2, 29.3, 29.4, 30.1, 30.2, 30.3, 30.4, 30.5_
  
  - [x] 3.2 Implement chronological validation
    - Migrate chronological validation logic from frontend
    - Implement getLatestTimestamp() query
    - Add validation that prevents importing transactions before latest existing
    - _Requirements: 15.1, 15.2, 15.3, 15.4_
  
  - [x] 3.3 Implement transaction import with atomic operations
    - Create importTransactions() method using database transactions
    - Ensure all-or-nothing import behavior
    - Handle validation errors and rollback on failure
    - _Requirements: 2.1, 23.1, 23.2, 23.4, 23.5_
  
  - [x] 3.4 Implement transaction query methods
    - Create getAllTransactions() method
    - Create getTransactionsByDateRange() method with date filtering
    - Create deleteAllTransactions() method
    - _Requirements: 2.2, 2.3, 2.4_
  
  - [x] 3.5 Write property test for field extraction
    - **Property 1: Field extraction preserves non-member fields**
    - **Validates: Requirements 29.2, 29.3**
  
  - [x] 3.6 Write property test for chronological validation
    - **Property 2: Chronological validation rejects out-of-order imports**
    - **Validates: Requirements 15.1, 15.2**
  
  - [x] 3.7 Write unit tests for TransactionService
    - Test empty database import scenario
    - Test validation error handling
    - Test date range queries with edge cases
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 15.1, 15.2, 15.3, 15.4_

- [x] 4. Implement Competition Service
  - [x] 4.1 Create CompetitionService with CRUD operations
    - Implement createCompetition(), getAllCompetitions(), getCompetitionById()
    - Implement updateCompetition() and deleteCompetition()
    - Use database transactions for cascade deletes
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 4.2 Write property test for competition cascade delete
    - **Property 3: Deleting competition removes all associations**
    - **Validates: Requirements 3.5**
  
  - [x] 4.3 Write unit tests for CompetitionService
    - Test CRUD operations
    - Test cascade delete behavior
    - Test error handling for non-existent competitions
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5. Implement Flagged Transaction Service
  - [x] 5.1 Create FlaggedTransactionService with flagging operations
    - Implement createFlaggedTransaction() method
    - Implement getAllFlaggedTransactions() with transaction details join
    - Implement updateFlaggedTransaction() for competition association
    - Implement deleteFlaggedTransaction() method
    - Add duplicate flagging prevention
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 5.2 Write unit tests for FlaggedTransactionService
    - Test duplicate flagging prevention
    - Test competition association
    - Test flagged transaction queries with joins
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6. Implement Summary Service
  - [x] 6.1 Create SummaryService with weekly calculation logic
    - Migrate weekly period grouping logic (Monday 00:00:00 to Sunday 23:59:59)
    - Migrate Competition Purse calculation formulas
    - Migrate Competition Pot calculation formulas
    - Implement calculateWeeklySummaries() with date range filtering
    - Handle refund values as negative numbers
    - Generate summaries for all periods including zero-transaction weeks
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 30.1, 30.2, 30.3, 30.4, 30.5_
  
  - [x] 6.2 Write property test for weekly summary calculations
    - **Property 4: Weekly summaries preserve transaction totals**
    - **Validates: Requirements 30.2, 30.3**
  
  - [x] 6.3 Write unit tests for SummaryService
    - Test weekly period boundary calculations
    - Test empty database returns empty array
    - Test date range filtering
    - Test refund handling as negative values
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 30.1, 30.2, 30.3, 30.4, 30.5_

- [x] 7. Checkpoint - Ensure all service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement REST API Routes
  - [x] 8.1 Create transaction routes
    - POST /api/transactions/import - import transaction array
    - GET /api/transactions - get all transactions
    - GET /api/transactions?startDate=X&endDate=Y - get filtered transactions
    - DELETE /api/transactions - delete all transactions
    - GET /api/transactions/latest - get latest timestamp
    - Add request validation middleware
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 14.1, 14.3, 14.4, 14.5_
  
  - [x] 8.2 Create competition routes
    - POST /api/competitions - create competition
    - GET /api/competitions - get all competitions
    - PUT /api/competitions/:id - update competition
    - DELETE /api/competitions/:id - delete competition
    - Add request validation middleware
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 14.2, 14.3, 14.4, 14.5_
  
  - [x] 8.3 Create flagged transaction routes
    - POST /api/flagged-transactions - flag a transaction
    - GET /api/flagged-transactions - get all flagged transactions
    - PUT /api/flagged-transactions/:id - associate with competition
    - DELETE /api/flagged-transactions/:id - remove flag
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 8.4 Create summary routes
    - GET /api/summaries/weekly - calculate all weekly summaries
    - GET /api/summaries/weekly?startDate=X&endDate=Y - calculate filtered summaries
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 8.5 Create export and import routes
    - GET /api/export/transactions - export all transactions as JSON
    - GET /api/export/competitions - export all competitions as JSON
    - GET /api/export/all - export complete database
    - POST /api/import/backup - restore from backup file
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [x] 8.6 Create CSV import route
    - POST /api/import/csv - accept multipart/form-data CSV upload
    - Parse CSV, transform records, validate chronology, store in database
    - Return HTTP 201 with import summary on success
    - Limit file size to 10MB
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_
  
  - [x] 8.7 Write integration tests for API routes
    - Test all transaction endpoints end-to-end
    - Test all competition endpoints end-to-end
    - Test error responses and status codes
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 9. Implement API Server Setup
  - [x] 9.1 Create Express server with middleware configuration
    - Set up helmet for security headers
    - Set up CORS with environment-based origins
    - Set up body-parser with 10MB limit
    - Set up static file serving for frontend
    - Register all route handlers
    - Add error handling middleware
    - _Requirements: 11.4, 19.1, 19.2, 19.3, 19.4, 19.5, 25.3, 25.4, 25.5, 26.1, 26.2, 26.3, 26.4, 26.5_
  
  - [x] 9.2 Implement graceful shutdown handling
    - Listen for SIGTERM and SIGINT signals
    - Stop accepting new connections
    - Wait for in-flight requests (30 second timeout)
    - Close database connections
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5_
  
  - [x] 9.3 Create health check routes
    - GET /health - basic health check
    - GET /health/db - database connectivity check
    - GET /health/ready - readiness check
    - Include version information in responses
    - No authentication required for health checks
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5_
  
  - [x] 9.4 Write unit tests for server setup
    - Test middleware registration
    - Test graceful shutdown behavior
    - Test health check endpoints
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 27.1, 27.2, 27.3, 27.4, 27.5_

- [x] 10. Implement request validation and error handling
  - [x] 10.1 Create validation middleware
    - Validate required fields for transaction import (date, time, type, total)
    - Validate required fields for competition creation (name, date)
    - Validate date format (ISO 8601 YYYY-MM-DD)
    - Validate numeric fields
    - Return HTTP 400 with all validation errors
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  
  - [x] 10.2 Create error handling middleware
    - Handle validation errors (HTTP 400)
    - Handle chronological validation errors (HTTP 409)
    - Handle database errors (HTTP 503)
    - Handle unhandled exceptions (HTTP 500)
    - Use environment-based error detail exposure
    - _Requirements: 2.6, 12.1, 12.2, 12.3, 26.1, 26.2_
  
  - [x] 10.3 Implement request logging
    - Log all incoming requests with timestamp, method, path, status
    - Log database queries in development mode
    - Use appropriate log levels (info, warn, error)
    - _Requirements: 12.4, 12.5, 26.5_
  
  - [x] 10.4 Write unit tests for validation and error handling
    - Test validation middleware with invalid inputs
    - Test error handler with different error types
    - Test logging output
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 12.1, 12.2, 12.3_

- [x] 11. Checkpoint - Ensure backend services and routes work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement Frontend API Client
  - [x] 12.1 Create API Client module with same interface as Database_Manager
    - Implement importTransactions() method (POST /api/transactions/import)
    - Implement getAllTransactions() method (GET /api/transactions)
    - Implement getTransactionsByDateRange() method (GET with query params)
    - Implement deleteAllTransactions() method (DELETE /api/transactions)
    - Implement getLatestTimestamp() method (GET /api/transactions/latest)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [x] 12.2 Add network error handling to API Client
    - Catch fetch errors and display user-friendly messages
    - Handle timeout scenarios
    - Handle HTTP error status codes
    - Retry failed requests with exponential backoff
    - _Requirements: 6.6_
  
  - [x] 12.3 Replace Database_Manager calls in frontend
    - Update CSV import flow to use API Client
    - Update transaction viewing to use API Client
    - Update database reset to use API Client
    - Preserve all existing UI components and layouts
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_
  
  - [-] 12.4 Write unit tests for API Client
    - Test API Client methods with mocked fetch
    - Test error handling and retries
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 21.3_

- [x] 13. Implement Competition and Flagging API Integration
  - [x] 13.1 Create Competition API Client methods
    - Implement createCompetition() (POST /api/competitions)
    - Implement getAllCompetitions() (GET /api/competitions)
    - Implement updateCompetition() (PUT /api/competitions/:id)
    - Implement deleteCompetition() (DELETE /api/competitions/:id)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [x] 13.2 Create Flagged Transaction API Client methods
    - Implement flagTransaction() (POST /api/flagged-transactions)
    - Implement getAllFlaggedTransactions() (GET /api/flagged-transactions)
    - Implement associateWithCompetition() (PUT /api/flagged-transactions/:id)
    - Implement unflagTransaction() (DELETE /api/flagged-transactions/:id)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 13.3 Update frontend competition management UI
    - Replace competition management calls with API Client
    - Replace flagging calls with API Client
    - Preserve existing UI and interaction patterns
    - _Requirements: 17.1, 17.2_

- [x] 14. Implement Weekly Summary API Integration
  - [x] 14.1 Create Summary API Client methods
    - Implement getWeeklySummaries() (GET /api/summaries/weekly)
    - Implement getWeeklySummariesByDateRange() (GET with query params)
    - _Requirements: 5.1, 5.2_
  
  - [x] 14.2 Update frontend weekly summary UI
    - Replace Weekly_Summarizer calls with API Client
    - Preserve existing summary display format
    - _Requirements: 17.1, 17.2, 17.3_
  
  - [x] 14.3 Write property test for weekly summary API
    - **Property 5: Weekly summaries match frontend calculation**
    - **Validates: Requirements 5.3, 30.2, 30.3**

- [ ]* 15. Implement Migration Service
  - [ ]* 15.1 Create IndexedDB export utility
    - Implement function to export all IndexedDB records to JSON
    - Include metadata (export timestamp, record counts)
    - Preserve all field values and data types
    - _Requirements: 7.1, 7.3_
  
  - [ ]* 15.2 Create PostgreSQL import utility
    - Implement function to import JSON records via REST API
    - Log failed records and continue processing
    - Validate record counts match between export and import
    - _Requirements: 7.2, 7.3, 7.4, 7.5_
  
  - [ ]* 15.3 Write unit tests for migration utilities
    - Test export format and completeness
    - Test import error handling
    - Test record count validation
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 16. Implement Concurrent User Support
  - [ ]* 16.1 Add database transaction isolation
    - Use appropriate isolation levels for concurrent writes
    - Implement sequential CSV import processing
    - Add row-level locking where needed
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 23.5_
  
  - [ ]* 16.2 (Optional) Add WebSocket support for real-time updates
    - Set up WebSocket server
    - Broadcast data changes to connected clients
    - Update frontend to listen for WebSocket events
    - _Requirements: 9.5_
  
  - [ ]* 16.3 Write integration tests for concurrent operations
    - Test simultaneous queries from multiple clients
    - Test concurrent CSV imports
    - Test race condition prevention
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 17. Implement Security Hardening
  - [x] 17.1 Add security middleware and headers
    - Configure helmet with Content-Security-Policy, X-Frame-Options, X-Content-Type-Options
    - Use parameterized queries for all database operations
    - Sanitize all user inputs
    - _Requirements: 25.3, 25.4, 25.5, 25.6_
  
  - [x] 17.2 Configure environment-based security
    - Use secure defaults in development
    - Fail explicitly on missing secrets in production
    - Restrict CORS origins in production
    - _Requirements: 11.5, 26.3, 26.4_
  
  - [x] 17.3 Write security tests
    - Test SQL injection prevention
    - Test CORS configuration
    - _Requirements: 25.3, 25.4, 25.5, 25.6_

- [x] 18. Implement API Documentation
  - [x] 18.1 Set up Swagger/OpenAPI documentation
    - Install and configure swagger-ui-express
    - Create OpenAPI specification for all endpoints
    - Include request/response schemas
    - Include example requests and responses
    - Serve documentation at GET /api/docs
    - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5_

- [x] 19. Implement Export and Backup Endpoints
  - [x] 19.1 Create export service
    - Implement exportTransactions() method
    - Implement exportCompetitions() method
    - Implement exportAll() method with metadata
    - Include export timestamp and record counts
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [x] 19.2 Create backup import endpoint
    - Implement POST /api/import/backup handler
    - Validate backup file format
    - Restore transactions, competitions, and flagged transactions
    - Use database transactions for atomic restore
    - _Requirements: 10.5_
  
  - [x] 19.3 Write unit tests for export and backup
    - Test export format and completeness
    - Test backup restore functionality
    - Test metadata inclusion
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 20. Implement Performance Optimizations
  - [x] 20.1 Add database indexes
    - Create indexes on transactions(date, time, type)
    - Create indexes on competitions(date)
    - Create indexes on flagged_transactions(transaction_id, competition_id)
    - _Requirements: 1.4, 22.1, 22.2, 22.3_
  
  - [x] 20.2 Implement pagination for large result sets
    - Add pagination support to GET /api/transactions
    - Use limit and offset query parameters
    - Return pagination metadata (total, page, pageSize)
    - Apply pagination when results exceed 1,000 records
    - _Requirements: 22.5_
  
  - [ ]* 20.3 Write performance tests
    - Test query performance with 10,000 transactions
    - Test CSV import performance with 1,000 transactions
    - Test weekly summary calculation with 52 weeks
    - _Requirements: 22.1, 22.2, 22.3_

- [x] 21. Checkpoint - Ensure all backend and frontend integration works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 22. Cloud Deployment Configuration
  - [x] 22.1 Create deployment configuration files
    - Create Dockerfile for containerized deployment
    - Create docker-compose.yml for local development
    - Create Railway/Heroku configuration files
    - Document environment variables in README
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_
  
  - [x] 22.2 Configure production environment settings
    - Set up production database connection string format
    - Configure HTTPS support
    - Set up static file serving from public directory
    - Configure production CORS origins
    - _Requirements: 18.2, 18.3, 18.4, 18.5_

- [-] 23. Migrate Existing Tests to New Architecture
  - [x] 23.1 Set up test database configuration
    - Create separate test database configuration
    - Implement test database reset between test runs
    - Configure test environment variables
    - _Requirements: 21.1, 21.2_
  
  - [x] 23.2 Migrate existing property-based tests
    - Adapt existing frontend property tests to use API Client
    - Ensure all existing test coverage is maintained
    - Update test setup to use test database
    - _Requirements: 21.4_
  
  - [x] 23.3 Create new integration tests
    - Test end-to-end CSV import workflow
    - Test end-to-end competition management workflow
    - Test end-to-end flagging and association workflow
    - _Requirements: 21.5_

- [x] 24. Final Integration and Wiring
  - [x] 24.1 Wire all components together
    - Connect all services to Express routes
    - Connect all routes to server
    - Verify all middleware is properly ordered
    - Test complete end-to-end workflows manually
    - _Requirements: All requirements_
  
  - [x] 24.2 Create startup script and documentation
    - Create npm scripts for development, production, and testing
    - Document setup instructions in README
    - Document API endpoints and usage
    - Document migration process from IndexedDB
    - _Requirements: 18.1, 18.2_

- [x] 25. Final checkpoint - Ensure all tests pass and system is ready
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The implementation preserves all existing business logic and UI/UX
- Backend uses TypeScript for type safety and consistency with design
- Frontend changes are minimal - only replacing Database_Manager with API_Client
- Migration tooling enables smooth transition from IndexedDB to PostgreSQL
- Authentication and multi-user support enable production deployment
- Health checks and monitoring enable operational visibility
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end workflows
