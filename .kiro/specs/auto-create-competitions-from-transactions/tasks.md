# Implementation Plan: Auto-Create Competitions from Transactions

## Overview

This implementation plan breaks down the feature into discrete coding tasks that build incrementally. The order follows the design document's recommended implementation sequence: database migration, backend API extensions, frontend components, workflow integration, season management UI, and testing. Each task references specific requirements and includes property-based tests as optional sub-tasks to validate correctness properties.

## Tasks

- [x] 1. Database migration for all_competitions_added field
  - [x] 1.1 Create migration file to add all_competitions_added column
    - Create `backend/src/migrations/005_add_all_competitions_added.sql`
    - Add column with `BOOLEAN NOT NULL DEFAULT false`
    - Create index on the new column for filtering performance
    - _Requirements: 2.5, 5.1, 5.2_
  
  - [x] 1.2 Create rollback migration file
    - Create `backend/src/migrations/005_add_all_competitions_added.rollback.sql`
    - Drop index and column
    - _Requirements: 5.2_
  
  - [x] 1.3 Update TypeScript interfaces for PresentationSeason
    - Modify `backend/src/types/index.ts` to add `allCompetitionsAdded: boolean` field
    - Update `UpdateSeasonDTO` interface to include optional `allCompetitionsAdded` field
    - _Requirements: 5.2_

- [x] 2. Backend API extensions for season filtering and updates
  - [x] 2.1 Extend GET /api/presentation-seasons endpoint with filtering
    - Modify `backend/src/routes/presentation-season.routes.ts` to accept `allCompetitionsAdded` query parameter
    - Update service layer to filter seasons by `allCompetitionsAdded` status
    - Return filtered season list with all fields including the new flag
    - _Requirements: 2.5, 5.4_
  
  - [x] 2.2 Extend PATCH /api/presentation-seasons/:id endpoint
    - Modify `backend/src/routes/presentation-season.routes.ts` to accept `allCompetitionsAdded` in request body
    - Update service layer to persist the flag change to database
    - Return updated season record
    - _Requirements: 5.2, 5.5, 5.6_
  
  - [x] 2.3 Write unit tests for season filtering endpoint
    - Test filtering by allCompetitionsAdded=true returns only matching seasons
    - Test filtering by allCompetitionsAdded=false returns only matching seasons
    - Test no filter parameter returns all seasons
    - _Requirements: 2.5, 5.4_
  
  - [x] 2.4 Write unit tests for season update endpoint
    - Test updating allCompetitionsAdded from false to true
    - Test updating allCompetitionsAdded from true to false
    - Test validation errors for invalid season IDs
    - _Requirements: 5.2, 5.5, 5.6_

