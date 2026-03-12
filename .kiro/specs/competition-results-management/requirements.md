# Requirements Document

## Introduction

This document defines requirements for the Competition Results Management feature, which extends the Aquarius Golf Competition Account Manager. The system will consolidate competition management functionality, replacing the current dialogue-based approach with an integrated view that supports approximately 40 competitions per year. The feature includes presentation season management, CSV upload for singles and doubles competitions, manual result entry, and automatic integration with swindle money tracking.

## Glossary

- **Competition_Manager**: The web application component responsible for managing golf competitions and their results
- **Presentation_Season**: A time period spanning from one winter to the following summer, used to group competitions for awards presentation (e.g., "Season: Winter 25-Summer 26")
- **Singles_Competition**: A golf competition where individual players compete independently
- **Doubles_Competition**: A golf competition where pairs of players compete as teams
- **Competition_Result**: A record of a player's performance in a specific competition, including position, scores, and payment status
- **CSV_Parser**: The component that reads and validates CSV files containing competition results
- **Swindle_Money**: Prize money paid to competition winners, tracked separately from entry fees
- **Transformed_Records**: The existing system section where financial transactions are reviewed and categorized
- **Transactional_CSV_Importer**: The existing functionality that imports financial transaction data from CSV files
- **Competition_Accounts**: The new view that integrates competition results management with the existing Transactional CSV Importer
- **Database**: The PostgreSQL database that persists all competition and result data

## Requirements

### Requirement 1: Presentation Season Management

**User Story:** As a competition manager, I want to create and manage presentation seasons, so that I can group competitions by their award presentation period.

#### Acceptance Criteria

1. THE Competition_Manager SHALL store presentation seasons with the format "Season: Winter [YY]-Summer [YY]"
2. WHEN a user creates a new presentation season, THE Competition_Manager SHALL validate that the format matches "Season: Winter [YY]-Summer [YY]" where [YY] represents a two-digit year
3. THE Competition_Manager SHALL provide functionality to add new presentation seasons manually
4. THE Competition_Manager SHALL provide functionality to auto-increment presentation seasons based on the most recent season
5. WHEN auto-incrementing, THE Competition_Manager SHALL increment both year values by one (e.g., "Winter 25-Summer 26" becomes "Winter 26-Summer 27")
6. THE Competition_Manager SHALL maintain a list of all presentation seasons ordered chronologically
7. THE Competition_Manager SHALL mark exactly one presentation season as active at any time
8. FOR ALL presentation seasons, the winter year SHALL be less than or equal to the summer year

### Requirement 2: Competition Creation and Association

**User Story:** As a competition manager, I want to create competitions and associate them with presentation seasons, so that I can organize competitions by their award period.

#### Acceptance Criteria

1. WHEN a user creates a new competition, THE Competition_Manager SHALL require a competition name
2. WHEN a user creates a new competition, THE Competition_Manager SHALL require a competition date
3. WHEN a user creates a new competition, THE Competition_Manager SHALL require a competition type of either "Singles" or "Doubles"
4. WHEN a user creates a new competition, THE Competition_Manager SHALL require association with a presentation season
5. WHEN a user creates a new competition, THE Competition_Manager SHALL accept an optional description
6. WHEN a user creates a new competition, THE Competition_Manager SHALL accept an optional prize structure
7. THE Competition_Manager SHALL persist all competition data to the Database
8. THE Competition_Manager SHALL maintain referential integrity between competitions and presentation seasons
9. FOR ALL competitions, the associated presentation season SHALL exist in the Database

### Requirement 3: Competition List Display and Filtering

**User Story:** As a competition manager, I want to view and filter competitions by presentation season, so that I can focus on relevant competitions.

#### Acceptance Criteria

1. WHEN a user accesses the competition management view, THE Competition_Manager SHALL display a list of all competitions
2. THE Competition_Manager SHALL display competitions with their name, date, type, and presentation season
3. THE Competition_Manager SHALL provide functionality to filter competitions by presentation season
4. WHEN a user selects a presentation season filter, THE Competition_Manager SHALL display only competitions associated with that season
5. THE Competition_Manager SHALL display competitions in chronological order by date within each season
6. THE Competition_Manager SHALL support displaying approximately 40 competitions per year without performance degradation

### Requirement 4: Competition Results Table Structure

**User Story:** As a competition manager, I want to view competition results in a structured table, so that I can see all player performance data clearly.

#### Acceptance Criteria

