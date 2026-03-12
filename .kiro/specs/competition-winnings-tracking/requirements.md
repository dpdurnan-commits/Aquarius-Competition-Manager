# Requirements Document

## Introduction

This document specifies the requirements for extending the competition account management system to track individual competition winnings. The system enables users to manage a list of competitions, flag specific "Topup (Competitions)" transactions as prize winnings paid to players, and associate these flagged transactions with specific competitions. This functionality addresses the current limitation where Competition Winnings Paid is a placeholder value of zero, enabling accurate tracking of the Competition Pot balance.

## Glossary

- **Competition**: A named golf competition event with a unique identifier
- **Competition_Manager**: The component responsible for creating, updating, and deleting competition records
- **Winnings_Flag**: A boolean marker indicating a "Topup (Competitions)" transaction represents prize money paid to a player
- **Transaction_Flagger**: The component that marks transactions as winnings and associates them with competitions
- **Summarised_Period_Transaction**: A database record containing transaction data stored in IndexedDB
- **Transformed_Records_View**: The interface displaying individual transaction records
- **Transaction_Summary_View**: The tabular interface displaying weekly financial summaries (displayed as "Aquarius Golf-Competition Transaction Summary")
- **Weekly_Summarizer**: The component that calculates weekly financial summaries including winnings paid
- **Competition_Pot**: Money held by the club for competition prizes and expenses

## Requirements

### Requirement 1: Competition Management

**User Story:** As a user, I want to add, edit, and delete competitions with unique names, so that I can track winnings for each competition throughout the year.

#### Acceptance Criteria

1. THE Competition_Manager SHALL store competitions in an IndexedDB table named "competitions"
2. WHEN creating a competition, THE Competition_Manager SHALL require a unique name
3. WHEN a user attempts to create a competition with a duplicate name, THE Competition_Manager SHALL reject the creation and display an error message
4. WHEN a user edits a competition name, THE Competition_Manager SHALL validate uniqueness before saving
5. THE Competition_Manager SHALL allow multiple transactions to be associated with the same competition
6. WHEN a user deletes a competition, THE Competition_Manager SHALL check for associated flagged transactions
7. IF a competition has associated flagged transactions, THEN THE Competition_Manager SHALL prevent deletion and display a warning message indicating the number of associated transactions
8. WHEN a competition has no associated transactions, THE Competition_Manager SHALL allow deletion

### Requirement 2: Transaction Flagging Interface

**User Story:** As a user, I want to select any "Topup (Competitions)" transaction in the Transformed Records View and flag it as "Swindle Money Paid" with an associated competition, so that I can distinguish prize winnings from regular top-ups.

#### Acceptance Criteria

1. WHEN displaying transactions in the Transformed_Records_View, THE system SHALL show a flag control for each "Topup (Competitions)" transaction
2. WHEN a user clicks the flag control on an unflagged transaction, THE Transaction_Flagger SHALL display a competition selection interface
3. WHEN a user selects a competition, THE Transaction_Flagger SHALL update that single transaction record with isWinning set to true and winningCompetitionId set to the selected competition's ID
4. THE Transaction_Flagger SHALL allow multiple different transactions to be flagged for the same competition
5. WHEN a user clicks the flag control on a flagged transaction, THE Transaction_Flagger SHALL display the current competition association and allow editing or removal
6. THE Transaction_Flagger SHALL persist flag changes to the IndexedDB database immediately
7. WHEN a transaction is flagged, THE system SHALL update the Transaction_Summary_View to reflect the new winnings calculation with the transaction's Total value added to the "Competition Winnings Paid" column for that week

### Requirement 3: Database Schema Extension

**User Story:** As a developer, I want the transaction records to include winnings flag and competition association fields, so that the system can track which transactions represent prize winnings.

#### Acceptance Criteria

1. THE Database_Manager SHALL add an isWinning field (boolean) to the summarised_period_transactions table schema
2. THE Database_Manager SHALL add a winningCompetitionId field (string or null) to the summarised_period_transactions table schema to store which competition a single transaction is associated with
3. WHEN storing new transaction records, THE Database_Manager SHALL initialize isWinning to false and winningCompetitionId to null
4. WHEN updating existing transaction records, THE Database_Manager SHALL preserve all existing fields while updating isWinning and winningCompetitionId
5. THE Database_Manager SHALL create an index on the isWinning field for efficient querying of flagged transactions
6. THE Database_Manager SHALL allow multiple different transactions to reference the same competition ID

