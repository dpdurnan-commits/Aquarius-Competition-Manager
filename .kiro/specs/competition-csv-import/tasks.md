# Implementation Plan: Competition CSV Import

## Overview

This implementation plan breaks down the competition CSV import feature into discrete coding tasks. The system will be built as a browser-based application using HTML, CSS, and JavaScript/TypeScript. We'll use the fast-check library for property-based testing and implement components incrementally, testing as we go.

## Tasks

- [x] 1. Set up project structure and dependencies
  - Create HTML file with basic structure (file input, table container, export button)
  - Create CSS file for styling (table layout, error messages, responsive design)
  - Create main JavaScript/TypeScript file for application logic
  - Install fast-check library for property-based testing
  - Set up testing framework (Jest or similar)
  - _Requirements: All_

- [x] 2. Implement CSV Parser component
  - [x] 2.1 Create CSV parser module with parse function
    - Implement file reading using FileReader API
    - Use PapaParse library or implement custom CSV parsing
    - Return structured ParseResult (success/error)
    - Validate minimum 10 columns
    - _Requirements: 1.1, 1.2, 1.4_
  
  - [x] 2.2 Write property test for structure preservation
    - **Property 1: CSV parsing preserves structure**
    - **Validates: Requirements 1.2**
  
  - [x] 2.3 Write property test for error handling
    - **Property 2: CSV parsing handles malformed input gracefully**
    - **Validates: Requirements 1.3, 11.1**
  
  - [x] 2.4 Write property test for wide file support
    - **Property 3: CSV parsing supports wide files**
    - **Validates: Requirements 1.4**
  
  - [x] 2.5 Write property test for empty cell preservation
    - **Property 4: CSV parsing preserves empty cells**
    - **Validates: Requirements 1.5**
  
  - [x] 2.6 Write unit tests for CSV parser edge cases
    - Test empty file
    - Test file with only header
    - Test file with fewer than 10 columns
    - Test quoted fields and escaped quotes
    - _Requirements: 1.3, 1.5_

- [x] 3. Implement Record Transformer component
  - [x] 3.1 Create TransformedRecord and TransformError interfaces
    - Define TypeScript interfaces matching design document
    - _Requirements: All transformation requirements_
  
  - [x] 3.2 Implement record identification logic
    - Write function to identify Topup records (Column A non-empty, Column D = "Topup Competitions")
    - Write function to identify Sale records (Column A non-empty, Column D = "Sale", row+2 Column E contains "Competition Entry")
    - Write function to identify Refund records (Column A non-empty, Column D = "Refund", row+2 Column E contains "Competition Entry")
    - _Requirements: 2.1, 4.1, 4.2, 6.1, 6.2_
  
  - [x] 3.3 Write property test for topup identification
    - **Property 5: Topup records are correctly identified**
    - **Validates: Requirements 2.1**
  
  - [x] 3.4 Write property test for record filtering
    - **Property 6: Only qualifying records are retained**
    - **Validates: Requirements 2.3, 4.4, 6.4, 8.1, 8.2**
  
  - [x] 3.5 Implement Topup record transformation
    - Preserve Columns A-E from current row
    - Copy Columns F-J from row+2
    - Handle missing row+2 (mark as incomplete)
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 3.6 Implement Sale record transformation
    - Preserve Columns A-D from current row
    - Concatenate Column E (current + " & " + row+2)
    - Copy Columns F-J from row+2
    - Handle missing row+2 (mark as incomplete)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 3.7 Implement Refund record transformation
    - Preserve Columns A-D from current row
    - Concatenate Column E (current + " & " + row+2)
    - Copy Columns F-J from row+2
    - Handle missing row+2 (mark as incomplete)
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [x] 3.8 Write property test for column preservation
    - **Property 7: Transformation preserves original columns**
    - **Validates: Requirements 3.1, 5.1, 7.1**
  
  - [x] 3.9 Write property test for financial data transformation
    - **Property 8: Financial data comes from row+2**
    - **Validates: Requirements 3.2, 5.3, 7.3**
  
  - [x] 3.10 Write property test for member concatenation
    - **Property 9: Member concatenation for Sale and Refund**
    - **Validates: Requirements 5.2, 7.2**
  
  - [x] 3.11 Write property test for order preservation
    - **Property 10: Record order is preserved**
    - **Validates: Requirements 8.3**
  
  - [x] 3.12 Write unit tests for transformation edge cases
    - Test records at end of file (no row+2)
    - Test records with empty cells
    - Test multiple qualifying records in sequence
    - _Requirements: 3.3, 5.4, 7.4, 11.2_