1. WHEN a user selects a competition, THE Competition_Manager SHALL display a results table
2. THE Competition_Manager SHALL display the following columns for all competition types: Finishing Position, Name, Nett Score, Entry Paid, Swindle Money Paid
3. WHERE the competition type is Singles, THE Competition_Manager SHALL additionally display Gross Score and Handicap columns
4. WHERE the competition type is Doubles, THE Competition_Manager SHALL hide Gross Score and Handicap columns
5. THE Competition_Manager SHALL display results ordered by Finishing Position in ascending order
6. FOR ALL result rows, Finishing Position and Name SHALL contain non-empty values
7. THE Competition_Manager SHALL persist all result data to the Database with referential integrity to the parent competition

### Requirement 5: Singles Competition CSV Upload

**User Story:** As a competition manager, I want to upload singles competition results via CSV, so that I can quickly populate results from exported data.

#### Acceptance Criteria

1. WHEN a user uploads a CSV file for a Singles competition, THE CSV_Parser SHALL validate that columns "Pos", "Name", "Gross", "Hcp", and "Nett" are present
2. IF any required column is missing, THEN THE CSV_Parser SHALL return an error message identifying the missing columns
3. WHEN parsing a valid Singles CSV, THE CSV_Parser SHALL map "Pos" to Finishing Position
4. WHEN parsing a valid Singles CSV, THE CSV_Parser SHALL map "Name" to Name
5. WHEN parsing a valid Singles CSV, THE CSV_Parser SHALL map "Gross" to Gross Score
6. WHEN parsing a valid Singles CSV, THE CSV_Parser SHALL map "Hcp" to Handicap
7. WHEN parsing a valid Singles CSV, THE CSV_Parser SHALL map "Nett" to Nett Score
8. WHEN parsing a valid Singles CSV, THE CSV_Parser SHALL create one Competition_Result row for each CSV row that contains a non-empty Name value
9. WHEN parsing a valid Singles CSV, THE CSV_Parser SHALL skip rows where the Name field is empty or contains only whitespace
10. WHEN parsing a valid Singles CSV, THE CSV_Parser SHALL skip rows where the Name field matches the pattern "Division [0-9]+"
11. THE CSV_Parser SHALL trim leading and trailing whitespace from all field values
12. FOR ALL parsed Singles results, the CSV_Parser SHALL produce Competition_Result records that can be serialized back to the same CSV format

### Requirement 6: Doubles Competition CSV Upload with Name Splitting

**User Story:** As a competition manager, I want to upload doubles competition results with automatic name splitting, so that each team member is recorded as a separate result.

#### Acceptance Criteria

1. WHEN a user uploads a CSV file for a Doubles competition, THE CSV_Parser SHALL validate that columns "Pos", "Name", and "Nett" are present
2. IF any required column is missing, THEN THE CSV_Parser SHALL return an error message identifying the missing columns
3. WHEN parsing a valid Doubles CSV, THE CSV_Parser SHALL split each Name field on the "/" character into two separate player names
4. WHEN splitting names, THE CSV_Parser SHALL trim leading and trailing whitespace from each resulting player name
5. WHEN splitting names, THE CSV_Parser SHALL create two Competition_Result rows from each CSV row
6. WHEN creating split rows, THE CSV_Parser SHALL apply the same Finishing Position value to both rows
7. WHEN creating split rows, THE CSV_Parser SHALL apply the same Nett Score value to both rows
8. WHEN parsing a valid Doubles CSV, THE CSV_Parser SHALL skip rows where the Name field is empty or contains only whitespace
9. WHEN parsing a valid Doubles CSV, THE CSV_Parser SHALL skip rows where the Name field matches the pattern "Division [0-9]+"
10. IF a Name field does not contain a "/" character, THEN THE CSV_Parser SHALL return an error indicating invalid Doubles format
11. FOR ALL parsed Doubles results, combining pairs of Competition_Result records with the same Finishing Position SHALL produce the original CSV format

### Requirement 7: CSV Parser Round-Trip Property

**User Story:** As a competition manager, I want CSV parsing to be reliable and reversible, so that I can trust the data integrity of uploaded results.

#### Acceptance Criteria

1. THE Competition_Manager SHALL provide a CSV formatter that converts Competition_Result records back to CSV format
2. FOR ALL valid Singles CSV files, parsing then formatting then parsing SHALL produce equivalent Competition_Result records
3. FOR ALL valid Doubles CSV files, parsing then formatting then parsing SHALL produce equivalent Competition_Result records
4. WHEN formatting Singles results to CSV, THE CSV_formatter SHALL include columns "Pos", "Name", "Gross", "Hcp", "Nett"
5. WHEN formatting Doubles results to CSV, THE CSV_formatter SHALL combine paired Competition_Result records with the same Finishing Position into a single row with names joined by " / "
6. WHEN formatting Doubles results to CSV, THE CSV_formatter SHALL include columns "Pos", "Name", "Nett"

