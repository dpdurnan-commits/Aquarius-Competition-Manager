# Requirements Document

## Introduction

This feature enables financial reconciliation between competition results and player transactions. When competition results are manually edited, the system must ensure that all financial records (entries, refunds, and swindle money) are correctly attributed to players, even when names are corrected or players who entered did not appear in the results.

## Glossary

- **Competition_Result**: A record of a player's performance in a competition, including their name and position
- **Reconciliation_Action**: A user-triggered operation that synchronizes competition results with financial transactions
- **Player_Transaction**: A financial record associated with a competition (entry fee, refund, or swindle money)
- **DNP**: "Did Not Play" - a position status for players who have transactions but no result entry
- **Name_Correction**: A change to a player's name spelling in the competition results
- **Transaction_Reassignment**: The process of linking transactions to the correct player after a name correction

## Requirements

### Requirement 1: Trigger Reconciliation Action

**User Story:** As a competition administrator, I want to trigger a reconciliation action from the results table, so that I can ensure financial records match the current results.

#### Acceptance Criteria

1. THE Competition_Results_Table SHALL display a reconciliation action button
2. WHEN the reconciliation action is triggered, THE System SHALL execute both name correction reconciliation and missing player reconciliation
3. WHEN reconciliation completes, THE System SHALL display a summary of changes made

### Requirement 2: Reconcile Name Corrections

**User Story:** As a competition administrator, I want the system to reassign transactions when I correct a player's name, so that financial records follow the corrected player identity.

#### Acceptance Criteria

1. WHEN a player name in Competition_Result differs from the original transaction name, THE System SHALL identify it as a Name_Correction
2. WHEN a Name_Correction is detected, THE System SHALL query the database for Player_Transactions matching the corrected name
3. WHEN matching Player_Transactions are found, THE System SHALL reassign those transactions to the player with the corrected name
4. THE System SHALL reassign entry fees, refunds, and swindle money during Transaction_Reassignment
5. WHEN no matching player is found in the database, THE System SHALL leave the transaction assignments unchanged

### Requirement 3: Identify Missing Players

**User Story:** As a competition administrator, I want to see all players who paid entry fees but don't appear in results, so that I can account for all competition funds.

#### Acceptance Criteria

1. WHEN reconciliation executes, THE System SHALL identify all Player_Transactions for the competition
2. THE System SHALL compare Player_Transactions against existing Competition_Result entries
3. WHEN a Player_Transaction exists without a corresponding Competition_Result, THE System SHALL identify that player as missing
4. THE System SHALL retrieve entry fees, refunds, and swindle money for each missing player

### Requirement 4: Add Missing Players to Results

**User Story:** As a competition administrator, I want players with transactions but no results to be added as DNP, so that I can see complete financial participation.

#### Acceptance Criteria

1. WHEN missing players are identified, THE System SHALL create Competition_Result entries for each missing player
2. THE System SHALL set the position status to "DNP" for each added player
3. THE System SHALL append missing players to the end of the results list
4. THE System SHALL preserve the original order of existing Competition_Result entries
5. THE System SHALL associate the correct Player_Transactions with each added DNP entry

### Requirement 5: Preserve Financial Data Integrity

**User Story:** As a competition administrator, I want reconciliation to maintain accurate financial records, so that all money is properly accounted for.

#### Acceptance Criteria

1. WHEN Transaction_Reassignment occurs, THE System SHALL maintain the total sum of all transactions for the competition
2. THE System SHALL ensure each Player_Transaction is assigned to exactly one player in the results
3. IF a transaction cannot be assigned, THEN THE System SHALL log an error with transaction details
4. THE System SHALL preserve transaction timestamps and amounts during reassignment
5. WHEN reconciliation completes, THE System SHALL verify that all competition transactions are represented in the results

### Requirement 6: Report Reconciliation Results

**User Story:** As a competition administrator, I want to see what changed during reconciliation, so that I can verify the system made correct adjustments.

#### Acceptance Criteria

1. WHEN reconciliation completes, THE System SHALL report the number of name corrections processed
2. THE System SHALL report the number of missing players added as DNP
3. THE System SHALL report the total value of transactions reassigned
4. IF errors occur during reconciliation, THEN THE System SHALL report error details to the user
5. THE System SHALL display the reconciliation report in the user interface
