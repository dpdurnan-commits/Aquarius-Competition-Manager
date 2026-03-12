# Implementation Plan: Presentation Night Winnings Distribution

## Overview

This implementation plan breaks down the Presentation Night Winnings Distribution feature into discrete coding tasks. The feature enables users to:

1. Distribute accumulated competition pot funds to winners at the end of each presentation season
2. Assign cash amounts to individual winners or winning pairs
3. Record general competition costs (engravings, stationery, equipment, etc.)
4. View competition cost history and totals
5. Track all costs that are deducted from the competition pot

The implementation follows the existing architectural patterns: TypeScript backend with service-based architecture, and vanilla JavaScript frontend with component-based design.

## Tasks

- [x] 1. Create database schema for distributions and competition costs
  - Create migration file for `presentation_night_distributions` table
  - Create migration file for `distribution_assignments` table
  - Create migration file for `competition_costs` table
  - Add indexes for performance (season_id, distribution_id, transaction_date)
  - Add constraints for data integrity (check amounts >= 0, unique active season, unique cost descriptions)
  - _Requirements: 2.5, 4.4, 6.1, 6.3, 9.4, 11.1_

- [x] 2. Implement DistributionService core methods
  - [x] 2.1 Implement getSeasonWinners() method
    - Query competitions for a season with results
    - Identify position 1 winners for each competition
    - Structure data with competition details and winner information
    - Handle both singles (1 winner) and doubles (2 winners) competitions
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.1, 8.2, 8.5_
  
  - [ ]* 2.2 Write property test for getSeasonWinners()
    - **Property 2: Winner Identification for Singles**
    - **Validates: Requirements 1.3, 8.1**
  
  - [ ]* 2.3 Write property test for doubles winner identification
    - **Property 3: Winner Identification for Doubles**
    - **Validates: Requirements 1.3, 1.4, 8.2, 8.5**

- [x] 3. Implement distribution creation logic
  - [x] 3.1 Implement createDistribution() method
    - Validate season exists and has no active distribution
    - Validate all competitions belong to the season
    - Calculate total amount from assignments
    - Create cost transaction with proper fields
    - Create distribution record with transaction reference
    - Create assignment records for each competition
    - Wrap all operations in database transaction
    - _Requirements: 2.5, 4.4, 4.5, 4.6, 6.3_
  
  - [ ]* 3.2 Write property test for assignment round trip
    - **Property 7: Assignment Round Trip**
    - **Validates: Requirements 2.5**
  
  - [ ]* 3.3 Write property test for total calculation
    - **Property 9: Total Calculation**
    - **Validates: Requirements 3.1, 3.2**
  
  - [ ]* 3.4 Write property test for pot balance deduction
    - **Property 13: Pot Balance Deduction**
    - **Validates: Requirements 4.7**
  
  - [x] 3.5 Write unit tests for createDistribution()
    - Test duplicate distribution prevention
    - Test invalid season ID
    - Test competition from different season
    - Test transaction rollback on failure
    - _Requirements: 4.4, 6.3_

- [x] 4. Implement distribution query and void methods
  - [x] 4.1 Implement getDistributionBySeason() method
    - Query distribution by season ID
    - Include assignment records
    - Return null if no distribution exists
    - _Requirements: 6.1, 6.2_
  
  - [x] 4.2 Implement voidDistribution() method
    - Mark distribution as voided
    - Set voided_at timestamp
    - Prevent voiding already voided distributions
    - _Requirements: 6.4_
  
  - [x] 4.3 Write unit tests for query and void methods
    - Test getDistributionBySeason with no distribution
    - Test getDistributionBySeason with existing distribution
    - Test voidDistribution success case
    - Test voidDistribution with already voided distribution
    - _Requirements: 6.1, 6.2, 6.4_

- [x] 5. Checkpoint - Ensure backend service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement competition costs service methods
  - [x] 6.1 Implement createCompetitionCost() method
    - Validate description is unique (check existing costs)
    - Validate amount is positive with up to 2 decimal places
    - Create cost transaction with current date
    - Create competition_costs record with transaction reference
    - Wrap operations in database transaction
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 11.1, 11.2, 11.3_
  
  - [x] 6.2 Implement getAllCompetitionCosts() method
    - Query all competition costs ordered by date (most recent first)
    - Calculate total of all costs
    - Return costs array and total
    - _Requirements: 10.1, 10.2, 10.3, 10.5_
  
  - [x] 6.3 Implement getCompetitionCostsByDateRange() method
    - Query costs filtered by date range
    - Calculate total of filtered costs
    - Return filtered costs and total
    - _Requirements: 10.4, 10.5_
  
  - [x] 6.4 Write unit tests for competition costs methods
    - Test createCompetitionCost with duplicate description
    - Test createCompetitionCost with invalid amount
    - Test getAllCompetitionCosts with empty database
    - Test getCompetitionCostsByDateRange with various ranges
    - _Requirements: 9.4, 9.5, 11.1_

