# Requirements Document

## Introduction

This feature adds the ability to mark competitions as "Finished" to reduce clutter in the competition management interface. Finished competitions are retained in the database but hidden from active management workflows, including the competition selector modal used for flagging transactions.

## Glossary

- **Competition**: A singles or doubles competition event with associated results and flagged transactions
- **Competition_Manager**: The frontend module that handles CRUD operations for competitions
- **Competition_Service**: The backend service that manages competition data persistence
- **Competition_Selector_Modal**: The UI component that displays competitions for selection when flagging transactions
- **Competition_Management_View**: The UI view that displays the list of competitions for management purposes
- **Finished_Competition**: A competition marked as complete, indicating no further results or transaction flagging is expected
- **Flagged_Transaction**: A transaction record associated with a competition as a winning payout
- **Active_Competition**: A competition that is not marked as finished and appears in management workflows

## Requirements

### Requirement 1: Store Finished Status

**User Story:** As a system administrator, I want competitions to have a finished status stored in the database, so that the system can distinguish between active and completed competitions.

#### Acceptance Criteria

1. THE Competition_Service SHALL store a boolean finished status for each competition with a default value of false
2. WHEN a competition is created, THE Competition_Service SHALL set the finished status to false
3. THE Competition_Service SHALL persist the finished status across application restarts

### Requirement 2: Mark Competition as Finished

**User Story:** As a competition manager, I want to mark a competition as finished, so that it no longer appears in my active management workflows.

#### Acceptance Criteria

1. THE Competition_Manager SHALL provide a method to mark a competition as finished
2. WHEN a competition is marked as finished, THE Competition_Service SHALL update the finished status to true
3. WHEN a competition is marked as finished, THE Competition_Service SHALL preserve all associated competition results
4. WHEN a competition is marked as finished, THE Competition_Service SHALL preserve all associated flagged transactions

### Requirement 3: Unmark Competition as Finished

**User Story:** As a competition manager, I want to unmark a competition as finished, so that I can reactivate it if needed.

#### Acceptance Criteria

1. THE Competition_Manager SHALL provide a method to unmark a competition as finished
2. WHEN a competition is unmarked as finished, THE Competition_Service SHALL update the finished status to false
3. WHEN a competition is unmarked as finished, THE Competition SHALL reappear in active management workflows

### Requirement 4: Filter Finished Competitions from Selector

**User Story:** As a user flagging transactions, I want finished competitions hidden from the competition selector, so that I only see relevant active competitions.

#### Acceptance Criteria

1. WHEN the Competition_Selector_Modal is displayed, THE Competition_Manager SHALL exclude competitions where finished status is true
2. THE Competition_Selector_Modal SHALL display only active competitions in alphabetical order by name
3. WHEN no active competitions exist, THE Competition_Selector_Modal SHALL display an appropriate message

### Requirement 5: Include Finished Status in Competition Retrieval

**User Story:** As a developer, I want the finished status included in competition data, so that UI components can make filtering decisions.

#### Acceptance Criteria

1. WHEN competitions are retrieved, THE Competition_Service SHALL include the finished status in the response
2. THE Competition_Manager SHALL expose the finished status in the competition data structure
3. THE Competition_Service SHALL support filtering competitions by finished status

### Requirement 6: Preserve Finished Competitions in Database

**User Story:** As a system administrator, I want finished competitions retained in the database, so that historical data and associations remain intact.

#### Acceptance Criteria

1. WHEN a competition is marked as finished, THE Competition_Service SHALL NOT delete the competition record
2. WHEN a competition is marked as finished, THE Competition_Service SHALL NOT delete associated competition results
3. WHEN a competition is marked as finished, THE Competition_Service SHALL NOT delete associated flagged transactions
4. THE Competition_Service SHALL allow retrieval of finished competitions when explicitly requested

### Requirement 7: Display Finished Status in Management UI

**User Story:** As a competition manager, I want to see which competitions are marked as finished, so that I can manage their status appropriately.

#### Acceptance Criteria

1. WHEN viewing the Competition_Management_View, THE Competition_Manager SHALL display the finished status for each competition
2. THE Competition_Management_View SHALL provide a visual indicator distinguishing finished competitions from active competitions
3. THE Competition_Management_View SHALL provide a toggle control to switch between viewing active and finished competitions

### Requirement 8: Toggle Finished Competition Filter in Management View

**User Story:** As a competition manager, I want to toggle between viewing active and finished competitions in the Competition Management View, so that I can manage both types of competitions as needed.

#### Acceptance Criteria

1. THE Competition_Management_View SHALL display only unfinished competitions by default
2. THE Competition_Management_View SHALL provide a toggle control that allows switching between active and finished competition views
3. WHEN the toggle is set to show finished competitions, THE Competition_Management_View SHALL display only competitions where finished status is true
4. WHEN the toggle is set to show active competitions, THE Competition_Management_View SHALL display only competitions where finished status is false
5. THE Competition_Management_View SHALL allow users to mark a finished competition as unfinished when viewing finished competitions
6. THE Competition_Management_View SHALL allow users to mark an active competition as finished when viewing active competitions
7. THE Competition_Management_View SHALL persist the toggle state during the user session
