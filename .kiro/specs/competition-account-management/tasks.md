# Implementation Plan: Competition Account Management

## Overview

This implementation extends the existing competition-csv-import system by adding IndexedDB persistence, field extraction logic, chronological validation, and weekly financial summary generation. The implementation follows a layered approach: data transformation → validation → storage → summarization → presentation. All code will be written in TypeScript/JavaScript for browser-based execution.

## Tasks

- [x] 1. Set up IndexedDB database schema and manager
  - [x] 1.1 Create DatabaseManager class with IndexedDB initialization
    - Implement database connection with name "CompetitionAccountDB"
    - Create object store "summarised_period_transactions" with auto-incrementing key
    - Add indexes: "by-date" (on date field) and "by-datetime" (compound on date, time)
    - Handle database upgrade events for schema creation
    - _Requirements: 2.1, 2.2_
  
  - [x] 1.2 Implement store() method for batch record insertion
    - Accept array of EnhancedRecord objects
    - Use readwrite transaction for batch insertion
    - Collect and return both successful stores and errors
    - Continue processing on individual record failures
    - _Requirements: 2.3, 11.2_
  
  - [x] 1.3 Implement query methods (getAll, getByDateRange, getLatestTimestamp)
    - getAll(): retrieve all records from database
    - getByDateRange(): query records within date range using indexes
    - getLatestTimestamp(): use reverse cursor on by-datetime index to find latest record
    - Return null from getLatestTimestamp() when database is empty
    - _Requirements: 2.4, 2.5, 3.2_
  
  - [x] 1.4 Implement clearAll() method for database reset
    - Use readwrite transaction to clear object store
    - Handle errors gracefully with user-friendly messages
    - _Requirements: 10.1, 10.2_
  
  - [x] 1.5 Write property test for database round-trip
    - **Property 3: Database storage round-trip**
    - **Validates: Requirements 2.3, 2.4, 8.3**
  
  - [x] 1.6 Write property test for date range queries
    - **Property 4: Date range query correctness**
    - **Validates: Requirements 2.5**
  
  - [x] 1.7 Write property test for database clear
    - **Property 5: Database clear removes all records**
    - **Validates: Requirements 10.1, 10.2, 10.3**
  
  - [x] 1.8 Write unit tests for DatabaseManager edge cases
    - Test empty database queries
    - Test single record storage and retrieval
    - Test storage quota exceeded handling
    - Test database initialization failure
    - _Requirements: 2.1, 2.3, 2.4, 11.1_

- [x] 2. Implement field extraction logic
  - [x] 2.1 Create FieldExtractor class with extract() method
    - Check for presence of both " &" and ":" in Member field
    - Extract Player: substring before " &"
    - Extract Competition: substring between "& " and ":"
    - Clear Member field when extraction occurs
    - Preserve Member field when delimiters absent
    - Handle edge cases: delimiters at boundaries, null/undefined values
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 2.2 Write property test for extraction with delimiters
    - **Property 1: Player and Competition extraction when delimiters present**
    - **Validates: Requirements 1.1, 1.2, 1.3**
  
  - [x] 2.3 Write property test for no extraction without delimiters
    - **Property 2: No extraction when delimiters absent**
    - **Validates: Requirements 1.4**
  
  - [x] 2.4 Write unit tests for field extraction edge cases
    - Test Member with only "&" (no ":")
    - Test Member with only ":" (no "&")
    - Test Member with multiple "&" or ":" characters
    - Test empty Member field
    - Test Member with delimiters at string boundaries
    - _Requirements: 1.5_

