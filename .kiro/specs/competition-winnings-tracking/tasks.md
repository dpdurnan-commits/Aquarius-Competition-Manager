# Implementation Tasks: Competition Winnings Tracking

## Overview
This document outlines the implementation tasks for adding competition tracking and transaction flagging capabilities to the competition account management system.

## Task List

- [x] 1. Database Schema Extension and Migration
  - [x] 1.1 Update database version to 2
  - [x] 1.2 Create competitions object store with indexes
  - [x] 1.3 Add isWinning index to transactions store
  - [x] 1.4 Implement migration logic for existing records
  - [x] 1.5 Add update() method to Database Manager
  - [x] 1.6 Add getByDateRange() method to Database Manager
  - [x] 1.7 Write unit tests for database migration

- [x] 2. Competition Manager Component
  - [x] 2.1 Implement create() with uniqueness validation
  - [x] 2.2 Implement update() with uniqueness validation
  - [x] 2.3 Implement delete() with transaction check
  - [x] 2.4 Implement getAll() method
  - [x] 2.5 Implement getById() method
  - [x] 2.6 Implement checkAssociatedTransactions() method
  - [x] 2.7 Write unit tests for Competition Manager

- [x] 3. Competition Management UI
  - [x] 3.1 Create competition manager modal/panel HTML
  - [x] 3.2 Implement competition list rendering
  - [x] 3.3 Implement add competition form
  - [x] 3.4 Implement edit competition functionality
  - [x] 3.5 Implement delete competition with protection
  - [x] 3.6 Add error handling and user feedback
  - [x] 3.7 Write integration tests for competition UI

- [x] 4. Transaction Flagger Component
  - [x] 4.1 Implement flagTransaction() method
  - [x] 4.2 Implement unflagTransaction() method
  - [x] 4.3 Implement updateFlag() method
  - [x] 4.4 Implement canFlag() validation
  - [x] 4.5 Add error handling for flagging operations
  - [x] 4.6 Write unit tests for Transaction Flagger

- [x] 5. Weekly Summarizer Modifications
  - [x] 5.1 Update calculatePotComponents() to sum flagged transactions
  - [x] 5.2 Implement recalculateFromDate() method
  - [x] 5.3 Update weekly summary generation to use actual winnings
  - [x] 5.4 Write unit tests for winnings calculation
  - [x] 5.5 Write integration tests for recalculation

- [x] 6. Transaction Flagging UI (Transformed Records View)
  - [x] 6.1 Add flag control buttons to transaction rows
  - [x] 6.2 Implement competition selection modal
  - [x] 6.3 Add visual indicators for flagged transactions
  - [x] 6.4 Implement edit flag functionality
  - [x] 6.5 Add error handling and user feedback
  - [x] 6.6 Write integration tests for flagging UI

- [x] 7. Weekly Drill-Down View Component
  - [x] 7.1 Create drill-down modal HTML structure
  - [x] 7.2 Implement show() method with transaction query
  - [x] 7.3 Implement transaction table rendering
  - [x] 7.4 Add flag controls to drill-down transactions
  - [x] 7.5 Implement hide() and refresh() methods
  - [x] 7.6 Write unit tests for drill-down view

- [x] 8. Transaction Summary View Modifications
  - [x] 8.1 Make weekly rows clickable
  - [x] 8.2 Add click handlers to open drill-down view
  - [x] 8.3 Update rendering to show actual winnings values
  - [x] 8.4 Add hover effects for clickable rows
  - [x] 8.5 Write integration tests for drill-down interaction

- [x] 9. Integration and End-to-End Testing
  - [x] 9.1 Test complete flagging workflow
  - [x] 9.2 Test drill-down and flag from weekly view
  - [x] 9.3 Test competition deletion protection
  - [x] 9.4 Test retrospective flagging and recalculation
  - [x] 9.5 Test error scenarios and recovery

- [x] 10. Property-Based Testing
  - [x] 10.1 Write property test: Winnings sum equals flagged totals
  - [x] 10.2 Write property test: Competition name uniqueness
  - [x] 10.3 Write property test: Flag state consistency
  - [x] 10.4 Write property test: Rolling balance consistency
  - [x] 10.5 Write property test: Recalculation completeness