### Requirement 4: Weekly Summary Winnings Calculation

**User Story:** As a user, I want the weekly summary to show accurate "Competition Winnings Paid" based on flagged transactions, so that the Competition Pot balance reflects actual prize money paid out.

#### Acceptance Criteria

1. WHEN calculating Competition Winnings Paid for a weekly period, THE Weekly_Summarizer SHALL sum the Total field for all transactions where isWinning equals true AND the transaction date falls within that weekly period
2. WHEN multiple transactions are flagged for the same competition within a weekly period, THE Weekly_Summarizer SHALL include all flagged transaction totals in the Competition Winnings Paid sum
3. WHEN calculating Final Competition Pot, THE Weekly_Summarizer SHALL use the calculated Competition Winnings Paid value instead of zero
4. WHEN no transactions are flagged as winnings in a weekly period, THE Weekly_Summarizer SHALL set Competition Winnings Paid to zero
5. WHEN a transaction is flagged or unflagged, THE Weekly_Summarizer SHALL recalculate all affected weekly summaries

### Requirement 5: Weekly Summary Transaction Drill-Down

**User Story:** As a user, I want to click on a week in the "Aquarius Golf-Competition Transaction Summary" and see all transactions for that week, so that I can retrospectively flag winnings.

#### Acceptance Criteria

1. WHEN a user clicks on a weekly summary row, THE system SHALL query the database for all transactions within that weekly period
2. WHEN displaying weekly transactions, THE system SHALL show all transaction fields including current flag status
3. WHEN displaying weekly transactions, THE system SHALL provide flag controls for all "Topup (Competitions)" transactions
4. WHEN a user flags a transaction from the weekly drill-down view, THE system SHALL update the transaction and refresh both the drill-down view and the weekly summary
5. THE system SHALL provide a way to close the weekly drill-down view and return to the summary table

### Requirement 6: Competition Management Interface

**User Story:** As a user, I want a user interface to manage competitions, so that I can add, edit, and delete competitions as needed.

#### Acceptance Criteria

1. THE system SHALL provide a competition management interface accessible from the main application
2. WHEN displaying the competition list, THE system SHALL show all competitions with their names
3. WHEN a user adds a competition, THE system SHALL display a form with a name input field
4. WHEN a user submits a new competition, THE system SHALL validate the name is non-empty and unique
5. WHEN a user edits a competition, THE system SHALL pre-populate the form with the current name
6. WHEN a user attempts to delete a competition with associated transactions, THE system SHALL display the count of associated transactions and prevent deletion
7. WHEN a user deletes a competition without associated transactions, THE system SHALL remove it from the database

### Requirement 7: Transaction Type Restriction

**User Story:** As a system, I want to ensure only "Topup (Competitions)" transactions can be flagged as winnings, so that data integrity is maintained.

#### Acceptance Criteria

1. THE Transaction_Flagger SHALL only allow flagging transactions where the Type field equals "Topup (Competitions)"
2. WHEN displaying transactions, THE system SHALL hide flag controls for transactions where Type does not equal "Topup (Competitions)"
3. IF a user attempts to flag a non-"Topup (Competitions)" transaction through any interface, THEN THE Transaction_Flagger SHALL reject the operation and display an error message

### Requirement 8: Retrospective Flagging

**User Story:** As a user, I want to flag transactions from any time period in the database, so that I can correct historical data and update past winnings.

#### Acceptance Criteria

1. THE Transaction_Flagger SHALL allow flagging any "Topup (Competitions)" transaction regardless of its date
2. WHEN a historical transaction is flagged, THE Weekly_Summarizer SHALL recalculate all weekly summaries from that transaction's week forward
3. WHEN a historical transaction is unflagged, THE Weekly_Summarizer SHALL recalculate all weekly summaries from that transaction's week forward
4. THE system SHALL maintain rolling balance consistency after retrospective changes

### Requirement 9: Data Integrity on Competition Deletion

**User Story:** As a user, I want the system to prevent data corruption when managing competitions, so that flagged transactions remain valid.

#### Acceptance Criteria