- [x] 3. Implement chronological validation
  - [x] 3.1 Create ChronologicalValidator class with validate() method
    - Find earliest timestamp in new records array
    - Query database for latest existing timestamp
    - Compare timestamps and return ValidationResult
    - Allow import when database is empty
    - Reject import when earliestNew < latestExisting
    - Include both timestamps in error result
    - _Requirements: 3.1, 3.2, 3.3, 3.5_
  
  - [x] 3.2 Implement date/time parsing utility functions
    - parseDateTime(): convert date and time strings to Unix timestamp
    - Support formats: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY for dates
    - Support formats: HH:MM:SS, HH:MM for times
    - Handle parsing errors gracefully
    - _Requirements: 3.1, 3.2_
  
  - [x] 3.3 Write property test for earliest timestamp identification
    - **Property 6: Earliest timestamp identification**
    - **Validates: Requirements 3.1**
  
  - [x] 3.4 Write property test for latest timestamp identification
    - **Property 7: Latest timestamp identification**
    - **Validates: Requirements 3.2**
  
  - [x] 3.5 Write property test for chronological validation logic
    - **Property 8: Chronological validation rejects out-of-order imports**
    - **Validates: Requirements 3.3**
  
  - [x] 3.6 Write property test for validation atomicity
    - **Property 9: Failed validation prevents storage**
    - **Validates: Requirements 3.4**
  
  - [x] 3.7 Write unit tests for chronological validation scenarios
    - Test validation with empty database
    - Test validation with new data after existing data
    - Test validation with new data before existing data
    - Test validation with invalid date formats
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement weekly period grouping and summarization
  - [x] 5.1 Create WeeklySummarizer class with generateSummaries() method
    - Find earliest and latest dates in record set
    - Generate all weekly periods from earliest to latest
    - Group records by weekly period
    - Calculate summaries for each period with rolling balances
    - Return array of WeeklySummary objects
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 5.2 Implement weekly period utility functions
    - getMondayOfWeek(): get Monday 00:00:00 for any date
    - getSundayOfWeek(): get Sunday 23:59:59 for any date
    - generateWeeklyPeriods(): create array of weekly periods between two dates
    - groupRecordsByWeek(): assign records to their respective weekly periods
    - _Requirements: 4.1, 4.2_
  
  - [x] 5.3 Implement financial calculation functions
    - sumWhere(): filter and sum Total field based on predicate
    - calculatePurseComponents(): compute all Competition Purse values
    - calculatePotComponents(): compute all Competition Pot values
    - Apply calculation formulas from requirements
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7, 6.5_
  
  - [x] 5.4 Write property test for weekly period boundaries
    - **Property 10: Weekly periods span Monday to Sunday**
    - **Validates: Requirements 4.1**
  
  - [x] 5.5 Write property test for transaction assignment
    - **Property 11: Transaction assignment to correct week**
    - **Validates: Requirements 4.2**
  
  - [x] 5.6 Write property test for complete period coverage
    - **Property 12: Complete weekly period coverage**
    - **Validates: Requirements 4.3**
  
  - [x]* 5.7 Write property test for chronological ordering
    - **Property 13: Weekly summaries are chronologically ordered**
    - **Validates: Requirements 4.4**
  
  - [x]* 5.8 Write property test for rolling balance consistency
    - **Property 14: Rolling balance consistency**
    - **Validates: Requirements 5.1, 6.1, 8.1**
  
  - [x]* 5.9 Write property test for transaction filtering and summing
    - **Property 15: Transaction filtering and summing correctness**
    - **Validates: Requirements 5.3, 5.4, 5.5, 5.6**
  
  - [x]* 5.10 Write property test for Competition Purse formula
    - **Property 16: Competition Purse calculation formula**
    - **Validates: Requirements 5.7**
  
  - [x]* 5.11 Write property test for Competition Pot formula
    - **Property 17: Competition Pot calculation formula**
    - **Validates: Requirements 6.5**
  
  - [x]* 5.12 Write unit tests for weekly summarization
    - Test first week initialization (starting balances = 0)
    - Test single week with multiple transactions
    - Test multiple weeks with gaps (no transactions in middle weeks)
    - Test week spanning year boundary
    - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 6.1, 6.2_

