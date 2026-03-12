# Implementation Plan: Competition Results Management

## Overview

This implementation plan breaks down the Competition Results Management feature into discrete coding tasks. The feature extends the Aquarius Golf Competition Account Manager with presentation season management, competition results tracking, CSV upload capabilities, and automatic swindle money integration.

The implementation follows a layered approach: database schema → backend services → API routes → frontend components → integration → testing. Each task builds incrementally to ensure working functionality at every step.

## Tasks

- [x] 1. Database schema and migrations
  - [x] 1.1 Create presentation_seasons table migration
    - Create migration file `backend/src/db/migrations/003_create_presentation_seasons.sql`
    - Define table with columns: id, name, start_year, end_year, is_active, created_at, updated_at
    - Add CHECK constraint for name format validation (regex: `^Season: Winter [0-9]{2}-Summer [0-9]{2}$`)
    - Add CHECK constraint for year ordering (start_year <= end_year)
    - Add UNIQUE constraint on name
    - Create unique partial index for is_active (only one active season)
    - Create index on (start_year, end_year) for chronological ordering
    - Add trigger for updated_at timestamp
    - _Requirements: 1.1, 1.2, 1.8, 10.1, 10.8_

  - [x] 1.2 Create competitions table extension migration
    - Create migration file `backend/src/db/migrations/004_extend_competitions.sql`
    - Add season_id column with foreign key to presentation_seasons(id) ON DELETE RESTRICT
    - Add type column with CHECK constraint (type IN ('singles', 'doubles'))
    - Set default type='singles' for backward compatibility
    - Create index on season_id for filtering
    - Create index on type for filtering
    - Create composite index on (season_id, date) for season-filtered queries
    - _Requirements: 2.4, 2.8, 10.2, 10.4_

  - [x] 1.3 Create competition_results table migration
    - Create migration file `backend/src/db/migrations/005_create_competition_results.sql`
    - Define table with columns: id, competition_id, finishing_position, player_name, gross_score, handicap, nett_score, entry_paid, swindle_money_paid, created_at, updated_at
    - Add foreign key competition_id REFERENCES competitions(id) ON DELETE CASCADE
    - Add CHECK constraint for finishing_position > 0
    - Add CHECK constraint for swindle_money_paid >= 0
    - Create index on competition_id for result lookups
    - Create index on player_name for name matching queries
    - Create partial index on (competition_id, swindle_money_paid) WHERE swindle_money_paid = 0 for unpaid results
    - Create composite index on (competition_id, finishing_position) for position ordering
    - Add trigger for updated_at timestamp
    - _Requirements: 4.6, 4.7, 10.3, 10.5, 10.6, 10.9_

  - [x] 1.4 Create database migration runner
    - Update backend/src/db/index.ts to run migrations on startup
    - Implement migration tracking table (schema_migrations)
    - Add rollback SQL for each migration
    - Test migrations in development environment
    - _Requirements: 10.10_

