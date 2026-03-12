# Requirements Document

## Introduction

This document specifies the requirements for a CSV import and transformation system designed to process golf competition data. The system imports CSV files with a tiered structure, flattens specific records based on business rules, and provides viewing and export capabilities for the transformed data.

## Glossary

- **CSV_Importer**: The component responsible for reading and parsing CSV files from the user's local device
- **Record_Transformer**: The component that applies transformation rules to flatten tiered CSV records
- **Competition_Topup**: A transaction type representing monetary additions to competition funds
- **Competition_Entry**: A transaction representing a player's entry into a golf competition
- **Sale_Transaction**: A transaction type indicating a purchase or payment
- **Refund_Transaction**: A transaction type indicating a refund or reversal
- **Transformed_Record**: A flattened single-row record that meets retention criteria and has applied transformations
- **Data_Viewer**: The browser-based interface for viewing transformed records
- **CSV_Exporter**: The component that generates downloadable CSV files from transformed data

## Requirements

### Requirement 1: CSV File Import

**User Story:** As a user, I want to upload a CSV file from my local device, so that I can process golf competition transaction data.

#### Acceptance Criteria

1. WHEN a user selects a CSV file from their local device, THE CSV_Importer SHALL read the file contents
2. WHEN the CSV file is read, THE CSV_Importer SHALL parse it into a structured data format preserving row and column positions
3. IF the file cannot be read or parsed, THEN THE CSV_Importer SHALL return a descriptive error message
4. THE CSV_Importer SHALL support CSV files with at least 10 columns (A through J)
5. THE CSV_Importer SHALL preserve empty cells and null values during parsing

### Requirement 2: Competition Top-up Record Identification

**User Story:** As a user, I want the system to identify competition top-up transactions, so that I can track monetary additions to competitions.

#### Acceptance Criteria

1. WHEN processing CSV rows, THE Record_Transformer SHALL identify rows where Column A (Date) is not null AND Column D (Type) equals "Topup Competitions"
2. WHEN a Competition_Topup row is identified, THE Record_Transformer SHALL mark it for retention
3. THE Record_Transformer SHALL discard rows that do not meet Competition_Topup criteria unless they match other retention rules

### Requirement 3: Competition Top-up Record Transformation

**User Story:** As a user, I want competition top-up records to be flattened with financial data from related rows, so that each record contains complete transaction information.

#### Acceptance Criteria

1. WHEN transforming a Competition_Topup record, THE Record_Transformer SHALL preserve Columns A through E (Date, Time, Till, Type, Member) with their original values
2. WHEN transforming a Competition_Topup record, THE Record_Transformer SHALL populate Columns F through J (Price, Discount, Subtotal, VAT, Total) with values from the row 2 positions below in the same columns
3. IF the row 2 positions below does not exist, THEN THE Record_Transformer SHALL handle the error gracefully and mark the record as incomplete

### Requirement 4: Sale Transaction Record Identification

**User Story:** As a user, I want the system to identify sale transactions related to competition entries, so that I can track competition entry purchases.

#### Acceptance Criteria

1. WHEN processing CSV rows, THE Record_Transformer SHALL identify rows where Column A (Date) is not null AND Column D (Type) equals "Sale"
2. WHEN a Sale_Transaction is identified, THE Record_Transformer SHALL check if the row 2 positions below has Column E (Member) containing the text "Competition Entry"
3. WHEN both conditions are met, THE Record_Transformer SHALL mark the Sale_Transaction for retention
4. THE Record_Transformer SHALL discard Sale_Transaction rows that do not have "Competition Entry" in the related row

### Requirement 5: Sale Transaction Record Transformation

**User Story:** As a user, I want sale transaction records to be flattened with member and financial data, so that each record shows who purchased the competition entry and the transaction details.

#### Acceptance Criteria

1. WHEN transforming a Sale_Transaction record, THE Record_Transformer SHALL preserve Columns A through D (Date, Time, Till, Type) with their original values
2. WHEN transforming a Sale_Transaction record, THE Record_Transformer SHALL populate Column E (Member) by concatenating the current row's Member value with " & " and the Member value from 2 rows below
3. WHEN transforming a Sale_Transaction record, THE Record_Transformer SHALL populate Columns F through J (Price, Discount, Subtotal, VAT, Total) with values from the row 2 positions below in the same columns
4. IF the row 2 positions below does not exist, THEN THE Record_Transformer SHALL handle the error gracefully and mark the record as incomplete

