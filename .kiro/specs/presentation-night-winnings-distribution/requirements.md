# Requirements Document

## Introduction

The Presentation Night Winnings Distribution feature enables users to distribute accumulated competition pot funds to winners at the end of each presentation season, and to record other competition-related costs throughout the season. The system will allow users to:

1. Assign cash amounts to winning pairs (in doubles competitions) or individual winners (in singles competitions)
2. View the total distribution amount
3. Record the distribution as a cost transaction that deducts from the competition pot
4. Record general competition costs (engravings, stationery, pens, equipment, etc.) with custom descriptions
5. Track all costs that are deducted from the competition pot balance

## Glossary

- **Presentation_Season**: A time period grouping multiple competitions, defined by start and end years
- **Competition**: A golf tournament event with recorded results and winners
- **Competition_Result**: A record of a player's performance in a competition, including finishing position
- **Winner**: A player or pair who achieved position 1 in a competition
- **Winning_Pair**: Two players who jointly won a doubles competition
- **Competition_Pot**: The accumulated balance of competition entry fees minus winnings paid and costs
- **Presentation_Night_Transaction**: A cost transaction recording the total winnings distribution
- **Winnings_Assignment**: The cash amount assigned to a winner or winning pair for a specific competition
- **Distribution_UI**: The user interface for managing presentation night winnings
- **Transaction_System**: The existing system that tracks income and costs affecting the competition pot
- **Competition_Cost**: A general expense related to running competitions (e.g., engravings, stationery, equipment)
- **Cost_Entry**: A manual entry for recording a competition cost with description and amount

## Requirements

### Requirement 1: Display Competition Winners

**User Story:** As a user, I want to see all competition winners from a presentation season, so that I can assign winnings to each winner.

#### Acceptance Criteria

1. WHEN a presentation season is selected, THE Distribution_UI SHALL display all competitions in that season
2. FOR EACH competition displayed, THE Distribution_UI SHALL show the competition name, date, and type (singles or doubles)
3. WHEN a competition has results with position 1, THE Distribution_UI SHALL identify and display the winner(s)
4. WHEN a competition is a doubles competition, THE Distribution_UI SHALL display winning pairs as two player names
5. WHEN a competition is a singles competition, THE Distribution_UI SHALL display the individual winner name
6. WHEN a competition has no results with position 1, THE Distribution_UI SHALL indicate no winner is recorded

### Requirement 2: Assign Winnings to Winners

**User Story:** As a user, I want to assign cash amounts to each winner, so that I can specify how much each winner will receive.

#### Acceptance Criteria

1. FOR EACH winner displayed, THE Distribution_UI SHALL provide an input field for entering a cash amount
2. WHEN a user enters a cash amount, THE System SHALL validate that the amount is a non-negative decimal number
3. WHEN a user enters an invalid amount, THE System SHALL display an error message and prevent saving
4. THE System SHALL allow cash amounts with up to two decimal places
5. THE System SHALL store assigned winnings amounts associated with the competition and winner(s)
6. WHEN a user modifies a previously assigned amount, THE System SHALL update the stored value

### Requirement 3: Calculate Total Distribution Amount

**User Story:** As a user, I want to see the total amount that will be distributed, so that I can verify it matches the competition pot balance.

#### Acceptance Criteria

1. THE Distribution_UI SHALL calculate the sum of all assigned winnings amounts
2. WHEN any winnings amount is modified, THE Distribution_UI SHALL recalculate the total immediately
3. THE Distribution_UI SHALL display the total distribution amount prominently

### Requirement 4: Confirm and Record Distribution

**User Story:** As a user, I want to confirm the winnings distribution, so that the amounts are recorded as a cost and deducted from the competition pot.

#### Acceptance Criteria

1. THE Distribution_UI SHALL provide a confirmation action to finalize the distribution
2. WHEN the user confirms, THE System SHALL prompt for a transaction date
3. WHEN a transaction date is provided, THE System SHALL validate the date is in valid format (YYYY-MM-DD)
4. WHEN the user confirms the distribution, THE System SHALL create a Presentation_Night_Transaction with the total distribution amount as a cost
5. THE Presentation_Night_Transaction SHALL be recorded on the user-specified date
6. THE Presentation_Night_Transaction SHALL have a type of "Presentation Night Winnings"
7. WHEN the transaction is created, THE System SHALL deduct the total amount from the Competition_Pot balance
8. WHEN the distribution is confirmed, THE System SHALL prevent further modifications to the assigned amounts for that season