- [x] 2. Backend TypeScript type definitions
  - [x] 2.1 Create presentation season types
    - Create/update backend/src/types/index.ts
    - Define PresentationSeason interface
    - Define CreateSeasonDTO interface
    - Define UpdateSeasonDTO interface
    - Export all types
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 2.2 Create competition result types
    - Update backend/src/types/index.ts
    - Define CompetitionResult interface
    - Define CreateResultDTO interface
    - Define UpdateResultDTO interface
    - Define BulkResultResponse interface
    - Define ResultError interface
    - Export all types
    - _Requirements: 4.1, 4.2, 4.3, 8.1, 8.2, 8.3_

  - [x] 2.3 Create CSV parsing types
    - Update backend/src/types/index.ts
    - Define SinglesRow interface
    - Define DoublesRow interface
    - Define ParsedResult<T> interface
    - Define ParseError interface
    - Export all types
    - _Requirements: 5.1, 6.1, 12.1, 12.4_

  - [x] 2.4 Extend existing Competition type
    - Update Competition interface in backend/src/types/index.ts
    - Add seasonId: number field
    - Add type: 'singles' | 'doubles' field
    - Update CreateCompetitionDTO to include seasonId and type
    - Update UpdateCompetitionDTO to include optional seasonId and type
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [-] 3. Backend services - Presentation Season Management
  - [x] 3.1 Implement PresentationSeasonService
    - Create backend/src/services/presentationSeason.service.ts
    - Implement createSeason(dto: CreateSeasonDTO): Promise<PresentationSeason>
    - Implement getAllSeasons(): Promise<PresentationSeason[]> with chronological ordering
    - Implement getActiveSeason(): Promise<PresentationSeason | null>
    - Implement setActiveSeason(id: number): Promise<PresentationSeason> with transaction to deactivate others
    - Implement autoIncrementSeason(): Promise<PresentationSeason> to create next season
    - Implement updateSeason(id: number, updates: UpdateSeasonDTO): Promise<PresentationSeason>
    - Implement deleteSeason(id: number): Promise<void> with referential integrity check
    - Use DatabaseService for all queries
    - Add proper error handling and validation
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 10.10_

  - [x] 3.2 Write property tests for PresentationSeasonService
    - **Property 1: Season format validation**
    - **Validates: Requirements 1.2**
    - Create backend/src/services/presentationSeason.service.pbt.test.ts
    - Test that invalid season formats are rejected
    - Test that valid season formats are accepted
    - Use fast-check to generate season names
    - Minimum 100 iterations

  - [x] 3.3 Write property tests for season auto-increment
    - **Property 2: Auto-increment transformation**
    - **Validates: Requirements 1.5**
    - Test that auto-increment correctly increments both years by 1
    - Use fast-check to generate starting seasons
    - Verify format preservation
    - Minimum 100 iterations

  - [x] 3.4 Write property tests for active season uniqueness
    - **Property 4: Active season uniqueness**
    - **Validates: Requirements 1.7**
    - Test that setting a season as active deactivates all others
    - Verify exactly one active season at all times
    - Use fast-check to generate multiple seasons
    - Minimum 100 iterations

  - [x] 3.5 Write unit tests for PresentationSeasonService
    - Create backend/src/services/presentationSeason.service.test.ts
    - Test createSeason with valid data succeeds
    - Test createSeason with invalid format fails
    - Test getAllSeasons returns chronologically ordered list
    - Test setActiveSeason deactivates previous active
    - Test autoIncrementSeason creates correct next season
    - Test deleteSeason fails when competitions exist

