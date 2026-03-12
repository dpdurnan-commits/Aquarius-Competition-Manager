# Requirements Document

## Introduction

This feature enables automatic detection and creation of competitions from transaction CSV uploads. When users upload transaction CSVs containing Sales or Refunds with competition names that don't exist in the database, the system will prompt them to create these competitions before proceeding with the transaction import. This streamlines the workflow by eliminating the need to manually create competitions before importing related transactions.

## Glossary

- **Transaction_CSV**: A CSV file containing financial transaction records with fields including date, time, type, member, player, competition, and total
- **Competition_Detector**: Component that identifies new competition names from transformed transaction records
- **Competition_Creation_Dialog**: Modal dialog that prompts users to create a new competition with required fields
- **Transaction_Importer**: Component that processes and stores transaction records to the database
- **Field_Extractor**: Existing component that extracts player and competition fields from transaction records
- **Presentation_Season**: A season entity that groups competitions, with an allCompetitionsAdded flag
- **Competition_Type**: The format of a competition, either "singles" or "doubles"
- **Enhanced_Record**: A transaction record with extracted player and competition fields

## Requirements

### Requirement 1: Detect New Competitions from Transaction Data

**User Story:** As a user, I want the system to automatically detect competition names in my uploaded transactions that don't exist in the database, so that I can create them before importing the transactions.

#### Acceptance Criteria

1. WHEN a Transaction_CSV is uploaded and transformed, THE Competition_Detector SHALL extract all unique competition names from records where type is "Sale" or "Refund"
2. WHEN competition names are extracted, THE Competition_Detector SHALL query the database to identify which competitions do not exist
3. THE Competition_Detector SHALL return a list of new competition names that need to be created
4. WHEN no new competitions are detected, THE Transaction_Importer SHALL proceed directly to the transaction summary view
5. WHEN the competition field is empty or null in a record, THE Competition_Detector SHALL exclude that record from new competition detection

### Requirement 2: Present Competition Creation Dialog

**User Story:** As a user, I want to be prompted with a dialog to create each new competition, so that I can provide the required information before importing transactions.

#### Acceptance Criteria

1. WHEN one or more new competitions are detected, THE System SHALL present the Competition_Creation_Dialog before showing the transaction summary
2. THE Competition_Creation_Dialog SHALL pre-populate the competition name field with the detected competition name
3. THE Competition_Creation_Dialog SHALL require the user to provide a date of competition
4. THE Competition_Creation_Dialog SHALL require the user to select a Competition_Type (singles or doubles)
5. THE Competition_Creation_Dialog SHALL require the user to select a Presentation_Season from seasons where allCompetitionsAdded is false
6. WHEN multiple new competitions are detected, THE System SHALL present Competition_Creation_Dialog instances sequentially, one for each new competition
7. THE Competition_Creation_Dialog SHALL allow the user to cancel the creation process
8. WHEN the user cancels competition creation, THE System SHALL abort the transaction import process

### Requirement 3: Create Competitions from Dialog Input

**User Story:** As a user, I want the system to create competitions with the information I provide in the dialog, so that my transactions can be properly linked to competitions.

#### Acceptance Criteria

1. WHEN the user submits the Competition_Creation_Dialog with valid data, THE System SHALL create a new competition in the database with the provided name, date, type, and seasonId
2. WHEN a competition is successfully created, THE System SHALL proceed to the next new competition dialog if more exist
3. WHEN all new competitions have been created, THE System SHALL continue with the transaction import process
4. IF competition creation fails due to a duplicate name, THEN THE System SHALL display an error message and allow the user to modify the competition name
5. THE System SHALL validate that the selected Presentation_Season has allCompetitionsAdded set to false before allowing creation
6. WHEN competition creation fails for any reason, THE System SHALL display a descriptive error message and allow the user to retry or cancel

### Requirement 4: Link Transactions to Created Competitions

**User Story:** As a user, I want my imported transactions to be automatically linked to the competitions I just created, so that the data is properly associated.

#### Acceptance Criteria

1. WHEN all new competitions have been created, THE Transaction_Importer SHALL proceed with storing the Enhanced_Records to the database
2. THE Transaction_Importer SHALL link each transaction record to its corresponding competition by matching the competition name field
3. WHEN transactions are stored, THE System SHALL display the transaction summary view with the imported data
4. THE System SHALL maintain the existing chronological validation and duplicate checking before storing transactions
5. WHEN the transaction import completes successfully, THE System SHALL display a success message indicating the number of records imported and competitions created

### Requirement 5: Manage Presentation Season Completion Status

**User Story:** As a user, I want to mark a presentation season as having all competitions added, so that I don't see it as an option when creating new competitions from transaction imports.

#### Acceptance Criteria

1. THE Manage Competitions View SHALL display a toggle or checkbox for each Presentation_Season to mark it as "All Competitions Added"
2. WHEN a user toggles the "All Competitions Added" flag, THE System SHALL update the allCompetitionsAdded field in the database for that Presentation_Season
3. THE System SHALL display the current status of the allCompetitionsAdded flag for each Presentation_Season on the Manage Competitions View
4. WHEN a Presentation_Season is marked as "All Competitions Added", THE System SHALL exclude it from the season selection dropdown in the Competition_Creation_Dialog during transaction imports
5. THE System SHALL allow users to toggle the "All Competitions Added" flag on and off at any time
6. WHEN the allCompetitionsAdded flag is changed, THE System SHALL persist the change immediately to the database

### Requirement 6: Preserve Existing Import Workflow

**User Story:** As a user, I want the existing transaction import workflow to remain unchanged when no new competitions are detected, so that my familiar process is not disrupted.

#### Acceptance Criteria

1. WHEN a Transaction_CSV is uploaded with only existing competition names, THE System SHALL proceed directly to the "Save to Database" step without showing Competition_Creation_Dialog
2. THE System SHALL preserve the existing Field_Extractor behavior for extracting player and competition fields
3. THE System SHALL preserve the existing chronological validation step
4. THE System SHALL preserve the existing duplicate checking step
5. THE System SHALL preserve the existing transaction summary view display after import
