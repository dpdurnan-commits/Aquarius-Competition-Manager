# Requirements Document

## Introduction

This document specifies the requirements for a competition account management system that extends the existing competition-csv-import functionality. The system adds database persistence using IndexedDB and provides weekly financial account summaries for golf club competition management. After CSV data is imported and transformed, additional field extraction occurs, records are stored persistently, and weekly balance summaries are generated to track competition purses and pots.

## Glossary

- **Database_Manager**: The component responsible for storing and retrieving records from IndexedDB
- **Field_Extractor**: The component that extracts Player and Competition information from the Member field
- **Chronological_Validator**: The component that validates transaction date/time ordering during import
- **Weekly_Summarizer**: The component that groups transactions into weekly periods and calculates financial summaries
- **Competition_Purse**: Money held by individual members for competition entries (member account balances)
- **Competition_Pot**: Money held by the club for competition prizes and expenses (club account balance)
- **Weekly_Period**: A time span from Monday 00:00:00 (inclusive) to Sunday 23:59:59 (inclusive)
- **Summarised_Period_Transaction**: A database record containing transformed transaction data with extracted Player and Competition fields
- **Transaction_Summary_View**: The tabular interface displaying weekly financial summaries (displayed as "Aquarius Golf-Competition Transaction Summary" in the UI)

## Requirements

### Requirement 1: Player and Competition Field Extraction

**User Story:** As a user, I want player and competition information extracted from the Member field, so that I can track which players entered which competitions.

#### Acceptance Criteria

1. WHEN a Transformed_Record has a Member field containing both "&" AND ":" characters, THE Field_Extractor SHALL extract the substring before " &" into a new Player field
2. WHEN a Transformed_Record has a Member field containing both "&" AND ":" characters, THE Field_Extractor SHALL extract the substring after "& " and before ":" into a new Competition field
3. WHEN a Transformed_Record has a Member field containing both "&" AND ":" characters, THE Field_Extractor SHALL set the Member field to empty string
4. WHEN a Transformed_Record has a Member field that does NOT contain both "&" AND ":" characters, THE Field_Extractor SHALL preserve the Member field unchanged and set both Player and Competition fields to empty string
5. THE Field_Extractor SHALL handle edge cases where "&" or ":" appear at field boundaries without causing errors

### Requirement 2: Database Storage

**User Story:** As a user, I want transaction records stored in a persistent database, so that I can access historical data across browser sessions.

#### Acceptance Criteria

1. THE Database_Manager SHALL use IndexedDB as the storage technology
2. THE Database_Manager SHALL create a table named "summarised_period_transactions"
3. WHEN storing a record, THE Database_Manager SHALL persist all fields: Date, Time, Till, Type, Member, Player, Competition, Price, Discount, Subtotal, VAT, Total, sourceRowIndex, isComplete
4. WHEN retrieving records, THE Database_Manager SHALL return all stored fields in their original data types
5. THE Database_Manager SHALL support querying records by date range for weekly summary calculations

### Requirement 3: Chronological Data Validation

**User Story:** As a user, I want to prevent importing data that would create chronological inconsistencies, so that my financial summaries remain accurate and auditable.

#### Acceptance Criteria

1. WHEN a user uploads a new CSV file, THE Chronological_Validator SHALL determine the earliest transaction date and time in the new data
2. WHEN the database contains existing records, THE Chronological_Validator SHALL determine the latest transaction date and time in the database
3. IF the earliest new transaction date/time is before the latest existing transaction date/time, THEN THE Chronological_Validator SHALL reject the import and display an error message
4. WHEN chronological validation fails, THE Chronological_Validator SHALL prevent any records from the new file from being stored in the database
5. WHEN the database is empty, THE Chronological_Validator SHALL allow any CSV file to be imported regardless of transaction dates

### Requirement 4: Weekly Period Grouping

**User Story:** As a user, I want transactions grouped into weekly periods from Monday to Sunday, so that I can review financial activity by week.

#### Acceptance Criteria

1. THE Weekly_Summarizer SHALL define a Weekly_Period as starting Monday at 00:00:00 and ending Sunday at 23:59:59
2. WHEN calculating weekly summaries, THE Weekly_Summarizer SHALL assign each transaction to the Weekly_Period containing its date and time
3. THE Weekly_Summarizer SHALL generate one summary row for each Weekly_Period between the earliest and latest transaction dates, including periods with zero transactions
4. WHEN displaying weekly summaries, THE Weekly_Summarizer SHALL order periods chronologically from earliest to latest

### Requirement 5: Competition Purse Balance Calculations

**User Story:** As a user, I want to track competition purse balances (money held by members), so that I can monitor member account activity.

#### Acceptance Criteria