- [x] 11. UI Polish and Accessibility
  - [x] 11.1 Add CSS styles for new components
  - [x] 11.2 Implement loading indicators
  - [x] 11.3 Add keyboard navigation support
  - [x] 11.4 Ensure ARIA labels for accessibility
  - [x] 11.5 Test responsive design

- [x] 12. Documentation and Deployment
  - [x] 12.1 Update README with new features
  - [x] 12.2 Add inline code documentation
  - [x] 12.3 Create user guide for competition management
  - [x] 12.4 Verify all tests pass
  - [x] 12.5 Deploy to production

## Task Details

### 1. Database Schema Extension and Migration

**1.1 Update database version to 2**
- Change database version from 1 to 2 in databaseManager.js
- Ensure onupgradeneeded handler is triggered

**1.2 Create competitions object store with indexes**
- Create object store with keyPath "id" and autoIncrement true
- Add unique index on "name" field
- Store structure: { id, name, createdAt }

**1.3 Add isWinning index to transactions store**
- Add non-unique index on "isWinning" field
- Enable efficient querying of flagged transactions

**1.4 Implement migration logic for existing records**
- Handle upgrade from version 1 to version 2
- Apply defaults (isWinning: false, winningCompetitionId: null) when reading old records
- Ensure no data loss during migration

**1.5 Add update() method to Database Manager**
- Accept record ID and updated record object
- Use put() to update existing record
- Return promise that resolves when update completes

**1.6 Add getByDateRange() method to Database Manager**
- Accept start date and end date parameters
- Query transactions within date range
- Return array of matching records

**1.7 Write unit tests for database migration**
- Test migration from version 1 to 2
- Test default values applied to old records
- Test new indexes created correctly

### 2. Competition Manager Component

**2.1 Implement create() with uniqueness validation**
- Validate name is non-empty
- Check for duplicate names (case-insensitive)
- Store competition with auto-generated ID
- Return created competition object

**2.2 Implement update() with uniqueness validation**
- Validate competition exists
- Check name uniqueness (excluding current competition)
- Update competition record
- Return updated competition object

**2.3 Implement delete() with transaction check**
- Call checkAssociatedTransactions()
- If count > 0, return failure with count
- Otherwise, delete competition
- Return success/failure result

**2.4 Implement getAll() method**
- Query all competitions from database
- Return array of competition objects
- Sort by name alphabetically

**2.5 Implement getById() method**
- Query competition by ID
- Return competition object or null

**2.6 Implement checkAssociatedTransactions() method**
- Query all transactions
- Count those with matching winningCompetitionId
- Return count

**2.7 Write unit tests for Competition Manager**
- Test all CRUD operations
- Test uniqueness validation
- Test deletion protection
- Test error scenarios

### 3. Competition Management UI

**3.1 Create competition manager modal/panel HTML**
- Design modal structure with header, form, and list
- Add close button
- Style with CSS

**3.2 Implement competition list rendering**
- Fetch competitions from manager
- Render table with name and action buttons
- Handle empty state

**3.3 Implement add competition form**
- Add input field and submit button
- Handle form submission
- Clear input after successful add
- Show error messages for validation failures

**3.4 Implement edit competition functionality**
- Add edit button to each row
- Show inline edit form or modal
- Validate and save changes
- Refresh list after edit

**3.5 Implement delete competition with protection**
- Add delete button to each row
- Show confirmation dialog
- Display error if competition has transactions
- Remove from list after successful delete

**3.6 Add error handling and user feedback**
- Show toast notifications for success/error
- Display inline error messages
- Provide clear user guidance

**3.7 Write integration tests for competition UI**
- Test add, edit, delete flows
- Test validation error display
- Test deletion protection

### 4. Transaction Flagger Component

**4.1 Implement flagTransaction() method**
- Validate transaction exists
- Validate transaction type is "Topup (Competitions)"
- Validate competition exists
- Update transaction with isWinning=true and competitionId
- Trigger recalculation

**4.2 Implement unflagTransaction() method**
- Validate transaction exists
- Update transaction with isWinning=false and competitionId=null
- Trigger recalculation

**4.3 Implement updateFlag() method**
- Validate transaction exists
- Validate new competition exists
- Update winningCompetitionId
- Trigger recalculation