- [x] 4. Backend services - Competition Results
  - [x] 4.1 Extend CompetitionService for season association
    - Update backend/src/services/competition.service.ts
    - Modify createCompetition to require seasonId and type
    - Add validation for seasonId existence (foreign key check)
    - Add validation for type ('singles' or 'doubles')
    - Modify getCompetitions to support optional seasonId filter
    - Update queries to include season_id and type fields
    - Ensure chronological ordering by date within season
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.8, 3.4, 3.5_

  - [x] 4.2 Write property tests for competition type constraint
    - **Property 6: Type constraint validation**
    - **Validates: Requirements 2.3, 10.7**
    - Create/update backend/src/services/competition.service.pbt.test.ts
    - Test that only 'singles' and 'doubles' are accepted
    - Test that invalid types are rejected
    - Use fast-check to generate competition data
    - Minimum 100 iterations

  - [x] 4.3 Write property tests for referential integrity
    - **Property 8: Referential integrity invariant**
    - **Validates: Requirements 2.8, 2.9, 10.4, 10.5**
    - Test that competitions cannot reference non-existent seasons
    - Test that results cannot reference non-existent competitions
    - Use fast-check to generate IDs
    - Minimum 100 iterations

  - [x] 4.4 Implement CompetitionResultService
    - Create backend/src/services/competitionResult.service.ts
    - Implement addResult(dto: CreateResultDTO): Promise<CompetitionResult>
    - Implement bulkAddResults(results: CreateResultDTO[]): Promise<BulkResultResponse> with transaction
    - Implement updateResult(id: number, updates: UpdateResultDTO): Promise<CompetitionResult>
    - Implement deleteResult(id: number): Promise<void>
    - Implement getResultsByCompetition(competitionId: number): Promise<CompetitionResult[]> ordered by position
    - Add validation for required fields (finishing_position, player_name)
    - Add validation for positive finishing_position
    - Add validation for non-negative swindle_money_paid
    - Use DatabaseService with transaction support
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 4.7, 8.1, 8.2, 8.5, 8.6, 8.9, 8.10, 10.10_

  - [x] 4.5 Write property tests for result required fields
    - **Property 12: Required fields invariant**
    - **Validates: Requirements 4.6**
    - Create backend/src/services/competitionResult.service.pbt.test.ts
    - Test that finishing_position must be positive integer
    - Test that player_name must be non-empty
    - Use fast-check to generate result data
    - Minimum 100 iterations

  - [x] 4.6 Write property tests for transaction atomicity
    - **Property 34: Database transaction atomicity**
    - **Validates: Requirements 10.10, 12.3**
    - Test that bulkAddResults either commits all or rolls back all
    - Simulate errors during bulk operations
    - Verify no partial updates in database
    - Minimum 100 iterations

  - [x] 4.7 Write unit tests for CompetitionResultService
    - Create backend/src/services/competitionResult.service.test.ts
    - Test addResult with valid data succeeds
    - Test addResult with missing required field fails
    - Test addResult with invalid position fails
    - Test updateResult updates only specified fields
    - Test bulkAddResults processes all results in transaction
    - Test getResultsByCompetition returns ordered by position

- [x] 5. Backend services - CSV Parsing
  - [x] 5.1 Implement CSVParserService for singles competitions
    - Create backend/src/services/csvParser.service.ts
    - Implement parseSinglesCSV(csvContent: string): Promise<ParsedResult<SinglesRow>>
    - Validate required columns: Pos, Name, Gross, Hcp, Nett
    - Skip rows with empty names or whitespace-only names
    - Skip rows matching pattern "Division [0-9]+"
    - Trim whitespace from all field values
    - Map CSV columns to CreateResultDTO fields
    - Return errors with row number and field name for invalid data
    - Use papaparse library for CSV parsing
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11_

  - [x] 5.2 Implement CSVParserService for doubles competitions
    - Update backend/src/services/csvParser.service.ts
    - Implement parseDoublesCSV(csvContent: string): Promise<ParsedResult<DoublesRow>>
    - Validate required columns: Pos, Name, Nett
    - Split Name field on "/" character into two player names
    - Trim whitespace from each split name
    - Create two CreateResultDTO records per row with same position and nett score
    - Skip rows with empty names or whitespace-only names
    - Skip rows matching pattern "Division [0-9]+"
    - Return error if Name field doesn't contain "/"
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10_

  - [x] 5.3 Write property tests for singles CSV round-trip
    - **Property 21: Singles CSV round-trip**
    - **Validates: Requirements 5.12, 7.2**
    - Create backend/src/services/csvParser.service.pbt.test.ts
    - Test that parse(format(parse(csv))) produces equivalent results
    - Use fast-check to generate valid singles CSV data
    - Verify all fields preserved through round-trip
    - Minimum 100 iterations

  - [x] 5.4 Write property tests for doubles name splitting
    - **Property 22: Doubles name splitting**
    - **Validates: Requirements 6.3, 6.4**
    - Test that names with "/" split into exactly 2 non-empty names
    - Test whitespace trimming on split names
    - Use fast-check to generate names with "/"
    - Minimum 100 iterations

  - [x] 5.5 Write property tests for doubles CSV round-trip
    - **Property 25: Doubles CSV round-trip**
    - **Validates: Requirements 6.11, 7.3**
    - Test that parse(format(parse(csv))) produces equivalent results
    - Test that formatting combines pairs by position
    - Use fast-check to generate valid doubles CSV data
    - Minimum 100 iterations

  - [x] 5.6 Write unit tests for CSVParserService
    - Create backend/src/services/csvParser.service.test.ts
    - Test parseSinglesCSV with valid data succeeds
    - Test parseSinglesCSV with missing column fails
    - Test parseDoublesCSV with "/" separator succeeds
    - Test parseDoublesCSV without "/" fails
    - Test skipping empty name rows
    - Test skipping division header rows
    - Test whitespace trimming
    - Test error messages include row and field info

  - [x] 5.7 Implement CSVFormatterService
    - Create backend/src/services/csvFormatter.service.ts
    - Implement formatSinglesResults(results: CompetitionResult[]): string
    - Implement formatDoublesResults(results: CompetitionResult[]): string
    - For doubles, group results by position and combine names with " / "
    - Include appropriate columns based on competition type
    - Use papaparse for CSV generation
    - _Requirements: 7.4, 7.5, 7.6_

