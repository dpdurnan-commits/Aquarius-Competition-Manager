# Implementation Plan: Competition Results Reconciliation

## Overview

This implementation plan breaks down the competition results reconciliation feature into discrete coding tasks. The feature synchronizes financial transaction data with competition results through a two-phase reconciliation process: name correction reconciliation and missing player identification. Implementation follows a bottom-up approach, starting with backend service logic, then API routes, and finally frontend UI components.

## Tasks

- [x] 1. Implement backend reconciliation service logic
  - [x] 1.1 Add reconcileResults method to CompetitionResultService
    - Create reconcileResults method that accepts competitionId parameter
    - Implement database transaction wrapper for atomic operations
    - Add validation to verify competition exists
    - Return ReconciliationSummary interface with all required fields
    - _Requirements: 1.2, 5.1_

  - [ ]* 1.2 Write property test for reconciliation atomicity
    - **Property 10: Reconciliation Atomicity**
    - **Validates: Requirements 5.1**

  - [x] 1.3 Implement Phase 1: Name Correction Reconciliation
    - Query all existing competition results for the competition
    - For each result, query transactions matching playerName (case-insensitive using UPPER)
    - Calculate entry_paid from Sale transactions (sum of total field)
    - Calculate competition_refund from Refund transactions (sum of total field)
    - Calculate swindle_money_paid from flagged_transactions join
    - Update result record with new financial values
    - Track count of results updated for summary
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 1.4 Write property test for name correction updates
    - **Property 3: Name Correction Updates Financial Fields**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

  - [ ]* 1.5 Write property test for no match preservation
    - **Property 4: No Match Preserves Financial Fields**
    - **Validates: Requirements 2.5**

  - [x] 1.6 Implement Phase 2: Missing Player Reconciliation
    - Query all distinct player names from transactions for competition (handle both player and member fields)
    - Query all distinct player names from existing results
    - Identify missing players (in transactions but not in results, case-insensitive)
    - For each missing player: calculate financial totals using same queries as Phase 1
    - Get max finishing_position from existing results
    - Insert new result with position "DNP", next finishing_position (max + 1), and calculated financial values
    - Track count of DNP entries added for summary
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.5_

  - [ ]* 1.7 Write property test for missing player identification
    - **Property 5: Missing Players Are Identified and Added**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.5**

  - [ ]* 1.8 Write property test for existing results order preservation
    - **Property 6: Existing Results Order Preserved**
    - **Validates: Requirements 4.4**

  - [x] 1.9 Implement summary generation and error handling
    - Build ReconciliationSummary with nameCorrections count, dnpEntriesAdded count, totalValueReconciled sum
    - Wrap all operations in try-catch block
    - On error, rollback transaction and add error details to summary.errors array
    - Log all errors with competition ID and stack trace
    - Return summary with success flag
    - _Requirements: 5.3, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 1.10 Write property test for financial conservation
    - **Property 7: Financial Conservation**
    - **Validates: Requirements 5.1, 5.2, 5.5**

  - [ ]* 1.11 Write property test for transaction immutability
    - **Property 8: Transaction Immutability**
    - **Validates: Requirements 5.4**

  - [ ]* 1.12 Write unit tests for service layer edge cases
    - Test empty results list
    - Test empty transactions list
    - Test player with only refunds (no entry)
    - Test duplicate player names in transactions
    - Test special characters in player names
    - Test case-insensitive name matching
    - Test multiple transactions for same player
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4_

- [x] 2. Checkpoint - Ensure service layer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement backend API endpoint
  - [x] 3.1 Add POST /api/competition-results/competitions/:competitionId/reconcile route
    - Create new route in competitionResult.routes.ts
    - Extract competitionId from path parameters
    - Validate competitionId is a valid number
    - Call competitionResultService.reconcileResults(competitionId)
    - Return 200 with ReconciliationResponse on success
    - Return 404 if competition not found
    - Return 500 on server errors with error details
    - _Requirements: 1.2_

  - [ ]* 3.2 Write unit tests for API endpoint
    - Test 200 response with valid competition ID
    - Test 404 response when competition doesn't exist
    - Test 500 response on database errors
    - Test response includes all required summary fields
    - Test competition ID parameter validation
    - _Requirements: 1.2_

- [x] 4. Implement frontend reconciliation UI
  - [x] 4.1 Add reconciliation button to results table header
    - Add "Reconcile Results" button next to "Add Manual Entry" button in resultsTable.js
    - Style button consistently with existing table header buttons
    - Wire button click to handleReconcile method
    - _Requirements: 1.1_

  - [x] 4.2 Implement handleReconcile method in resultsTable.js
    - Create async handleReconcile method
    - Show loading state during API call
    - Make POST request to /api/competition-results/competitions/:competitionId/reconcile
    - On success, display reconciliation summary modal
    - On error, display user-friendly error message
    - Refresh results table after successful reconciliation
    - _Requirements: 1.2, 1.3_

  - [x] 4.3 Create reconciliation summary modal component
    - Create modal component to display ReconciliationSummary
    - Display nameCorrections count with label "Name corrections processed"
    - Display dnpEntriesAdded count with label "DNP entries added"
    - Display totalValueReconciled with currency formatting
    - Display errors array if present (each error on separate line)
    - Add close button to dismiss modal
    - _Requirements: 1.3, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 4.4 Write unit tests for frontend components
    - Test reconciliation button renders in results table header
    - Test button click triggers API call with correct competition ID
    - Test success modal displays with summary data
    - Test error messages display when API call fails
    - Test loading state shows during reconciliation
    - Test modal closes when user clicks close button
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 4.5 Write property test for reconciliation execution
    - **Property 1: Reconciliation Executes Both Phases**
    - **Validates: Requirements 1.2**

  - [ ]* 4.6 Write property test for summary display
    - **Property 2: Summary Display After Reconciliation**
    - **Validates: Requirements 1.3, 6.1, 6.2, 6.3, 6.4, 6.5**

  - [ ]* 4.7 Write property test for error reporting
    - **Property 9: Error Reporting**
    - **Validates: Requirements 5.3, 6.4**

- [x] 5. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All database operations in Phase 1 and Phase 2 execute within a single transaction for atomicity
- Case-insensitive name matching uses SQL UPPER function for consistency
- DNP entries use string "DNP" for finishing_position to avoid conflicts with numeric positions
