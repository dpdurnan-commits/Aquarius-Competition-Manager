# Implementation Plan: Competition Finished Status

## Overview

This implementation adds a "finished" status to competitions, allowing them to be marked as complete and filtered from active workflows. The implementation follows a three-layer approach: database migration, backend service updates, and frontend UI enhancements.

## Tasks

- [x] 1. Create database migration for finished column
  - Create migration file `011_add_finished_to_competitions.sql`
  - Add `finished` boolean column with default value false
  - Create index on finished column for efficient filtering
  - Create rollback migration file `011_add_finished_to_competitions.rollback.sql`
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Update backend Competition type definitions
  - [x] 2.1 Add finished field to Competition interface in types
    - Add `finished: boolean` to Competition interface
    - Add `finished?: boolean` to UpdateCompetitionDTO interface
    - Add `finished?: boolean` to GetCompetitionsOptions interface
    - _Requirements: 5.1, 5.2_

  - [ ]* 2.2 Write property test for default finished status
    - **Property 1: Default Finished Status**
    - **Validates: Requirements 1.1, 1.2**

- [x] 3. Update CompetitionService for finished status support
  - [x] 3.1 Modify getAllCompetitions to support finished filter
    - Update SQL query to include finished column in SELECT
    - Add WHERE clause when finished filter is provided
    - Ensure backward compatibility when filter is omitted
    - _Requirements: 5.3, 6.4_

  - [x] 3.2 Modify getCompetitionById to include finished status
    - Update SQL query to include finished column in SELECT
    - _Requirements: 5.1_

  - [x] 3.3 Modify updateCompetition to support finished updates
    - Add finished field to dynamic update query builder
    - Validate finished is boolean if provided
    - _Requirements: 2.2, 3.2_

  - [x] 3.4 Modify createCompetition to include finished in response
    - Update SQL query to include finished column in RETURNING clause
    - _Requirements: 1.2_

  - [ ]* 3.5 Write property test for finished status persistence
    - **Property 2: Finished Status Persistence**
    - **Validates: Requirements 1.3**

  - [ ]* 3.6 Write property test for finished status toggle round-trip
    - **Property 3: Finished Status Toggle Round-Trip**
    - **Validates: Requirements 2.2, 3.2**

  - [ ]* 3.7 Write property test for association preservation
    - **Property 4: Association Preservation When Marking Finished**
    - **Validates: Requirements 2.3, 2.4**

  - [ ]* 3.8 Write property test for filtering by finished status
    - **Property 9: Filtering by Finished Status**
    - **Validates: Requirements 5.3**

  - [ ]* 3.9 Write property test for competition record preservation
    - **Property 10: Competition Record Preserved When Finished**
    - **Validates: Requirements 6.1**

  - [x] 3.10 Write unit tests for CompetitionService finished status
    - Test updating finished status with valid boolean values
    - Test updating finished status with invalid values throws error
    - Test filtering returns correct subsets
    - Test error handling for competition not found
    - _Requirements: 2.2, 3.2, 5.3_

- [x] 4. Checkpoint - Ensure backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update API routes to support finished parameter
  - [x] 5.1 Modify GET /api/competitions endpoint
    - Parse finished query parameter from request
    - Pass finished filter to CompetitionService.getAllCompetitions
    - _Requirements: 5.3_

  - [x] 5.2 Modify PATCH /api/competitions/:id endpoint
    - Accept finished field in request body
    - Pass finished to CompetitionService.updateCompetition
    - _Requirements: 2.2, 3.2_

  - [x] 5.3 Write integration tests for API routes
    - Test GET with finished=true returns only finished competitions
    - Test GET with finished=false returns only unfinished competitions
    - Test PATCH updates finished status correctly
    - _Requirements: 2.2, 3.2, 5.3_