- [x] 6. Backend services - Name Matching and Swindle Money
  - [x] 6.1 Implement NameMatchingService
    - Create backend/src/services/nameMatching.service.ts
    - Implement findMatchingResult(playerName: string): Promise<CompetitionResult | null>
    - Implement normalizeName(name: string): string for case-insensitive comparison
    - Implement matchesVariation(name1: string, name2: string): boolean for initial + surname matching
    - Implement findMostRecentUnpaid(results: CompetitionResult[]): CompetitionResult | null
    - Search all competition results for matching names
    - Return most recent result where swindle_money_paid is null or 0
    - _Requirements: 9.2, 9.3, 9.5, 9.8_

  - [x] 6.2 Write property tests for name matching case insensitivity
    - **Property 29: Name matching case insensitivity**
    - **Validates: Requirements 9.3**
    - Create backend/src/services/nameMatching.service.pbt.test.ts
    - Test that match(N1, N2) equals match(N2, N1)
    - Test that case differences don't affect matching
    - Use fast-check to generate names with varying cases
    - Minimum 100 iterations

  - [x] 6.3 Write property tests for name normalization
    - **Property 32: Name normalization matching**
    - **Validates: Requirements 9.8**
    - Test that "A. REID" matches "Alastair REID"
    - Test initial + surname variations
    - Use fast-check to generate name variations
    - Minimum 100 iterations

  - [x] 6.4 Write unit tests for NameMatchingService
    - Create backend/src/services/nameMatching.service.test.ts
    - Test exact name match (case-insensitive) finds result
    - Test initial + surname match finds result
    - Test no match returns null
    - Test multiple matches selects most recent unpaid
    - Test normalization handles whitespace and case

  - [x] 6.5 Implement SwindleMoneyService
    - Create backend/src/services/swindleMoney.service.ts
    - Implement populateSwindleMoney(playerName: string, amount: number): Promise<PopulateResult>
    - Use NameMatchingService to find matching result
    - Update swindle_money_paid field for matched result
    - Return success with result ID or warning if no match
    - Log warning when no match found but don't fail
    - Use DatabaseService with transaction support
    - _Requirements: 9.1, 9.4, 9.6, 9.7_

  - [x] 6.6 Write property tests for swindle money population
    - **Property 30: Swindle money population**
    - **Validates: Requirements 9.4, 9.7**
    - Create backend/src/services/swindleMoney.service.pbt.test.ts
    - Test that matching result gets swindle_money_paid updated
    - Test that amount is persisted correctly
    - Use fast-check to generate player names and amounts
    - Minimum 100 iterations

  - [x] 6.7 Write unit tests for SwindleMoneyService
    - Create backend/src/services/swindleMoney.service.test.ts
    - Test populateSwindleMoney with match updates result
    - Test populateSwindleMoney without match logs warning
    - Test amount persists to database
    - Test most recent unpaid result selected