- [x] 6. Create Transaction Summary View UI component
  - [x] 6.1 Create TransactionSummaryView class with render() method
    - Build HTML table structure with 12 columns
    - Add column headers with grouping (Period, Competition Purse, Competition Pot)
    - Implement formatCurrency() for monetary values (£ symbol, 2 decimals)
    - Implement formatDate() for date display (DD/MM/YYYY format)
    - Display refunds as negative values
    - Add tooltip to Competition Costs column
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [x] 6.2 Implement empty state display
    - Show message when no summaries available
    - Hide table when empty, show empty state message
    - _Requirements: 7.5_
  
  - [x] 6.3 Add CSS styling for summary table
    - Style table with clear column groupings
    - Add hover effects for rows
    - Style monetary values (right-aligned)
    - Style tooltip icon and popup
    - Ensure responsive layout for scrolling
    - _Requirements: 7.1_
  
  - [x] 6.4 Write property test for monetary formatting
    - **Property 18: Monetary value formatting**
    - **Validates: Requirements 7.2**
  
  - [x] 6.5 Write property test for refund negative display
    - **Property 19: Refunds displayed as negative**
    - **Validates: Requirements 7.3**
  
  - [x] 6.6 Write unit tests for view rendering
    - Test rendering with specific summary data
    - Test empty state display
    - Test tooltip presence and content
    - Test table structure and column count
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 7. Integrate with existing CSV import workflow
  - [x] 7.1 Add "Save to Database" button to existing UI
    - Add button after CSV processing completes
    - Wire button click to trigger field extraction and storage
    - Show loading state during database operations
    - Display success/error messages after storage
    - _Requirements: 9.1_
  
  - [x] 7.2 Implement import pipeline orchestration
    - After CSV transformation, call FieldExtractor.extract() on all records
    - Call ChronologicalValidator.validate() with extracted records
    - If validation passes, call DatabaseManager.store() with records
    - After storage, query all records and call WeeklySummarizer.generateSummaries()
    - Update TransactionSummaryView with new summaries
    - _Requirements: 9.1, 9.2_
  
  - [x] 7.3 Add database reset button to UI
    - Add "Reset Database" button with confirmation dialog
    - Wire button to DatabaseManager.clearAll()
    - Update all views after reset completes
    - Show success message after reset
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [x] 7.4 Preserve existing CSV export and Data Viewer functionality
    - Ensure CSV export still works with enhanced records
    - Ensure Data Viewer displays all fields including Player and Competition
    - Test that existing functionality is not broken
    - _Requirements: 9.3, 9.4_
  
  - [x] 7.5 Write property test for import pipeline completeness
    - **Property 20: Import pipeline completeness**
    - **Validates: Requirements 9.1, 9.2**
  
  - [x]* 7.6 Write unit tests for integration points
    - Test complete pipeline with specific CSV files
    - Test view updates after storage
    - Test reset functionality
    - Test error handling during pipeline execution
    - _Requirements: 9.1, 9.2, 10.1, 10.2, 10.3_

- [x] 8. Implement error handling and user feedback
  - [x] 8.1 Add error handling to DatabaseManager
    - Check IndexedDB support on initialization
    - Display clear error if IndexedDB unavailable
    - Wrap all database operations in try-catch
    - Return structured error information
    - _Requirements: 11.1_
  
  - [x] 8.2 Add error handling to ChronologicalValidator
    - Display modal or alert with validation error details
    - Show both conflicting timestamps in error message
    - Prevent database writes when validation fails
    - _Requirements: 11.3_
  
  - [x] 8.3 Add error handling to WeeklySummarizer
    - Validate numeric parsing for Total fields
    - Handle missing or null values gracefully
    - Log calculation errors with week context
    - Return partial results if some weeks fail
    - _Requirements: 11.4_
  
  - [x] 8.4 Add error handling to TransactionSummaryView
    - Wrap rendering in try-catch
    - Display error state if rendering fails
    - Show loading state during calculations
    - _Requirements: 11.4_
  
  - [x] 8.5 Write property test for storage error handling
    - **Property 21: Storage errors are graceful**
    - **Validates: Requirements 11.2**
  
  - [x] 8.6 Write property test for validation error context
    - **Property 22: Validation errors include context**
    - **Validates: Requirements 11.3**
  
  - [x] 8.7 Write property test for calculation error recovery
    - **Property 23: Calculation errors preserve last valid state**
    - **Validates: Requirements 11.4**
  
  - [x] 8.8 Write unit tests for error scenarios
    - Test database initialization failure
    - Test storage quota exceeded
    - Test chronological validation failure display
    - Test calculation errors with invalid data
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests should use fast-check library with minimum 100 iterations
- All monetary values must be formatted with 2 decimal places
- Weekly periods are Monday 00:00:00 to Sunday 23:59:59
- Database reset functionality is critical for iterative refinement during deployment