- [x] 3. Implement CompetitionDetector component
  - [x] 3.1 Create CompetitionDetector class with detection logic
    - Create `frontend/competitionDetector.js`
    - Implement constructor accepting apiClient
    - Implement `extractCompetitionNames(records)` method to extract unique names from Sale/Refund records
    - Implement `detectNewCompetitions(records)` method to query API and filter out existing competitions
    - _Requirements: 1.1, 1.2, 1.3, 1.5_
  
  - [x] 3.2 Write property test for competition name extraction
    - **Property 1: Competition Name Extraction from Sales and Refunds**
    - **Validates: Requirements 1.1, 1.5**
    - Generate random transaction records with various types
    - Verify only Sale/Refund records with non-empty competition fields are extracted
    - Verify duplicate names are deduplicated
    - _Requirements: 1.1, 1.5_
  
  - [x] 3.3 Write property test for new competition detection
    - **Property 2: New Competition Detection**
    - **Validates: Requirements 1.2, 1.3**
    - Generate random competition names and database states
    - Verify detector returns exactly those names not in database
    - _Requirements: 1.2, 1.3_
  
  - [x] 3.4 Write unit tests for edge cases
    - Test empty transaction list returns empty array
    - Test transactions with null/empty competition fields are excluded
    - Test only Sale and Refund types are processed
    - Test API failure handling
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 4. Implement CompetitionCreationDialog component
  - [x] 4.1 Create CompetitionCreationDialog class with UI rendering
    - Create `frontend/competitionCreationDialog.js`
    - Implement constructor accepting apiClient
    - Implement `show(competitionName)` method that creates and displays modal
    - Render form with pre-populated name field, date picker, type selector, season dropdown
    - Add submit and cancel buttons
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 4.2 Implement season loading with filtering
    - In `show()` method, fetch seasons with `allCompetitionsAdded=false` filter
    - Populate season dropdown with filtered results
    - Handle API errors gracefully
    - _Requirements: 2.5, 5.4_
  
  - [x] 4.3 Implement form validation
    - Validate all required fields (name, date, type, seasonId) are present
    - Display validation errors inline
    - Prevent submission with missing fields
    - _Requirements: 2.3, 2.4, 2.5_
  
  - [x] 4.4 Implement competition creation submission
    - On submit, call POST /api/competitions with form data
    - Handle success by resolving promise with created competition
    - Handle duplicate name error with retry option
    - Handle season validation error with season reload
    - Handle network/database errors with retry option
    - _Requirements: 3.1, 3.4, 3.5, 3.6_
  
  - [x] 4.5 Implement cancellation handling
    - On cancel button click, close dialog and resolve promise with null
    - Implement `close()` method to cleanup DOM and event listeners
    - _Requirements: 2.7, 2.8_
  
  - [x] 4.6 Write property test for dialog pre-population (OPTIONAL)
    - **Property 3: Dialog Pre-population**
    - **Validates: Requirements 2.2**
    - Generate random competition names
    - Verify dialog name field contains exact input name
    - _Requirements: 2.2_
  
  - [ ]* 4.7 Write property test for required field validation (OPTIONAL)
    - **Property 4: Required Field Validation**
    - **Validates: Requirements 2.3, 2.4, 2.5**
    - Generate competition data with missing fields
    - Verify system rejects submissions with missing date, type, or seasonId
    - _Requirements: 2.3, 2.4, 2.5_
  
  - [ ]* 4.8 Write property test for season filtering (OPTIONAL)
    - **Property 5: Season Filtering**
    - **Validates: Requirements 2.5, 5.4**
    - Generate seasons with various allCompetitionsAdded values
    - Verify seasons with allCompetitionsAdded=true don't appear in dropdown
    - _Requirements: 2.5, 5.4_
  
  - [x] 4.9 Write unit tests for dialog functionality (OPTIONAL)
    - Test dialog renders with correct structure
    - Test cancel returns null
    - Test duplicate name error displays and allows retry
    - Test season validation error displays and reloads seasons
    - Test keyboard navigation (Tab, Escape)
    - _Requirements: 2.1, 2.2, 2.7, 2.8, 3.4, 3.5, 3.6_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Integrate detection and creation into app.js workflow
  - [x] 6.1 Modify handleSaveToDatabase() to add detection step
    - Import CompetitionDetector
    - After field extraction, instantiate detector and call `detectNewCompetitions(enhancedRecords)`
    - Store list of new competition names
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 6.2 Implement sequential competition creation flow
    - Create helper function `showCompetitionCreationFlow(newCompetitionNames)`
    - Loop through new competition names sequentially
    - For each name, instantiate CompetitionCreationDialog and call `show(name)`
    - Await each dialog completion before showing next
    - If any dialog returns null (cancelled), return null to abort
    - Return array of created competitions on success
    - _Requirements: 2.6, 3.2_
  
  - [x] 6.3 Handle creation flow result in handleSaveToDatabase()
    - If creation flow returns null, display "Import cancelled" message and abort
    - If creation flow succeeds, continue with existing chronological validation
    - Preserve all existing validation steps (chronological, duplicates)
    - _Requirements: 2.8, 4.4, 6.2, 6.3, 6.4_
  
  - [x] 6.4 Update success message to include competition count
    - Modify success message to show "Imported X transactions and created Y competitions"
    - _Requirements: 4.5_
  
  - [ ]* 6.5 Write property test for sequential dialog presentation
    - **Property 6: Sequential Dialog Presentation**
    - **Validates: Requirements 2.6**
    - Generate lists of N new competition names (N > 1)
    - Verify system presents exactly N dialogs in sequence
    - _Requirements: 2.6_
  
  - [ ]* 6.6 Write property test for competition creation round-trip
    - **Property 7: Competition Creation Round-Trip**
    - **Validates: Requirements 3.1**
    - Generate valid competition data
    - Verify database record matches submitted field values
    - _Requirements: 3.1_
  
  - [ ]* 6.7 Write property test for sequential creation workflow
    - **Property 8: Sequential Creation Workflow**
    - **Validates: Requirements 3.2**
    - Generate list of new competitions
    - Verify after creating competition i, dialog for i+1 is shown
    - _Requirements: 3.2_
  
  - [ ]* 6.8 Write property test for season validation on creation
    - **Property 9: Season Validation on Creation**
    - **Validates: Requirements 3.5**
    - Generate competition data with seasonId where allCompetitionsAdded=true
    - Verify system rejects the creation
    - _Requirements: 3.5_
  
  - [ ]* 6.9 Write property test for existing validation preservation
    - **Property 11: Existing Validation Preservation**
    - **Validates: Requirements 4.4, 6.2, 6.3, 6.4**
    - Generate transaction imports with various validation issues
    - Verify chronological validation and duplicate checking still work
    - _Requirements: 4.4, 6.2, 6.3, 6.4_
  
  - [ ]* 6.10 Write property test for success message accuracy
    - **Property 12: Success Message Accuracy**
    - **Validates: Requirements 4.5**
    - Generate successful imports with various transaction and competition counts
    - Verify message counts match actual imported/created counts
    - _Requirements: 4.5_

