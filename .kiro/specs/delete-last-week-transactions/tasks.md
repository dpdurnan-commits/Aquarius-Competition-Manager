# Implementation Plan: Delete Last Week Transactions

## Overview

This feature adds the ability to delete all transactions from the most recent week (Monday-Sunday) in the Transaction Summary view. The implementation includes backend API endpoints for retrieving week information and deleting transactions, frontend UI components for the delete button and confirmation dialog, and comprehensive testing.

## Tasks

- [x] 1. Implement backend date calculation helper functions
  - [x] 1.1 Add getMondayOfWeek and getSundayOfWeek functions to transaction.service.ts
    - Implement getMondayOfWeek to return Monday at 00:00:00.000
    - Implement getSundayOfWeek to return Sunday at 23:59:59.999
    - Follow ISO 8601 standard (weeks start on Monday)
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 15.1, 15.2, 15.3, 15.4, 15.5_
  
  - [ ]* 1.2 Write property test for date calculation functions
    - **Property 1: Week Boundary Correctness**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6, 15.1, 15.2, 15.3, 15.4**
    - Test that getMondayOfWeek always returns Monday with time 00:00:00.000
    - Test that getSundayOfWeek always returns Sunday with time 23:59:59.999
    - Test that Sunday is exactly 6 days after Monday

- [x] 2. Implement backend service methods for last week operations
  - [x] 2.1 Add getLastWeekInfo method to transaction.service.ts
    - Query database for most recent transaction date
    - Calculate Monday-Sunday range using helper functions
    - Count transactions in the date range
    - Return LastWeekInfo object or null if no transactions
    - _Requirements: 3.1, 4.2, 4.4_
  
  - [ ]* 2.2 Write property test for getLastWeekInfo
    - **Property 2: Last Week Identification**
    - **Validates: Requirements 3.1, 4.2, 4.4**
    - Test that returned week range contains the most recent transaction
    - Test that start date is Monday and end date is Sunday
    - Test that count matches actual transactions in range
  
  - [x] 2.3 Add deleteLastWeek method to transaction.service.ts
    - Call getLastWeekInfo to get week range
    - Use database transaction for atomic deletion
    - Delete all transactions within date range using parameterized query
    - Return count of deleted transactions
    - Roll back on error
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 16.1, 16.2, 16.3_
  
  - [ ]* 2.4 Write unit tests for transaction service methods
    - Test getLastWeekInfo returns null when no transactions exist
    - Test getLastWeekInfo returns correct week range
    - Test deleteLastWeek throws error when no transactions exist
    - Test deleteLastWeek rolls back on database error
    - _Requirements: 4.3, 7.5, 12.2_

- [x] 3. Implement backend API endpoints
  - [x] 3.1 Add GET /api/transactions/last-week-info endpoint to transaction.routes.ts
    - Call transactionService.getLastWeekInfo()
    - Return 404 with null weekInfo when no transactions exist
    - Return 200 with weekInfo object when transactions exist
    - Include error handling middleware
    - _Requirements: 13.1, 13.2, 13.3, 13.4_
  
  - [x] 3.2 Add DELETE /api/transactions/last-week endpoint to transaction.routes.ts
    - Call transactionService.deleteLastWeek()
    - Return 404 when no transactions exist
    - Return 200 with deletion count and success message
    - Return 500 on database errors
    - Include error handling middleware
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  
  - [ ]* 3.3 Write integration tests for API endpoints
    - Test GET endpoint returns 404 when database is empty
    - Test GET endpoint returns 200 with valid week info
    - Test DELETE endpoint returns 404 when database is empty
    - Test DELETE endpoint returns 200 with deletion count
    - Test DELETE endpoint returns 500 on database error
    - _Requirements: 13.2, 13.3, 14.2, 14.3, 14.5_