- [x] 7. Backend API routes - Presentation Seasons
  - [x] 7.1 Implement presentation season routes
    - Create backend/src/routes/presentationSeason.routes.ts
    - POST /api/presentation-seasons - create season
    - GET /api/presentation-seasons - get all seasons
    - GET /api/presentation-seasons/active - get active season
    - PUT /api/presentation-seasons/:id - update season
    - PUT /api/presentation-seasons/:id/activate - set active
    - POST /api/presentation-seasons/auto-increment - auto-increment
    - DELETE /api/presentation-seasons/:id - delete season
    - Add request validation middleware
    - Add error handling for all routes
    - Return appropriate HTTP status codes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 7.2 Write integration tests for presentation season routes
    - Create backend/src/routes/presentationSeason.routes.test.ts
    - Test POST creates season with valid data
    - Test POST rejects invalid format
    - Test GET returns all seasons chronologically
    - Test PUT activates season and deactivates others
    - Test POST auto-increment creates correct next season
    - Test DELETE fails when competitions exist

- [x] 8. Backend API routes - Competition Results
  - [x] 8.1 Extend competition routes for season association
    - Update backend/src/routes/competition.routes.ts
    - Modify POST /api/competitions to require seasonId and type
    - Modify GET /api/competitions to support ?seasonId=<id> query param
    - Add validation for seasonId and type
    - Update response to include season_id and type fields
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.4_

  - [x] 8.2 Implement competition result routes
    - Create backend/src/routes/competitionResult.routes.ts
    - POST /api/competition-results - create single result
    - POST /api/competition-results/bulk - bulk create results
    - GET /api/competition-results?competitionId=<id> - get results by competition
    - PUT /api/competition-results/:id - update result
    - DELETE /api/competition-results/:id - delete result
    - Add request validation middleware
    - Add error handling for all routes
    - Return appropriate HTTP status codes
    - _Requirements: 4.1, 4.2, 4.3, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.9, 8.10_

  - [x] 8.3 Write integration tests for competition result routes
    - Create backend/src/routes/competitionResult.routes.test.ts
    - Test POST creates result with valid data
    - Test POST rejects missing required fields
    - Test POST bulk creates multiple results in transaction
    - Test GET returns results ordered by position
    - Test PUT updates result fields
    - Test DELETE removes result

- [x] 9. Backend API routes - CSV Upload
  - [x] 9.1 Implement CSV upload routes
    - Create backend/src/routes/csvUpload.routes.ts
    - POST /api/csv/upload/singles - upload singles CSV
    - POST /api/csv/upload/doubles - upload doubles CSV
    - Use multer middleware for file upload (max 5MB)
    - Validate file type (text/csv)
    - Parse CSV using CSVParserService
    - Bulk create results using CompetitionResultService
    - Return BulkResultResponse with created count and errors
    - Add error handling for parsing errors
    - _Requirements: 5.1, 5.2, 6.1, 6.2, 12.1, 12.4_

  - [x] 9.2 Implement CSV export route
    - Update backend/src/routes/csvUpload.routes.ts
    - GET /api/csv/export/:competitionId - export results as CSV
    - Get competition type to determine format
    - Use CSVFormatterService to format results
    - Set Content-Disposition header for download
    - Return text/csv content type
    - _Requirements: 7.4, 7.5, 7.6_

  - [x] 9.3 Write integration tests for CSV upload routes
    - Create backend/src/routes/csvUpload.routes.test.ts
    - Test POST singles with valid CSV creates results
    - Test POST singles with missing columns returns error
    - Test POST doubles with "/" separator creates paired results
    - Test POST doubles without "/" returns error
    - Test GET export returns correct CSV format
    - Test file size limit enforcement