**4.4 Implement canFlag() validation**
- Check if transaction type is "Topup (Competitions)"
- Return boolean

**4.5 Add error handling for flagging operations**
- Handle database errors
- Handle validation errors
- Revert UI state on failure

**4.6 Write unit tests for Transaction Flagger**
- Test flagging valid transactions
- Test validation errors
- Test recalculation trigger

### 5. Weekly Summarizer Modifications

**5.1 Update calculatePotComponents() to sum flagged transactions**
- Filter transactions where isWinning === true
- Sum Total field for flagged transactions
- Return winningsPaid value

**5.2 Implement recalculateFromDate() method**
- Find Monday of week containing date
- Get all records from that week forward
- Regenerate summaries
- Update Transaction Summary View

**5.3 Update weekly summary generation to use actual winnings**
- Replace placeholder zero with calculated winningsPaid
- Update Competition Pot calculation
- Maintain rolling balance consistency

**5.4 Write unit tests for winnings calculation**
- Test sum of flagged transactions
- Test zero when no flags
- Test multiple flags in same week

**5.5 Write integration tests for recalculation**
- Test recalculation after flagging
- Test rolling balances remain consistent
- Test recalculation from specific date

### 6. Transaction Flagging UI (Transformed Records View)

**6.1 Add flag control buttons to transaction rows**
- Show flag button for "Topup (Competitions)" only
- Show different button for flagged vs unflagged
- Add data attributes for record ID

**6.2 Implement competition selection modal**
- Show modal when flag button clicked
- Display list of competitions
- Handle competition selection
- Show "no competitions" message if empty

**6.3 Add visual indicators for flagged transactions**
- Add flag icon (🏆) for flagged transactions
- Show competition badge with name
- Apply background color to flagged rows

**6.4 Implement edit flag functionality**
- Show edit button for flagged transactions
- Allow changing competition or removing flag
- Update UI after changes

**6.5 Add error handling and user feedback**
- Show error messages for failed operations
- Provide loading indicators
- Confirm successful flag changes

**6.6 Write integration tests for flagging UI**
- Test flag button click flow
- Test competition selection
- Test edit and unflag operations

### 7. Weekly Drill-Down View Component

**7.1 Create drill-down modal HTML structure**
- Design overlay and modal container
- Add header with week dates and close button
- Create transaction table structure

**7.2 Implement show() method with transaction query**
- Query transactions for date range
- Enrich with competition names
- Render modal and table
- Attach event listeners

**7.3 Implement transaction table rendering**
- Display all transaction fields
- Show flag status and competition
- Format dates and currency

**7.4 Add flag controls to drill-down transactions**
- Add flag buttons for "Topup (Competitions)"
- Show edit buttons for flagged transactions
- Handle flag/unflag actions

**7.5 Implement hide() and refresh() methods**
- Hide modal on close button click
- Refresh transaction list after flag changes
- Update weekly summary after changes

**7.6 Write unit tests for drill-down view**
- Test show/hide functionality
- Test transaction rendering
- Test flag controls

### 8. Transaction Summary View Modifications

**8.1 Make weekly rows clickable**
- Add clickable-row CSS class
- Add data attributes for week dates
- Add pointer cursor on hover

**8.2 Add click handlers to open drill-down view**
- Attach onclick event to rows
- Pass week dates to drill-down view
- Open drill-down modal

**8.3 Update rendering to show actual winnings values**
- Display calculated winningsPaid instead of zero
- Update Competition Pot calculation
- Ensure currency formatting

**8.4 Add hover effects for clickable rows**
- Add CSS hover state
- Show visual feedback
- Indicate rows are interactive

**8.5 Write integration tests for drill-down interaction**
- Test row click opens drill-down
- Test drill-down shows correct transactions
- Test flag changes update summary

### 9. Integration and End-to-End Testing

**9.1 Test complete flagging workflow**
- Create competition
- Import CSV data
- Flag transaction
- Verify summary updates
- Unflag transaction
- Verify summary resets

**9.2 Test drill-down and flag from weekly view**
- Click weekly row
- Verify drill-down opens
- Flag transaction from drill-down
- Verify both views update

**9.3 Test competition deletion protection**
- Create competition
- Flag transaction with competition
- Attempt delete (should fail)
- Unflag transaction
- Delete competition (should succeed)