- [ ] 6. Update frontend CompetitionManager
  - [x] 6.1 Modify getAll method to accept options parameter
    - Add optional options parameter with finished filter
    - Pass finished parameter to API client as query string
    - Ensure backward compatibility when options omitted
    - _Requirements: 5.2, 5.3_

  - [x] 6.2 Add updateFinishedStatus method
    - Create method that calls apiClient.updateCompetition with finished field
    - Accept competitionId and finished boolean parameters
    - Return updated competition object
    - _Requirements: 2.1, 3.1_

  - [x] 6.3 Update competition data structure to include finished
    - Ensure finished property is included in transformed competition objects
    - _Requirements: 5.2_

  - [ ]* 6.4 Write property test for finished status in response
    - **Property 8: Finished Status in Response**
    - **Validates: Requirements 5.1, 5.2**

  - [x] 6.5 Write unit tests for CompetitionManager finished methods
    - Test updateFinishedStatus calls correct API endpoint
    - Test getAll with finished filter passes correct parameters
    - Test error handling for failed API calls
    - _Requirements: 2.1, 3.1, 5.3_

- [x] 7. Update frontend CompetitionList for selector filtering
  - [x] 7.1 Modify loadCompetitions to filter unfinished competitions
    - Pass { finished: false } to apiClient.getAllCompetitions
    - Maintain existing seasonId filtering logic
    - _Requirements: 4.1_

  - [ ]* 7.2 Write property test for selector excludes finished
    - **Property 6: Selector Excludes Finished Competitions**
    - **Validates: Requirements 4.1**

  - [ ]* 7.3 Write property test for alphabetical sorting
    - **Property 7: Active Competitions Alphabetically Sorted**
    - **Validates: Requirements 4.2**

  - [x] 7.4 Write unit tests for CompetitionList filtering
    - Test loadCompetitions excludes finished competitions
    - Test empty state when no active competitions exist
    - _Requirements: 4.1, 4.3_

- [x] 8. Update frontend CompetitionManagerUI for toggle and actions
  - [x] 8.1 Add showFinished state property
    - Initialize showFinished to false in constructor
    - _Requirements: 8.1, 8.7_

  - [x] 8.2 Create toggle control UI element
    - Add radio buttons or toggle switch for Active/Finished view
    - Wire toggle to handleViewToggle method
    - _Requirements: 7.3, 8.2_

  - [x] 8.3 Implement handleViewToggle method
    - Update showFinished state based on toggle selection
    - Call competitionManager.getAll with appropriate finished filter
    - Refresh competition list display
    - Persist toggle state to session storage
    - _Requirements: 8.3, 8.4, 8.7_

  - [x] 8.4 Implement handleMarkFinished method
    - Call competitionManager.updateFinishedStatus with finished=true
    - Show success/error message to user
    - Refresh competition list
    - _Requirements: 2.1, 8.6_

  - [x] 8.5 Implement handleUnmarkFinished method
    - Call competitionManager.updateFinishedStatus with finished=false
    - Show success/error message to user
    - Refresh competition list
    - _Requirements: 3.1, 8.5_

  - [x] 8.6 Modify renderCompetitions to show context-sensitive buttons
    - Show "Mark as Finished" button for active competitions
    - Show "Unmark as Finished" button for finished competitions
    - Wire buttons to appropriate handler methods
    - _Requirements: 7.1, 7.2, 8.5, 8.6_

  - [x] 8.7 Add visual indicator for finished status
    - Display finished status in competition list
    - Distinguish finished from active competitions visually
    - _Requirements: 7.1, 7.2_

  - [ ]* 8.8 Write property test for UI toggle state persistence
    - **Property 12: UI Toggle State Persistence**
    - **Validates: Requirements 8.7**

  - [x] 8.9 Write unit tests for CompetitionManagerUI
    - Test toggle control switches between views
    - Test Mark as Finished button calls correct method
    - Test Unmark as Finished button calls correct method
    - Test default view shows only unfinished competitions
    - Test loading states during async operations
    - _Requirements: 7.3, 8.1, 8.2, 8.5, 8.6_

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Integration and verification
  - [x] 10.1 Verify end-to-end workflow
    - Test creating competition defaults to finished=false
    - Test marking competition as finished updates UI
    - Test finished competition excluded from selector
    - Test unmarking competition restores to active view
    - _Requirements: 1.2, 2.2, 3.2, 4.1_

  - [x] 10.2 Write integration tests for complete workflow
    - Test create → mark finished → verify excluded from selector
    - Test create with results → mark finished → verify results preserved
    - Test toggle between active/finished views
    - _Requirements: 2.3, 2.4, 4.1, 8.3, 8.4_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Backend uses TypeScript, frontend uses JavaScript
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Migration must be run before backend changes are deployed