- [x] 10. Backend API routes - Swindle Money Integration
  - [x] 10.1 Implement swindle money route
    - Create backend/src/routes/swindleMoney.routes.ts
    - POST /api/swindle-money/populate - auto-populate swindle money
    - Accept playerName and amount in request body
    - Use SwindleMoneyService to find and update result
    - Return PopulateResult with success/warning message
    - Add error handling
    - _Requirements: 9.1, 9.2, 9.4, 9.5, 9.6, 9.7_

  - [x] 10.2 Write integration tests for swindle money route
    - Create backend/src/routes/swindleMoney.routes.test.ts
    - Test POST with matching name updates result
    - Test POST without match returns warning
    - Test POST selects most recent unpaid result
    - Test amount persists correctly

  - [x] 10.3 Integrate with existing flagged transaction flow
    - Update backend/src/services/flaggedTransaction.service.ts
    - When transaction flagged as winnings, call SwindleMoneyService
    - Extract player name from transaction
    - Pass amount to populateSwindleMoney
    - Log result (success or warning)
    - _Requirements: 9.1, 11.3_

- [x] 11. Checkpoint - Backend implementation complete
  - Ensure all tests pass, ask the user if questions arise.

- [-] 12. Frontend components - Competition Accounts View
  - [x] 12.1 Create CompetitionAccountsView component
    - Create competitionAccountsView.js
    - Implement main container that integrates Transactional CSV Importer and Competition Results Management
    - Create two-section layout (existing importer on top, new management below)
    - Initialize child components (SeasonSelector, CompetitionList, ResultsTable, CSVUploader)
    - Implement render() method
    - Implement initialize() method to load initial data
    - Add event listeners for component communication
    - _Requirements: 11.1, 11.2, 11.4, 11.5, 11.6_

  - [x] 12.2 Write unit tests for CompetitionAccountsView
    - Create competitionAccountsView.test.js
    - Test component renders both sections
    - Test initialization loads data
    - Test event listeners wire components together
    - Test error handling displays errors

- [-] 13. Frontend components - Presentation Season Management
  - [x] 13.1 Create SeasonSelector component
    - Create seasonSelector.js
    - Implement loadSeasons() to fetch all seasons from API
    - Implement createSeason(name) to create new season
    - Implement autoIncrementSeason() to auto-increment from most recent
    - Implement setActiveSeason(id) to set active season
    - Implement render() to display season dropdown and management controls
    - Add validation for season name format
    - Display active season with badge/highlight
    - Add "New Season" button with modal
    - Add "Auto-Increment" button
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 13.2 Write property tests for season format validation
    - **Property 1: Season format validation**
    - **Validates: Requirements 1.2**
    - Create seasonSelector.pbt.test.js
    - Test that invalid formats are rejected
    - Test that valid formats are accepted
    - Use fast-check to generate season names
    - Minimum 100 iterations

  - [x] 13.3 Write unit tests for SeasonSelector
    - Create seasonSelector.test.js
    - Test loadSeasons fetches and displays seasons
    - Test createSeason with valid format succeeds
    - Test createSeason with invalid format shows error
    - Test autoIncrementSeason creates correct next season
    - Test setActiveSeason updates UI
    - Test active season highlighted

- [x] 14. Frontend components - Competition List
  - [x] 14.1 Create CompetitionList component
    - Create competitionList.js
    - Implement loadCompetitions(seasonId) to fetch competitions
    - Implement filterBySeason(seasonId) to filter by season
    - Implement createCompetition(dto) to create new competition
    - Implement deleteCompetition(id) to delete competition
    - Implement render() to display competition list with filters
    - Implement onCompetitionSelect(callback) for selection events
    - Display competition name, date, type badge, result count
    - Add season filter dropdown
    - Add "New Competition" button with form
    - Add edit/delete icons on hover
    - Highlight selected competition
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 14.2 Write property tests for season filter correctness
    - **Property 10: Season filter correctness**
    - **Validates: Requirements 3.4**
    - Create competitionList.pbt.test.js
    - Test that filtering by season returns only matching competitions
    - Use fast-check to generate competitions with different seasons
    - Minimum 100 iterations

  - [x] 14.3 Write unit tests for CompetitionList
    - Create competitionList.test.js
    - Test loadCompetitions fetches and displays competitions
    - Test filterBySeason shows only matching competitions
    - Test createCompetition opens form and creates competition
    - Test deleteCompetition removes from list
    - Test competition selection triggers callback
    - Test empty state when no competitions