- [x] 4. Checkpoint - Ensure core transformation logic works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Data Viewer component
  - [x] 5.1 Create HTML table structure with headers
    - Add table element with thead and tbody
    - Define column headers (Date, Time, Till, Type, Member, Price, Discount, Subtotal, VAT, Total)
    - _Requirements: 9.2_
  
  - [x] 5.2 Implement render function for transformed records
    - Clear existing table rows
    - Create table row for each transformed record
    - Populate cells with record data
    - Highlight incomplete records with warning indicator
    - _Requirements: 9.1_
  
  - [x] 5.3 Implement empty state display
    - Show message when no records available
    - Hide table when empty
    - _Requirements: 9.4_
  
  - [x] 5.4 Write property test for record display
    - **Property 11: All transformed records are displayed**
    - **Validates: Requirements 9.1**
  
  - [x] 5.5 Write unit tests for data viewer
    - Test rendering with specific record sets
    - Test empty state display
    - Test incomplete record highlighting
    - _Requirements: 9.1, 9.4_

- [x] 6. Implement CSV Exporter component
  - [x] 6.1 Create CSV generation function
    - Generate header row with column names
    - Convert each TransformedRecord to CSV row
    - Implement RFC 4180 escaping (quotes, commas, newlines)
    - _Requirements: 10.2, 10.3_
  
  - [x] 6.2 Implement browser download trigger
    - Create Blob with CSV content
    - Generate filename with timestamp
    - Trigger download using anchor element
    - _Requirements: 10.1, 10.4_
  
  - [x] 6.3 Write property test for export completeness
    - **Property 12: All transformed records are exported**
    - **Validates: Requirements 10.1**
  
  - [x] 6.4 Write property test for special character handling
    - **Property 13: CSV export handles special characters**
    - **Validates: Requirements 10.3**
  
  - [x] 6.5 Write property test for round-trip preservation
    - **Property 14: Round-trip preservation**
    - **Validates: Requirements 1.2, 10.5**
  
  - [x] 6.6 Write unit tests for CSV exporter
    - Test header row generation
    - Test escaping of commas, quotes, newlines
    - Test filename generation
    - _Requirements: 10.2, 10.3_

- [x] 7. Implement error handling and UI feedback
  - [x] 7.1 Create error display component
    - Add error container to HTML
    - Implement showError and hideError functions
    - Style error messages (warning vs error severity)
    - _Requirements: 11.1, 11.3, 11.4_
  
  - [x] 7.2 Add error handling to CSV parser
    - Wrap parsing in try-catch
    - Display user-friendly error messages
    - Log detailed errors to console
    - _Requirements: 1.3, 11.1_
  
  - [x] 7.3 Add error handling to transformer
    - Collect transformation errors
    - Display warning count for incomplete records
    - _Requirements: 11.2_
  
  - [x] 7.4 Add error handling to exporter
    - Wrap export in try-catch
    - Display error message on failure
    - _Requirements: 11.4_
  
  - [x] 7.5 Write property test for export error handling
    - **Property 15: Export errors are communicated**
    - **Validates: Requirements 11.4**
  
  - [x] 7.6 Write unit tests for error handling
    - Test parse error display
    - Test transformation error collection
    - Test export error display
    - Test no matching records message
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 8. Wire components together and implement main application flow
  - [x] 8.1 Create main application controller
    - Handle file input change event
    - Orchestrate: parse → transform → render
    - Handle export button click
    - _Requirements: All_
  
  - [x] 8.2 Add loading states and user feedback
    - Show loading indicator during processing
    - Display success message after processing
    - Show record count in UI
    - _Requirements: All_
  
  - [x] 8.3 Write integration tests
    - Test complete flow: upload → transform → display → export
    - Test error flows
    - Test with sample CSV files
    - _Requirements: All_

- [x] 9. Add styling and polish
  - [x] 9.1 Style the application interface
    - Style file input button
    - Style table (alternating rows, borders, spacing)
    - Style export button
    - Style error messages
    - Make responsive for mobile devices
    - _Requirements: 9.3_
  
  - [x] 9.2 Add accessibility features
    - Add ARIA labels to interactive elements
    - Ensure keyboard navigation works
    - Add focus indicators
    - _Requirements: 9.3_

- [x] 10. Final checkpoint - Ensure all tests pass and application works end-to-end
  - Ensure all tests pass, ask the user if questions arise.
  - Test with real CSV files
  - Verify all requirements are met

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests should run with minimum 100 iterations
- Use fast-check library for property-based testing
- Use PapaParse library for robust CSV parsing
- All code should be written in JavaScript/TypeScript for browser execution
- No backend required - everything runs client-side