### Requirement 5: Validate Distribution Completeness

**User Story:** As a user, I want to ensure all winners have been reviewed before confirming, so that no winner is accidentally excluded from consideration.

#### Acceptance Criteria

1. WHEN the user attempts to confirm distribution, THE System SHALL validate that all winners have assigned winnings amounts (including zero for physical prizes)
2. WHEN any winner has no assigned amount (empty field), THE System SHALL display a warning message
3. THE System SHALL allow the user to proceed with confirmation despite the warning
4. THE System SHALL accept zero amounts for winners who receive physical prizes instead of cash
5. WHEN all winners have amounts assigned (including zero), THE System SHALL indicate the distribution is complete

### Requirement 6: Prevent Duplicate Distributions

**User Story:** As a user, I want to prevent accidentally distributing winnings twice for the same season, so that the competition pot remains accurate.

#### Acceptance Criteria

1. WHEN a presentation season has already had winnings distributed, THE System SHALL indicate this status
2. WHEN viewing a season with completed distribution, THE Distribution_UI SHALL display the previously assigned amounts in read-only mode
3. THE System SHALL prevent creating duplicate Presentation_Night_Transactions for the same season
4. THE System SHALL provide an option to void a previous distribution if corrections are needed

### Requirement 7: Handle Seasons Without Winners

**User Story:** As a user, I want to handle seasons where some competitions have no recorded winners, so that I can still distribute winnings for completed competitions.

#### Acceptance Criteria

1. WHEN a competition in the season has no position 1 results, THE Distribution_UI SHALL display the competition with an indication that no winner is recorded
2. THE System SHALL exclude competitions without winners from the total distribution calculation
3. THE System SHALL allow the user to confirm distribution even when some competitions have no winners
4. WHEN calculating the total distribution, THE System SHALL only sum amounts for competitions with recorded winners

### Requirement 8: Support Both Singles and Doubles Competitions

**User Story:** As a user, I want the system to handle both singles and doubles competitions correctly, so that winnings are assigned to the appropriate number of players.

#### Acceptance Criteria

1. WHEN a competition type is "singles", THE System SHALL identify exactly one winner (position 1)
2. WHEN a competition type is "doubles", THE System SHALL identify exactly two winners (both players at position 1)
3. FOR doubles competitions, THE System SHALL assign the same winnings amount to the pair (not split between individuals)
4. THE Distribution_UI SHALL clearly indicate whether each competition is singles or doubles
5. WHEN displaying doubles winners, THE System SHALL show both player names together as a pair

### Requirement 9: Record General Competition Costs

**User Story:** As a user, I want to record general competition costs (engravings, stationery, equipment, etc.), so that all expenses are tracked and deducted from the competition pot.

#### Acceptance Criteria

1. THE Distribution_UI SHALL provide a section for recording general competition costs
2. FOR EACH cost entry, THE System SHALL require a description field
3. FOR EACH cost entry, THE System SHALL require an amount field
4. THE System SHALL validate that cost descriptions are unique (no duplicates)
5. THE System SHALL validate that cost amounts are positive decimal numbers with up to two decimal places
6. WHEN a user submits a cost entry, THE System SHALL create a cost transaction on the current date
7. THE cost transaction SHALL have a type indicating it is a competition cost
8. THE cost transaction SHALL use the user-provided description as the member field
9. WHEN the cost transaction is created, THE System SHALL deduct the amount from the Competition_Pot balance

### Requirement 10: Display Competition Cost History

**User Story:** As a user, I want to see previously recorded competition costs, so that I can track what expenses have been recorded.

#### Acceptance Criteria

1. THE Distribution_UI SHALL display a list of previously recorded competition costs
2. FOR EACH recorded cost, THE System SHALL display the description, amount, and date
3. THE System SHALL order the cost list by date (most recent first)
4. THE System SHALL allow filtering costs by date range
5. THE System SHALL display the total of all recorded costs

### Requirement 11: Prevent Duplicate Cost Descriptions

**User Story:** As a user, I want to prevent accidentally recording the same cost twice, so that the competition pot remains accurate.

#### Acceptance Criteria

1. WHEN a user attempts to submit a cost with a description that already exists, THE System SHALL display an error message
2. THE error message SHALL indicate which existing cost has the same description
3. THE System SHALL prevent creating the duplicate cost transaction
4. THE System SHALL allow the user to modify the description to make it unique