1. WHEN checking if a competition can be deleted, THE Competition_Manager SHALL query all transactions where winningCompetitionId equals the competition's ID
2. IF any transactions are associated with the competition, THEN THE Competition_Manager SHALL prevent deletion
3. WHEN a competition cannot be deleted, THE system SHALL display a message showing the count of associated transactions
4. THE system SHALL provide guidance to unflag associated transactions before deletion

### Requirement 10: Visual Indication of Flagged Transactions

**User Story:** As a user, I want to visually distinguish flagged transactions from unflagged ones, so that I can quickly identify which transactions represent winnings.

#### Acceptance Criteria

1. WHEN displaying a flagged transaction, THE system SHALL apply a visual indicator (icon, color, or badge)
2. WHEN displaying a flagged transaction, THE system SHALL show the associated competition name
3. WHEN displaying an unflagged "Topup (Competitions)" transaction, THE system SHALL show a clear unflagged state
4. THE visual indicators SHALL be consistent across both the Transformed Records View and weekly drill-down view

### Requirement 11: Competition Selection Interface

**User Story:** As a user, I want an intuitive interface for selecting competitions when flagging transactions, so that I can quickly associate winnings with the correct competition.

#### Acceptance Criteria

1. WHEN a user initiates transaction flagging, THE system SHALL display a list of all available competitions
2. WHEN no competitions exist, THE system SHALL display a message prompting the user to create competitions first
3. WHEN displaying the competition selection interface, THE system SHALL provide a way to cancel without flagging
4. WHEN a user selects a competition, THE system SHALL immediately flag the transaction and close the selection interface
5. THE competition selection interface SHALL be accessible and keyboard-navigable

### Requirement 12: Edit Flagged Transactions

**User Story:** As a user, I want to view and edit previously flagged transactions, so that I can correct mistakes or update competition associations.

#### Acceptance Criteria

1. WHEN a user clicks on a flagged transaction, THE system SHALL display the current flag details including the associated competition
2. WHEN editing a flagged transaction, THE system SHALL allow changing the associated competition
3. WHEN editing a flagged transaction, THE system SHALL allow removing the flag entirely
4. WHEN a flag is removed, THE Transaction_Flagger SHALL set isWinning to false and winningCompetitionId to null
5. WHEN flag changes are saved, THE system SHALL update the database and recalculate affected weekly summaries

### Requirement 13: Database Migration

**User Story:** As a developer, I want existing transaction records to be compatible with the new schema, so that the system continues working with historical data.

#### Acceptance Criteria

1. WHEN the database schema is upgraded, THE Database_Manager SHALL add isWinning and winningCompetitionId fields to the existing object store
2. WHEN loading existing records without isWinning or winningCompetitionId fields, THE Database_Manager SHALL treat them as unflagged (isWinning = false, winningCompetitionId = null)
3. THE Database_Manager SHALL increment the database version number to trigger the schema upgrade
4. WHEN the schema upgrade completes, THE system SHALL continue functioning without data loss

### Requirement 14: Error Handling for Flagging Operations

**User Story:** As a user, I want clear error messages when flagging operations fail, so that I can understand and resolve issues.

#### Acceptance Criteria

1. IF a transaction update fails during flagging, THEN THE Transaction_Flagger SHALL display an error message and revert the UI to the previous state
2. IF the database is unavailable during flagging, THEN THE system SHALL display an error message indicating the database is inaccessible
3. IF a competition is deleted while a user is flagging a transaction with that competition, THEN THE system SHALL display an error and refresh the competition list
4. WHEN any flagging error occurs, THE system SHALL log the error details for debugging

### Requirement 15: Performance with Large Datasets

**User Story:** As a user, I want the system to remain responsive when working with large transaction datasets, so that I can efficiently manage winnings.

#### Acceptance Criteria

1. WHEN recalculating weekly summaries after a flag change, THE Weekly_Summarizer SHALL only recalculate affected weeks (from the changed transaction's week forward)
2. WHEN displaying the weekly drill-down view, THE system SHALL only query and render transactions for the selected week
3. WHEN loading the competition list, THE system SHALL cache the list and only refresh when competitions are added, edited, or deleted
4. THE system SHALL provide visual feedback (loading indicators) during database operations that may take more than 100ms