- [x] 7. Create competition costs API routes
  - [x] 7.1 Create POST /api/competition-costs endpoint
    - Validate request body (description, amount)
    - Call DistributionService.createCompetitionCost()
    - Return created cost record
    - Handle duplicate description error (409)
    - Handle validation errors (400)
    - _Requirements: 9.1, 9.2, 9.3, 11.1, 11.2, 11.3_
  
  - [x] 7.2 Create GET /api/competition-costs endpoint
    - Call DistributionService.getAllCompetitionCosts()
    - Return costs array and total
    - _Requirements: 10.1, 10.2, 10.3, 10.5_
  
  - [x] 7.3 Create GET /api/competition-costs/range endpoint
    - Validate query parameters (startDate, endDate)
    - Call DistributionService.getCompetitionCostsByDateRange()
    - Return filtered costs and total
    - _Requirements: 10.4, 10.5_
  
  - [x] 7.4 Write integration tests for competition costs routes
    - Test full cost creation workflow
    - Test duplicate description prevention
    - Test date range filtering
    - _Requirements: 9.6, 11.1, 10.4_

- [x] 8. Checkpoint - Ensure backend competition costs tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Create distribution API routes
  - [x] 9.1 Create GET /api/distributions/season/:seasonId/winners endpoint
    - Call DistributionService.getSeasonWinners()
    - Return structured winner data
    - Handle season not found error (404)
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 9.2 Create POST /api/distributions endpoint
    - Validate request body (seasonId, assignments, transactionDate)
    - Validate date format (YYYY-MM-DD)
    - Call DistributionService.createDistribution()
    - Return created distribution
    - Handle validation errors (400)
    - Handle duplicate distribution error (409)
    - _Requirements: 2.5, 4.3, 4.4, 6.3_
  
  - [x] 9.3 Create GET /api/distributions/season/:seasonId endpoint
    - Call DistributionService.getDistributionBySeason()
    - Return distribution with assignments
    - Return 404 if no distribution exists
    - _Requirements: 6.1, 6.2_
  
  - [x] 9.4 Create DELETE /api/distributions/:id/void endpoint
    - Call DistributionService.voidDistribution()
    - Return success response
    - Handle distribution not found error (404)
    - _Requirements: 6.4_
  
  - [x] 9.5 Write integration tests for distribution routes
    - Test full distribution workflow
    - Test duplicate prevention
    - Test void and recreate workflow
    - _Requirements: 4.4, 6.3, 6.4_

- [ ]* 10. Write property test for date validation
  - **Property 10: Date Format Validation**
  - **Validates: Requirements 4.3**

- [x] 11. Implement API client methods
  - Add getSeasonWinners(seasonId) method
  - Add createDistribution(dto) method
  - Add getDistributionBySeason(seasonId) method
  - Add voidDistribution(distributionId) method
  - Add createCompetitionCost(dto) method
  - Add getAllCompetitionCosts() method
  - Add getCompetitionCostsByDateRange(startDate, endDate) method
  - Handle HTTP errors and convert to user-friendly messages
  - _Requirements: 1.1, 2.5, 4.4, 6.1, 6.4, 9.1, 10.1_

- [x] 12. Implement WinnersTable component
  - [x] 12.1 Create WinnersTable class with render() method
    - Render table with columns: Competition, Date, Type, Winner(s), Amount
    - Display competition name, date, and type for each row
    - Display winner names (single for singles, pair for doubles)
    - Display "No winner recorded" for competitions without position 1 results
    - Render input fields for competitions with winners
    - Disable input fields for competitions without winners
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 7.1, 8.4, 8.5_
  
  - [x] 12.2 Implement amount input validation
    - Validate non-negative decimal numbers
    - Validate up to two decimal places
    - Display inline error messages for invalid input
    - Prevent form submission with invalid amounts
    - _Requirements: 2.2, 2.3, 2.4_
  
  - [ ]* 12.3 Write property test for amount validation
    - **Property 6: Amount Validation**
    - **Validates: Requirements 2.2, 2.3, 2.4**
  
  - [x] 12.4 Implement getAssignments() method
    - Collect all assignment values from input fields
    - Return array of {competitionId, amount} objects
    - Exclude competitions without winners
    - _Requirements: 2.5, 7.2, 7.4_
  
  - [x] 12.5 Implement validateAssignments() method
    - Check if all winners have assigned amounts (including zero)
    - Check if any amounts are missing (empty fields)
    - Return validation result with warning message if incomplete
    - _Requirements: 5.1, 5.2, 5.4, 5.5_
  
  - [x] 12.6 Write unit tests for WinnersTable
    - Test rendering with empty winners array
    - Test rendering with mix of singles and doubles
    - Test rendering with competitions without winners
    - Test input validation edge cases
    - _Requirements: 1.1, 1.6, 2.2, 7.1_