### Requirement 8: Manual Result Entry and Editing

**User Story:** As a competition manager, I want to manually add and edit competition results, so that I can handle cases where CSV upload is not available or corrections are needed.

#### Acceptance Criteria

1. WHEN a user adds a manual result row, THE Competition_Manager SHALL require a Finishing Position value
2. WHEN a user adds a manual result row, THE Competition_Manager SHALL require a Name value
3. WHEN a user adds a manual result row, THE Competition_Manager SHALL accept optional values for Gross Score, Handicap, Nett Score, and Entry Paid
4. THE Competition_Manager SHALL provide functionality to edit existing Competition_Result rows
5. WHEN a user edits a result row, THE Competition_Manager SHALL validate that Finishing Position remains a positive integer
6. WHEN a user edits a result row, THE Competition_Manager SHALL validate that Name remains non-empty
7. WHERE the competition type is Singles, THE Competition_Manager SHALL allow editing of Gross Score and Handicap fields
8. WHERE the competition type is Doubles, THE Competition_Manager SHALL prevent editing of Gross Score and Handicap fields
9. WHEN a user saves manual changes, THE Competition_Manager SHALL persist the updated data to the Database
10. THE Competition_Manager SHALL provide functionality to delete Competition_Result rows

### Requirement 9: Swindle Money Auto-Population

**User Story:** As a competition manager, I want winnings to automatically link to competition results, so that I can track which players have received their prize money.

#### Acceptance Criteria

1. WHEN a user flags a transaction as winnings in Transformed_Records, THE Competition_Manager SHALL identify the player name from the transaction
2. WHEN a player name is identified, THE Competition_Manager SHALL search all Competition_Result records for matching Name values
3. WHEN searching for matches, THE Competition_Manager SHALL perform case-insensitive comparison
4. WHEN a matching Competition_Result is found, THE Competition_Manager SHALL populate the Swindle Money Paid field with the transaction amount
5. IF multiple Competition_Result records match the player name, THEN THE Competition_Manager SHALL populate the Swindle Money Paid field for the most recent competition where the player has an unpopulated Swindle Money Paid value
6. IF no matching Competition_Result is found, THEN THE Competition_Manager SHALL log a warning but complete the transaction flagging
7. WHEN populating Swindle Money Paid, THE Competition_Manager SHALL persist the updated value to the Database
8. THE Competition_Manager SHALL handle name variations by matching on normalized names (e.g., "A. REID" matches "Alastair REID" if both normalize to the same value)

### Requirement 10: Database Schema and Persistence

**User Story:** As a competition manager, I want all competition data to be reliably stored in the database, so that data is preserved across sessions and system restarts.

#### Acceptance Criteria

1. THE Database SHALL store presentation seasons with fields: id, name, start_year, end_year, is_active
2. THE Database SHALL store competitions with fields: id, name, date, type, season_id, description, prize_structure, created_at, updated_at
3. THE Database SHALL store competition results with fields: id, competition_id, finishing_position, player_name, gross_score, handicap, nett_score, entry_paid, swindle_money_paid, created_at, updated_at
4. THE Database SHALL enforce a foreign key constraint from competitions.season_id to presentation_seasons.id
5. THE Database SHALL enforce a foreign key constraint from competition_results.competition_id to competitions.id
6. WHEN a competition is deleted, THE Database SHALL cascade delete all associated Competition_Result records
7. THE Database SHALL enforce that competitions.type contains only values "singles" or "doubles"
8. THE Database SHALL enforce that exactly one presentation season has is_active set to true
9. THE Database SHALL index competition_results.player_name to optimize name matching queries
10. FOR ALL database operations, THE Competition_Manager SHALL use transactions to ensure data consistency

### Requirement 11: Competition Accounts View Integration

**User Story:** As a competition manager, I want the transactional CSV importer to remain accessible in the Competition Accounts view, so that I can continue importing financial transaction data alongside competition management.

#### Acceptance Criteria

1. THE Competition_Manager SHALL create a new view called "Competition Accounts"
2. THE Competition Accounts view SHALL include the existing Transactional CSV Importer functionality
3. THE Transactional CSV Importer SHALL maintain all existing functionality for importing financial transaction data
4. THE Competition Accounts view SHALL display both the Transactional CSV Importer section and the new competition management functionality
5. THE Competition_Manager SHALL clearly separate the Transactional CSV Importer section from the competition results management section within the Competition Accounts view
6. WHEN accessing the Competition Accounts view, THE Competition_Manager SHALL display both sections in an integrated layout