### Requirement 6: Refund Transaction Record Identification

**User Story:** As a user, I want the system to identify refund transactions related to competition entries, so that I can track competition entry refunds.

#### Acceptance Criteria

1. WHEN processing CSV rows, THE Record_Transformer SHALL identify rows where Column A (Date) is not null AND Column D (Type) equals "Refund"
2. WHEN a Refund_Transaction is identified, THE Record_Transformer SHALL check if the row 2 positions below has Column E (Member) containing the text "Competition Entry"
3. WHEN both conditions are met, THE Record_Transformer SHALL mark the Refund_Transaction for retention
4. THE Record_Transformer SHALL discard Refund_Transaction rows that do not have "Competition Entry" in the related row

### Requirement 7: Refund Transaction Record Transformation

**User Story:** As a user, I want refund transaction records to be flattened with member and financial data, so that each record shows who received the refund and the transaction details.

#### Acceptance Criteria

1. WHEN transforming a Refund_Transaction record, THE Record_Transformer SHALL preserve Columns A through D (Date, Time, Till, Type) with their original values
2. WHEN transforming a Refund_Transaction record, THE Record_Transformer SHALL populate Column E (Member) by concatenating the current row's Member value with " & " and the Member value from 2 rows below
3. WHEN transforming a Refund_Transaction record, THE Record_Transformer SHALL populate Columns F through J (Price, Discount, Subtotal, VAT, Total) with values from the row 2 positions below in the same columns
4. IF the row 2 positions below does not exist, THEN THE Record_Transformer SHALL handle the error gracefully and mark the record as incomplete

### Requirement 8: Record Filtering

**User Story:** As a user, I want only relevant competition records to be retained, so that I can focus on competition-related transactions without noise from other data.

#### Acceptance Criteria

1. THE Record_Transformer SHALL discard all rows that do not match Competition_Topup, Sale_Transaction, or Refund_Transaction criteria
2. WHEN processing is complete, THE Record_Transformer SHALL return only Transformed_Record instances that meet retention criteria
3. THE Record_Transformer SHALL maintain the original order of retained records relative to their position in the source CSV

### Requirement 9: Data Viewing Interface

**User Story:** As a user, I want to view transformed records in a browser, so that I can review the processed data before exporting.

#### Acceptance Criteria

1. THE Data_Viewer SHALL display all Transformed_Record instances in a tabular format
2. WHEN displaying records, THE Data_Viewer SHALL show all columns (A through J) with appropriate headers (Date, Time, Till, Type, Member, Price, Discount, Subtotal, VAT, Total)
3. THE Data_Viewer SHALL render the table in a readable format with proper alignment and spacing
4. WHEN no records are available, THE Data_Viewer SHALL display a message indicating no data is present

### Requirement 10: CSV Export

**User Story:** As a user, I want to download transformed data as a CSV file, so that I can use it in external systems like spreadsheets or databases.

#### Acceptance Criteria

1. WHEN a user requests a download, THE CSV_Exporter SHALL generate a CSV file containing all Transformed_Record instances
2. THE CSV_Exporter SHALL include a header row with column names (Date, Time, Till, Type, Member, Price, Discount, Subtotal, VAT, Total)
3. THE CSV_Exporter SHALL format each Transformed_Record as a single CSV row with proper escaping and quoting
4. WHEN the CSV is generated, THE CSV_Exporter SHALL trigger a browser download with a descriptive filename
5. THE CSV_Exporter SHALL preserve data types and formatting from the Transformed_Record instances

### Requirement 11: Error Handling

**User Story:** As a user, I want clear error messages when processing fails, so that I can understand what went wrong and take corrective action.

#### Acceptance Criteria

1. WHEN a CSV file cannot be parsed, THE CSV_Importer SHALL provide an error message indicating the parsing failure
2. WHEN a transformation references a non-existent row, THE Record_Transformer SHALL log the error and mark the record as incomplete
3. WHEN no records meet retention criteria, THE system SHALL inform the user that no matching records were found
4. IF an error occurs during CSV export, THEN THE CSV_Exporter SHALL display an error message to the user