- [x] 13. Implement DistributionSummary component
  - [x] 13.1 Create DistributionSummary class with render() method
    - Display total distribution amount
    - _Requirements: 3.1, 3.3_
  
  - [x] 13.2 Implement updateTotals() method
    - Recalculate totals when amounts change
    - Update display immediately
    - _Requirements: 3.2_
  
  - [x] 13.3 Write unit tests for DistributionSummary
    - Test calculation with zero amounts
    - Test floating point precision handling
    - _Requirements: 3.1_

- [x] 14. Implement CompetitionCostsManager component
  - [x] 14.1 Create CompetitionCostsManager class with render() method
    - Render form with description and amount input fields
    - Render submit button
    - Render cost history table
    - Display total of all costs
    - _Requirements: 9.1, 9.2, 9.3, 10.1, 10.2, 10.5_
  
  - [x] 14.2 Implement loadCosts() method
    - Fetch all costs from API
    - Display costs in table ordered by date
    - Calculate and display total
    - _Requirements: 10.1, 10.2, 10.3, 10.5_
  
  - [x] 14.3 Implement handleSubmitCost() method
    - Validate description is not empty
    - Validate description is unique (check against existing costs)
    - Validate amount is positive with up to 2 decimal places
    - Call API to create cost
    - Display success message
    - Refresh cost list
    - Clear form inputs
    - Handle duplicate description error
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 11.1, 11.2, 11.3, 11.4_
  
  - [x] 14.4 Implement date range filtering
    - Add date range input fields
    - Call API with date range parameters
    - Update displayed costs and total
    - _Requirements: 10.4_
  
  - [x] 14.5 Write unit tests for CompetitionCostsManager
    - Test form validation
    - Test duplicate description handling
    - Test cost list rendering
    - Test date range filtering
    - _Requirements: 9.4, 9.5, 11.1, 10.4_

- [x] 15. Implement PresentationNightView main component
  - [x] 15.1 Create PresentationNightView class with initialization
    - Initialize with apiClient
    - Create child components (WinnersTable, DistributionSummary, CompetitionCostsManager)
    - Set up event listeners
    - _Requirements: 1.1, 9.1_
  
  - [x] 15.2 Implement loadSeasonWinners() method
    - Fetch winners from API
    - Check for existing distribution
    - Render WinnersTable with winners data
    - Render DistributionSummary
    - Display read-only mode if distribution exists
    - _Requirements: 1.1, 6.1, 6.2_
  
  - [x] 15.3 Implement handleConfirmDistribution() method
    - Get assignments from WinnersTable
    - Validate assignments completeness
    - Show warning if incomplete, allow proceeding
    - Prompt for transaction date
    - Validate date format
    - Show confirmation dialog with total amount
    - Call API to create distribution
    - Handle success and error responses
    - Refresh view to show read-only state
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.8, 5.1, 5.2, 5.3_
  
  - [x] 15.4 Write unit tests for PresentationNightView
    - Test initialization
    - Test loadSeasonWinners with various scenarios
    - Test confirmation workflow
    - Test error handling
    - _Requirements: 4.1, 4.3, 5.1_

- [x] 16. Checkpoint - Ensure frontend component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Integrate PresentationNightView into main application
  - Add navigation link to presentation night distribution
  - Wire up PresentationNightView in app.js
  - Add CSS styles for distribution UI
  - Test navigation and component rendering
  - _Requirements: 1.1_

- [ ]* 18. Write property test for winner exclusion from total
  - **Property 19: Winner Exclusion from Total**
  - **Validates: Requirements 7.2, 7.4**

- [x] 19. Write end-to-end integration tests
  - Test full distribution workflow (create season, add results, assign winnings, confirm)
  - Test duplicate prevention workflow
  - Test void and recreate workflow
  - Test mixed winners scenario (some competitions without winners)
  - Test both singles and doubles competitions
  - Test competition costs workflow (create cost, view history, filter by date)
  - Test duplicate cost description prevention
  - _Requirements: 1.1, 2.5, 4.4, 4.7, 6.3, 6.4, 7.3, 8.1, 8.2, 9.6, 11.1_

- [x] 20. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Database migrations should be run before testing backend services
- Property tests validate universal correctness properties across randomized inputs
- Unit tests validate specific examples and edge cases
- Integration tests verify complete workflows
- The feature integrates with existing transaction and summary systems
- All monetary amounts use DECIMAL(10, 2) for precision
- Database transactions ensure atomicity of distribution creation