- [x] 15. Frontend components - Results Table
  - [x] 15.1 Create ResultsTable component
    - Create resultsTable.js
    - Implement loadResults(competitionId) to fetch results
    - Implement addResult(dto) to add manual result
    - Implement updateResult(id, updates) to update result
    - Implement deleteResult(id) to delete result
    - Implement render() to display results table
    - Implement renderSinglesColumns() for singles competitions (Pos, Name, Gross, Hcp, Nett, Entry Paid, Swindle Money)
    - Implement renderDoublesColumns() for doubles competitions (Pos, Name, Nett, Entry Paid, Swindle Money)
    - Add inline editing for result fields
    - Add "Add Manual Entry" button with form
    - Add delete icon on each row
    - Display results ordered by finishing position
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_

  - [x] 15.2 Write property tests for result position ordering
    - **Property 13: Result position ordering**
    - **Validates: Requirements 4.5**
    - Create resultsTable.pbt.test.js
    - Test that results are always ordered by finishing_position ascending
    - Use fast-check to generate results with random positions
    - Minimum 100 iterations

  - [x] 15.3 Write unit tests for ResultsTable
    - Create resultsTable.test.js
    - Test loadResults fetches and displays results
    - Test singles competition shows all columns
    - Test doubles competition hides gross/hcp columns
    - Test addResult creates new result
    - Test updateResult updates fields
    - Test deleteResult removes from table
    - Test inline editing updates result

- [ ] 16. Frontend components - CSV Upload
  - [x] 16.1 Create CSVUploader component
    - Create csvUploader.js
    - Implement setCompetition(competition) to set context
    - Implement uploadSinglesCSV(file) to upload singles CSV
    - Implement uploadDoublesCSV(file) to upload doubles CSV
    - Implement handleUploadError(error) to display validation errors
    - Implement render() to display upload UI with file input
    - Add file type validation (CSV only)
    - Add file size validation (max 5MB)
    - Display upload progress
    - Display success message with created count
    - Display error messages with row/field details
    - Add "Export CSV" button
    - _Requirements: 5.1, 5.2, 6.1, 6.2, 12.1, 12.4_

  - [x] 16.2 Write unit tests for CSVUploader
    - Create csvUploader.test.js
    - Test uploadSinglesCSV with valid file succeeds
    - Test uploadDoublesCSV with valid file succeeds
    - Test file type validation rejects non-CSV
    - Test file size validation rejects large files
    - Test error display shows row/field details
    - Test export button downloads CSV

- [-] 17. Frontend integration and styling
  - [x] 17.1 Update app.js to include CompetitionAccountsView
    - Update app.js to import and initialize CompetitionAccountsView
    - Add navigation link to Competition Accounts view
    - Wire up routing if using client-side routing
    - _Requirements: 11.1, 11.2_

  - [x] 17.2 Add CSS styling for Competition Accounts view
    - Update styles.css
    - Add styles for two-section layout
    - Add styles for season selector (dropdown, badges, buttons)
    - Add styles for competition list (cards, filters, type badges)
    - Add styles for results table (columns, inline editing, icons)
    - Add styles for CSV uploader (file input, progress, errors)
    - Add responsive styles for mobile/tablet
    - Add hover effects and transitions
    - Style active season badge (green border)
    - Style competition type badges (Singles: blue, Doubles: green)
    - _Requirements: 3.1, 3.2, 4.1, 4.2_

  - [x] 17.3 Update apiClient.js with new endpoints
    - Update apiClient.js
    - Add methods for presentation season endpoints
    - Add methods for competition result endpoints
    - Add methods for CSV upload endpoints
    - Add methods for swindle money endpoint
    - Add error handling for new endpoints
    - _Requirements: All API requirements_