- [x] 7. Implement season management UI in competitionManagerUI.js
  - [x] 7.1 Add season management section to Manage Competitions view
    - Create HTML structure for seasons table with columns: Season Name, Status, All Competitions Added
    - Add table to existing Manage Competitions view
    - _Requirements: 5.1, 5.3_
  
  - [x] 7.2 Implement renderSeasons() method
    - Fetch all presentation seasons via GET /api/presentation-seasons
    - Populate seasons table with season data
    - Render toggle control for allCompetitionsAdded flag
    - Display current flag status for each season
    - _Requirements: 5.1, 5.3_
  
  - [x] 7.3 Implement handleToggleAllCompetitionsAdded() method
    - On toggle change, call PATCH /api/presentation-seasons/:id with new flag value
    - Update UI immediately on success
    - Handle errors by reverting toggle and displaying error message
    - _Requirements: 5.2, 5.5, 5.6_
  
  - [x] 7.4 Wire season management into existing view initialization
    - Call renderSeasons() when Manage Competitions view loads
    - Ensure season list refreshes after season updates
    - _Requirements: 5.1_
  
  - [ ]* 7.5 Write property test for season flag toggle round-trip
    - **Property 13: Season Flag Toggle Round-Trip**
    - **Validates: Requirements 5.2, 5.5, 5.6**
    - Generate presentation seasons
    - Toggle allCompetitionsAdded flag
    - Verify database updated and query returns new value
    - _Requirements: 5.2, 5.5, 5.6_
  
  - [ ]* 7.6 Write property test for season flag display consistency
    - **Property 14: Season Flag Display Consistency**
    - **Validates: Requirements 5.3**
    - Generate presentation seasons with various flag values
    - Verify displayed status matches database value
    - _Requirements: 5.3_
  
  - [ ]* 7.7 Write unit tests for season management UI
    - Test seasons table renders correctly
    - Test toggle updates database
    - Test toggle state persists across page refreshes
    - Test error handling reverts toggle state
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Write integration tests for complete workflows
  - [ ]* 9.1 Write integration test for import with new competitions
    - Upload CSV with transactions referencing 2 new competitions
    - Verify detection identifies both competitions
    - Complete both creation dialogs
    - Verify competitions created in database
    - Verify transactions saved and linked correctly
    - Verify summary view displays
    - _Requirements: 1.1, 1.2, 2.1, 3.1, 4.1, 4.2_
  
  - [ ]* 9.2 Write integration test for import with existing competitions
    - Pre-create competitions in database
    - Upload CSV with transactions referencing only existing competitions
    - Verify no dialogs shown
    - Verify transactions saved and linked correctly
    - Verify summary view displays
    - _Requirements: 1.4, 6.1_
  
  - [ ]* 9.3 Write integration test for import cancellation
    - Upload CSV with transactions referencing new competition
    - Cancel the creation dialog
    - Verify no competitions created
    - Verify no transactions saved
    - Verify appropriate message displayed
    - _Requirements: 2.7, 2.8_
  
  - [ ]* 9.4 Write integration test for season management workflow
    - Create season with allCompetitionsAdded=false
    - Toggle to true
    - Verify database updated
    - Start import with new competition
    - Verify season doesn't appear in dropdown
    - Toggle back to false
    - Verify season appears in dropdown
    - _Requirements: 5.2, 5.4, 5.5, 5.6_
  
  - [ ]* 9.5 Write integration test for duplicate name handling
    - Upload CSV with new competition
    - In dialog, change name to existing competition
    - Submit and verify error message
    - Change to unique name
    - Verify successful creation
    - _Requirements: 3.4_
  
  - [ ]* 9.6 Write property test for transaction-competition linking
    - **Property 10: Transaction-Competition Linking**
    - **Validates: Requirements 4.2**
    - Generate transaction records with competition names
    - After import, query transactions
    - Verify each transaction linked to competition with matching name
    - _Requirements: 4.2_

- [ ] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at reasonable breaks
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Integration tests validate complete end-to-end workflows
- The implementation order follows the design document's recommended sequence
- All existing import workflow functionality is preserved (chronological validation, duplicate checking)
- Database migration must be run before backend changes
- Backend API changes must be deployed before frontend changes
- Frontend components can be developed and tested independently before integration