1. WHEN calculating Starting Competition Purse Balance for a week, THE Weekly_Summarizer SHALL use the Final Competition Purse value from the previous week
2. WHEN calculating the first week's Starting Competition Purse Balance, THE Weekly_Summarizer SHALL use zero
3. WHEN calculating Competition Purse Application Top Up, THE Weekly_Summarizer SHALL sum the Total field for all transactions where Till is empty AND Type equals "Topup (Competitions)"
4. WHEN calculating Competition Purse Till Top Up, THE Weekly_Summarizer SHALL sum the Total field for all transactions where Till equals "Till 1" AND Type equals "Topup (Competitions)"
5. WHEN calculating Competition Entries, THE Weekly_Summarizer SHALL sum the Total field for all transactions where Type equals "Sale"
6. WHEN calculating Competition Refunds, THE Weekly_Summarizer SHALL sum the Total field for all transactions where Type equals "Refund"
7. WHEN calculating Final Competition Purse, THE Weekly_Summarizer SHALL compute: Starting Competition Purse + Application Top Up + Till Top Up - Entries - Refunds
   NOTE: Refunds are stored as NEGATIVE values in the database (e.g., -10.00 for a £10 refund). Subtracting a negative value adds to the purse balance, which correctly represents money being returned to members.

### Requirement 6: Competition Pot Balance Calculations

**User Story:** As a user, I want to track competition pot balances (money held by club), so that I can monitor club funds available for prizes and expenses.

#### Acceptance Criteria

1. WHEN calculating Starting Competition Pot for a week, THE Weekly_Summarizer SHALL use the Final Competition Pot value from the previous week
2. WHEN calculating the first week's Starting Competition Pot, THE Weekly_Summarizer SHALL use zero
3. WHEN calculating Competition Winnings Paid, THE Weekly_Summarizer SHALL use zero as a placeholder for future functionality
4. WHEN calculating Competition Costs, THE Weekly_Summarizer SHALL use zero as a placeholder for future functionality
5. WHEN calculating Final Competition Pot, THE Weekly_Summarizer SHALL compute: Starting Competition Pot + Competition Entries + Competition Refunds - Competition Winnings Paid - Competition Costs
   NOTE: Refunds are stored as NEGATIVE values in the database (e.g., -10.00 for a £10 refund). Adding a negative value reduces the pot balance, which correctly represents money leaving the club account to be returned to members.

### Requirement 7: Transaction Summary View Display

**User Story:** As a user, I want to view weekly account balance summaries in a clear tabular format, so that I can understand financial flows at a glance.

#### Acceptance Criteria

1. THE Transaction_Summary_View SHALL display a table with columns for: From Date, To Date, Starting Competition Purse Balance, Competition Purse Application Top Up, Competition Purse Till Top Up, Competition Entries, Competition Refunds, Final Competition Purse, Starting Competition Pot, Competition Winnings Paid, Competition Costs, Final Competition Pot
2. WHEN displaying monetary values, THE Transaction_Summary_View SHALL format them with appropriate currency symbols and decimal places
3. WHEN displaying Competition Refunds, THE Transaction_Summary_View SHALL show the value as negative
4. WHEN displaying Competition Costs column, THE Transaction_Summary_View SHALL include a tooltip with text "Presentation Night Winnings, Trophy Engravings, Stationary etc"
5. WHEN no transactions exist in the database, THE Transaction_Summary_View SHALL display a message indicating no data is available

### Requirement 8: Data Integrity and Auditability

**User Story:** As a user, I want accurate and auditable financial calculations, so that I can trust the system for club financial management.

#### Acceptance Criteria

1. WHEN calculating weekly summaries, THE Weekly_Summarizer SHALL ensure that each week's starting balance equals the previous week's final balance
2. WHEN displaying calculated values, THE Account_Balance_View SHALL show all intermediate calculation components (not just final totals)
3. THE Database_Manager SHALL preserve all source data fields including sourceRowIndex for traceability back to original CSV
4. WHEN a calculation error occurs, THE system SHALL log the error and display a clear message to the user

### Requirement 9: Integration with Existing CSV Import

**User Story:** As a user, I want the new database storage to integrate seamlessly with the existing CSV import workflow, so that I can continue using familiar processes.

#### Acceptance Criteria

1. WHEN CSV import completes successfully, THE system SHALL automatically perform field extraction and database storage
2. WHEN database storage completes, THE system SHALL automatically update the Transaction_Summary_View with new weekly summaries
3. THE system SHALL preserve the existing CSV export functionality for transformed records
4. THE system SHALL maintain the existing Data_Viewer functionality for viewing individual transformed records

### Requirement 10: Database Reset and Rebuild

**User Story:** As a user, I want to clear all stored data and rebuild from a fresh CSV import, so that I can correct errors and iterate until the system processes data correctly.

#### Acceptance Criteria

1. THE Database_Manager SHALL provide a function to delete all records from the summarised_period_transactions table
2. WHEN a user triggers a database reset, THE Database_Manager SHALL remove all stored transaction records
3. WHEN a database reset completes, THE Transaction_Summary_View SHALL update to show no data available
4. WHEN a user uploads a CSV file after a database reset, THE Chronological_Validator SHALL treat the database as empty and allow the import
5. THE system SHALL provide a clear UI control (button or menu option) for triggering a database reset

### Requirement 11: Error Handling and User Feedback

**User Story:** As a user, I want clear error messages and feedback during database operations, so that I can understand and resolve issues.

#### Acceptance Criteria

1. IF database initialization fails, THEN THE Database_Manager SHALL display an error message indicating the database is unavailable
2. IF a record cannot be stored, THEN THE Database_Manager SHALL log the error and continue processing remaining records
3. WHEN chronological validation fails, THE system SHALL display an error message showing the conflicting date ranges
4. IF weekly summary calculation fails, THEN THE Weekly_Summarizer SHALL display an error message and show the last successful summary state