- [x] 18. Checkpoint - Frontend implementation complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. End-to-end integration testing
  - [ ] 19.1 Write E2E test for complete workflow
    - Create integration.e2e.test.js or update existing
    - Test: Create presentation season → Create competition → Upload singles CSV → Verify results in database
    - Test: Create competition → Manual entry → Edit result → Verify persistence
    - Test: Flag transaction as winnings → Verify swindle money auto-population
    - Test: Delete competition → Verify cascade delete of results
    - Test: Filter competitions by season → Verify only matching competitions returned
    - _Requirements: All integration requirements_

  - [ ]* 19.2 Write property-based integration tests
    - Create integration.pbt.test.js or update existing
    - Test CSV round-trip properties end-to-end
    - Test referential integrity across all layers
    - Test transaction atomicity in bulk operations
    - Use fast-check to generate test data
    - Minimum 100 iterations per property

- [x] 20. Performance optimization and validation
  - [x] 20.1 Add database query optimization
    - Verify all indexes are created correctly
    - Test query performance with 100 competitions and 5000 results
    - Add query logging to identify slow queries
    - Optimize N+1 query issues if any
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

  - [x] 20.2 Add frontend performance optimization
    - Implement lazy loading for competition results
    - Add debouncing to search/filter inputs (300ms)
    - Test with 40 competitions to ensure < 2 second render
    - Test CSV upload with 50 rows completes < 1 second
    - Add loading indicators for async operations
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [x] 20.3 Add input validation and sanitization
    - Verify all user inputs are sanitized (XSS prevention)
    - Verify all database queries use parameterized statements (SQL injection prevention)
    - Add rate limiting to API endpoints
    - Add CSRF protection if needed
    - Test file upload security (CSV only, max size)
    - _Requirements: 12.5, 12.6, 12.7, 12.8_

- [-] 21. Documentation and deployment preparation
  - [x] 21.1 Update API documentation
    - Update backend/README.md or API docs
    - Document all new endpoints with request/response examples
    - Document CSV format requirements
    - Document error codes and messages
    - _Requirements: All API requirements_

  - [x] 21.2 Update user documentation
    - Update USER_GUIDE.md or create new guide
    - Document presentation season management
    - Document competition creation and management
    - Document CSV upload format and process
    - Document manual result entry
    - Document swindle money auto-population
    - Add screenshots or examples
    - _Requirements: All user-facing requirements_

  - [x] 21.3 Create database migration guide
    - Create MIGRATION_GUIDE.md
    - Document migration steps for production
    - Document rollback procedures
    - Document data backup requirements
    - Document testing procedures before production migration
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [x] 21.4 Prepare deployment checklist
    - Create DEPLOYMENT_CHECKLIST.md
    - List all environment variables needed
    - List all database migrations to run
    - List all dependencies to install
    - List all tests to run before deployment
    - List all monitoring/logging to verify
    - _Requirements: All deployment requirements_

- [x] 22. Final checkpoint - Feature complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at major milestones
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end workflows
- The implementation follows a bottom-up approach: database → services → routes → frontend
- All database operations use transactions to ensure atomicity
- All API endpoints include proper validation and error handling
- All frontend components follow existing patterns in the codebase
- CSV parsing uses papaparse library (already in dependencies)
- Name matching uses case-insensitive comparison with normalization
- Swindle money auto-population integrates with existing flagged transaction flow

## Implementation Order Rationale

1. **Database first**: Establishes the foundation for all data persistence
2. **Types second**: Provides type safety for TypeScript development
3. **Services third**: Implements business logic independent of API layer
4. **Routes fourth**: Exposes services via REST API
5. **Frontend last**: Builds UI on top of working backend
6. **Integration testing**: Validates complete workflows
7. **Performance and security**: Ensures production readiness
8. **Documentation**: Enables deployment and user adoption

This order ensures each layer can be tested independently and builds incrementally toward a complete feature.