- [x] 4. Checkpoint - Ensure backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement frontend API client methods
  - [x] 5.1 Add getLastWeekInfo method to apiClient.js
    - Make GET request to /api/transactions/last-week-info
    - Return LastWeekInfo object or null
    - Handle 404 response by returning null
    - Wrap errors with descriptive messages
    - _Requirements: 4.1_
  
  - [x] 5.2 Add deleteLastWeek method to apiClient.js
    - Make DELETE request to /api/transactions/last-week
    - Return DeleteResult object with count and message
    - Wrap errors with descriptive messages
    - _Requirements: 7.1_
  
  - [ ]* 5.3 Write unit tests for API client methods
    - Test getLastWeekInfo returns null on 404
    - Test getLastWeekInfo returns week info on 200
    - Test deleteLastWeek returns result on 200
    - Test error handling for network failures
    - _Requirements: 4.1, 7.1_

- [x] 6. Implement frontend UI components
  - [x] 6.1 Add delete button to transactionSummaryView.js
    - Create addDeleteLastWeekButton method
    - Position button at top of view
    - Set button text to "Delete Last Week"
    - Attach click handler to handleDeleteLastWeek method
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 6.2 Implement handleDeleteLastWeek method in transactionSummaryView.js
    - Disable button at start of operation
    - Call apiClient.getLastWeekInfo()
    - Show "No transactions to delete" message if null
    - Display confirmation dialog with week details
    - Call apiClient.deleteLastWeek() on confirmation
    - Display success message with deletion count
    - Call refreshSummaries() after successful deletion
    - Re-enable button in finally block
    - _Requirements: 2.3, 4.1, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3, 7.1, 9.1, 9.2, 9.3, 11.1, 11.2_
  
  - [x] 6.3 Implement refreshSummaries method in transactionSummaryView.js
    - Fetch all remaining transactions from backend
    - Regenerate weekly summaries using weeklySummarizer
    - Re-render the summary table
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [x] 6.4 Add button state management based on transaction count
    - Disable button when no transactions exist
    - Enable button when transactions exist
    - Update button state after deletion
    - _Requirements: 2.1, 2.2_
  
  - [ ]* 6.5 Write unit tests for UI components
    - Test addDeleteLastWeekButton creates button with correct attributes
    - Test handleDeleteLastWeek disables button during operation
    - Test handleDeleteLastWeek shows confirmation dialog
    - Test handleDeleteLastWeek calls API methods in correct order
    - Test handleDeleteLastWeek re-enables button after completion
    - Test button state management based on transaction count
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [ ] 7. Implement property-based tests for correctness properties
  - [ ]* 7.1 Write property test for deletion completeness
    - **Property 3: Deletion Completeness**
    - **Validates: Requirements 7.2, 8.1**
    - Test that no transactions remain in deleted week range after deletion
  
  - [ ]* 7.2 Write property test for deletion isolation
    - **Property 4: Deletion Isolation**
    - **Validates: Requirements 8.2, 8.3**
    - Test that transactions before and after deleted week are preserved
  
  - [ ]* 7.3 Write property test for deletion atomicity
    - **Property 5: Deletion Atomicity**
    - **Validates: Requirements 7.3, 7.5, 12.2**
    - Test that failed deletion leaves database unchanged
  
  - [ ]* 7.4 Write property test for deletion count accuracy
    - **Property 6: Deletion Count Accuracy**
    - **Validates: Requirements 7.4, 14.4**
    - Test that returned count equals actual deleted transactions

- [x] 8. Integration and wiring
  - [x] 8.1 Wire delete button into transactionSummaryView initialization
    - Call addDeleteLastWeekButton in constructor or render method
    - Ensure button appears before summary table
    - _Requirements: 1.1, 1.2_
  
  - [x] 8.2 Update transactionSummaryView to handle empty state
    - Check transaction count on render
    - Update button state accordingly
    - _Requirements: 2.1, 2.2, 11.1_
  
  - [ ]* 8.3 Write integration tests for end-to-end workflows
    - Test complete deletion workflow with multiple weeks
    - Test deletion with single week (database becomes empty)
    - Test cancellation workflow (no changes occur)
    - Test error handling workflow
    - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 9.1, 10.1, 10.2, 10.3, 12.1, 12.2, 12.3, 12.4_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end workflows
- Backend uses TypeScript with Express.js and PostgreSQL
- Frontend uses vanilla JavaScript with existing APIClient and view components
- All database queries use parameterized queries to prevent SQL injection