**9.4 Test retrospective flagging and recalculation**
- Import multiple weeks of data
- Flag transaction in early week
- Verify all subsequent weeks recalculated
- Verify rolling balances consistent

**9.5 Test error scenarios and recovery**
- Test invalid competition ID
- Test database errors
- Test concurrent modifications
- Verify error messages and recovery

### 10. Property-Based Testing

**10.1 Write property test: Winnings sum equals flagged totals**
- Generate random transactions with some flagged
- Calculate expected sum of flagged totals
- Verify Weekly Summarizer produces same sum
- **Validates: Requirements 4.1, 4.2**

**10.2 Write property test: Competition name uniqueness**
- Generate random competition names
- Attempt to create duplicates
- Verify system rejects duplicates
- **Validates: Requirements 1.2, 1.3**

**10.3 Write property test: Flag state consistency**
- Generate random transactions
- Set isWinning=false on some
- Verify winningCompetitionId is null for all unflagged
- **Validates: Requirements 3.2, 3.3**

**10.4 Write property test: Rolling balance consistency**
- Generate random transactions and flag some
- Calculate weekly summaries
- Verify each week's starting pot equals previous week's final pot
- **Validates: Requirements 4.3, 4.5**

**10.5 Write property test: Recalculation completeness**
- Generate multiple weeks of transactions
- Flag transaction in random week
- Verify all weeks from flagged week onward are recalculated
- **Validates: Requirements 4.5, 8.2, 8.3**

### 11. UI Polish and Accessibility

**11.1 Add CSS styles for new components**
- Style competition manager modal
- Style flag buttons and indicators
- Style drill-down modal
- Ensure consistent design language

**11.2 Implement loading indicators**
- Show spinner during database operations
- Show loading state in modals
- Provide feedback for async operations

**11.3 Add keyboard navigation support**
- Enable tab navigation through forms
- Add keyboard shortcuts for common actions
- Support Escape key to close modals

**11.4 Ensure ARIA labels for accessibility**
- Add aria-label to buttons
- Add role attributes to modals
- Ensure screen reader compatibility

**11.5 Test responsive design**
- Test on mobile devices
- Test on tablets
- Ensure modals work on small screens

### 12. Documentation and Deployment

**12.1 Update README with new features**
- Document competition management
- Document transaction flagging
- Add screenshots or GIFs

**12.2 Add inline code documentation**
- Add JSDoc comments to functions
- Document component interfaces
- Explain complex logic

**12.3 Create user guide for competition management**
- Write step-by-step instructions
- Explain flagging workflow
- Provide troubleshooting tips

**12.4 Verify all tests pass**
- Run unit tests
- Run integration tests
- Run property-based tests
- Fix any failures

**12.5 Deploy to production**
- Build production bundle
- Test in staging environment
- Deploy to production
- Monitor for errors

## Dependencies

- Task 2 depends on Task 1 (Database schema must exist before Competition Manager)
- Task 3 depends on Task 2 (UI needs Competition Manager component)
- Task 4 depends on Task 1 (Transaction Flagger needs database schema)
- Task 5 depends on Task 4 (Weekly Summarizer needs Transaction Flagger)
- Task 6 depends on Tasks 2, 4 (Flagging UI needs both components)
- Task 7 depends on Tasks 2, 4 (Drill-down needs both components)
- Task 8 depends on Task 7 (Summary view needs drill-down component)
- Task 9 depends on Tasks 1-8 (Integration tests need all components)
- Task 10 depends on Tasks 1-8 (Property tests need all components)
- Task 11 can be done in parallel with other tasks
- Task 12 depends on all previous tasks

## Testing Framework

- Unit tests: Jest
- Integration tests: Jest with jsdom
- Property-based tests: fast-check
- Test files: Co-located with source files using `.test.js` suffix

## Estimated Effort

- Task 1: 4 hours
- Task 2: 3 hours
- Task 3: 4 hours
- Task 4: 3 hours
- Task 5: 3 hours
- Task 6: 4 hours
- Task 7: 4 hours
- Task 8: 2 hours
- Task 9: 4 hours
- Task 10: 4 hours
- Task 11: 3 hours
- Task 12: 2 hours

**Total: ~40 hours**
