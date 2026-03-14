# View Clarification and Naming Conventions

## Correct Understanding of Application Views

### 1. "Competition Accounts" Button
**Purpose**: Transaction and Financial Management
**What Users See**:
- Transaction CSV upload interface
- Save to Database functionality  
- Weekly transaction summaries
- Transaction flagging for winnings
- Competition pot balances
- Customer account balances
- Financial tracking and reporting

**Technical Implementation**:
- Shows: `data-viewer`, `upload-section`, `transaction-summary-section`
- Hides: `competition-accounts-section`, `presentation-night-section`
- Function: `showCompetitionAccountsView()`

### 2. "Manage Competitions" Button  
**Purpose**: Competition and Results Management
**What Users See**:
- Competition creation/deletion
- Competition status management (finished/active)
- Results entry and editing
- CSV results import/export
- Season management
- Competition results tables

**Technical Implementation**:
- Shows: `competition-accounts-section` (contains competition management UI)
- Hides: `data-viewer`, `upload-section`, `transaction-summary-section`
- Function: `showCompetitionResultsView()`
- Component: `CompetitionManagementView` class

### 3. "Presentation Night" Button
**Purpose**: Winnings Distribution Management
**What Users See**:
- Presentation night winnings distribution
- Distribution calculations
- Winnings allocation interface

**Technical Implementation**:
- Shows: `presentation-night-section`
- Hides: all other sections
- Function: `showPresentationNightView()`

## Key Corrections Made

1. **Removed Confusing Modal**: Eliminated `CompetitionManagerUI` modal that was causing navigation confusion
2. **Separated Views**: "Competition Accounts" and "Manage Competitions" now show different interfaces
3. **Renamed Components**: 
   - `CompetitionAccountsView` → `CompetitionManagementView` (reflects actual purpose)
   - Updated function documentation to clarify purposes
4. **Fixed Navigation**: Each button now shows the correct view for its intended purpose

## File Structure
- `backend/public/app.js` - Main navigation logic
- `backend/public/competitionManagementView.js` - Competition/Results management interface
- `backend/public/index.html` - HTML structure with correct section names

## No More Confusion
- ✅ "Competition Accounts" = Transaction/Financial management
- ✅ "Manage Competitions" = Competition/Results management  
- ✅ No modal overlap or navigation conflicts
- ✅ Clear separation of concerns