### Requirement 12: Data Validation and Error Handling

**User Story:** As a competition manager, I want clear error messages when data validation fails, so that I can quickly correct issues.

#### Acceptance Criteria

1. WHEN validation fails during CSV upload, THE Competition_Manager SHALL display an error message identifying the specific validation failure
2. WHEN validation fails during manual entry, THE Competition_Manager SHALL display an error message identifying the invalid field and the validation rule that failed
3. IF a database operation fails, THEN THE Competition_Manager SHALL display an error message and roll back any partial changes
4. WHEN a CSV file contains invalid data types, THE CSV_Parser SHALL return an error message identifying the row number and field name
5. WHEN a user attempts to create a competition without a required field, THE Competition_Manager SHALL prevent submission and highlight the missing field
6. THE Competition_Manager SHALL validate that Finishing Position values are positive integers
7. THE Competition_Manager SHALL validate that date values are valid calendar dates
8. THE Competition_Manager SHALL validate that numeric score fields contain valid numbers or are empty

### Requirement 13: Performance and Scalability

**User Story:** As a competition manager, I want the system to handle a full year of competitions efficiently, so that I can work without delays.

#### Acceptance Criteria

1. WHEN displaying a list of 40 competitions, THE Competition_Manager SHALL render the list within 4 seconds
2. WHEN uploading a CSV file with 50 result rows, THE CSV_Parser SHALL complete parsing within 1 second
3. WHEN filtering competitions by presentation season, THE Competition_Manager SHALL update the display within 1000 milliseconds
4. WHEN auto-populating Swindle Money Paid, THE Competition_Manager SHALL complete the name matching and update within 250 milliseconds
5. THE Database SHALL support storing at least 500 competitions and 50000 competition results entries without performance degradation
6. WHEN querying competition results for display, THE Competition_Manager SHALL use database indexes to optimize query performance

## Correctness Properties for Property-Based Testing

### Property 1: CSV Round-Trip Invariant (Singles)
FOR ALL valid Singles CSV files C, parse(format(parse(C))) SHALL produce Competition_Result records equivalent to parse(C)

### Property 2: CSV Round-Trip Invariant (Doubles)
FOR ALL valid Doubles CSV files C, parse(format(parse(C))) SHALL produce Competition_Result records equivalent to parse(C)

### Property 3: Name Splitting Idempotence
FOR ALL Doubles CSV rows with name field N containing "/", splitting N SHALL produce exactly 2 non-empty player names

### Property 4: Presentation Season Ordering
FOR ALL presentation seasons S1 and S2 where S1.start_year < S2.start_year, S1 SHALL appear before S2 in chronological ordering

### Property 5: Competition-Season Referential Integrity
FOR ALL competitions C, C.season_id SHALL reference an existing presentation season in the Database

### Property 6: Result-Competition Referential Integrity
FOR ALL Competition_Result records R, R.competition_id SHALL reference an existing competition in the Database

### Property 7: Finishing Position Uniqueness per Competition
FOR ALL Competition_Result records R1 and R2 where R1.competition_id = R2.competition_id AND R1.finishing_position = R2.finishing_position, R1 and R2 MAY have the same finishing position (ties are allowed)

### Property 8: Singles Competition Result Completeness
FOR ALL Competition_Result records R where R.competition.type = "singles", R SHALL have non-null values for gross_score, handicap, and nett_score OR SHALL be marked as incomplete

### Property 9: Doubles Competition Result Pairing
FOR ALL Competition_Result records R where R.competition.type = "doubles" AND R was created from CSV upload, there SHALL exist exactly one other Competition_Result record R2 where R2.competition_id = R.competition_id AND R2.finishing_position = R.finishing_position AND R2.id != R.id

### Property 10: Name Matching Commutativity
FOR ALL player names N1 and N2, match(N1, N2) SHALL equal match(N2, N1) where match is the case-insensitive name comparison function

### Property 11: Swindle Money Non-Negative
FOR ALL Competition_Result records R, R.swindle_money_paid SHALL be greater than or equal to zero

### Property 12: Active Season Uniqueness
FOR ALL presentation seasons in the Database, exactly one season SHALL have is_active = true

### Property 13: CSV Parser Error Handling
FOR ALL invalid CSV files C, parse(C) SHALL return an error message AND SHALL NOT create any Competition_Result records in the Database

### Property 14: Transaction Atomicity
FOR ALL database operations that modify multiple records, either ALL changes SHALL be committed OR ALL changes SHALL be rolled back

### Property 15: Filter Correctness
FOR ALL presentation seasons S, filtering competitions by S SHALL return only competitions C where C.season_id = S.id
