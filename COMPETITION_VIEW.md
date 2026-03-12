# Competition View Requirements

## Overview
This document defines the requirements to extend the current functionality of the Aquarius Golf Competition Account Manager. The new functionality will add additional views to the UI for managing competition results and yearly presentations.

## Current System Context
The existing system includes the following packages:
- `competition-account-management`
- `competitions-csv-import`
- `competition-winnings-tracking`
- `server-side-migration`

## New Views

### 1. Weekly Competition Management View
### 2. Yearly Presentation View (to be defined later)

---

## 1. Weekly Competition Management View

### Overview
This view will consolidate competition management functionality and replace the current dialogue-based approach.

### Migration from Current System
- The "Competition CSV Import" section from the current app should be moved to this view
- This existing section will be identified as "Competition Accounts"

### Competition List & Management

#### Initial Display
When initiating this functionality:
- Display a list of existing competitions
- Provide functionality to add a new competition
- Replace the current pop-up dialogue with an integrated view
- This view will eventually contain all competitions for a year (~40 competitions)

#### Competition Attributes
When adding a new competition, capture:
- Competition name
- Competition date
- **Competition type**: Singles or Doubles (new attribute)
- Description (optional)
- Prize structure (optional)

---

## Competition Results Table

### Table Structure
For each competition, display a table with the following columns:

| Column | Description |
|--------|-------------|
| Finishing Position | Player's final position in the competition |
| Name | Player name |
| Gross Score | Gross score (Singles only) |
| Hcap | Handicap (Singles only) |
| Nett Score | Net score |
| Entry Paid | Whether entry fee was paid |
| Swindle Money Paid | Winnings paid to player |

---

## Populating Competition Results

### Mechanism 1: CSV Upload

#### Singles Competition CSV Format

**Example CSV:**
```csv
Pos,Name,Gross,Hcp,Nett,New Exact
"Division 1"
"1","David Durnan","86","15","71",""
"2","David Byrne","88","16","72",""
"3","Martin Bayode","92","17","75",""
"4","Craig Mathieson","85","9","76",""
"5","Sandy Cumming","85","9","76","AWAY"
"6","Paul Philip Atkinson","94","17","77",""
"7","Ian Fernandez","105","28","77",""
"8","Peter Pirrie","88","10","78",""
"9","Bob Howlett","92","14","78",""
"10","Patrick GREEN","98","17","81",""
"11","Doug Chapman","94","11","83",""
"12","Tom Ward","112","28","84",""
Date: ,"22/02/2026"
Score Type: ,"Strokeplay"
Course/Tee: ,"Aquarius GC (White) "
```

**Upload Validation:**
- Validate that `Pos`, `Name`, `Gross`, `Hcp`, `Nett` columns are present
- Add each row that contains a name

**Field Mapping:**
- `Pos` → `<Finishing Position>`
- `Name` → `<Name>`
- `Gross` → `<Gross Score>`
- `Hcp` → `<Hcap>`
- `Nett` → `<Nett Score>`

#### Doubles Competition CSV Format

**Example CSV:**
```csv
Pos,Name,Nett
"Division 1"
"1","A. REID / D. Chapman","-2"
"2","R. HUGHES / P. GREEN","-2"
"3","T. Ward / E. Richardson","-2"
"4","P. Atkinson / I. Khakwani","-4"
"5","B. Howlett / E. Ashworth","-4"
"6","S. Roff / A. DRYBURGH","-7"
"7","D. Thorburn / M. Bayode","-7"
"8","D. Durnan / B. JARVIS","-10"
Date: ,"01/03/2026"
Score Type: ,"ParBogey"
Course/Tee: ,"Aquarius GC (White) "
```

**Upload Validation:**
- Validate that `Pos`, `Name`, `Nett` columns are present
- For each name, split on the `/` character into 2 separate rows
- Remove any whitespace around the `/` when creating names

**Field Mapping:**
- `Pos` → `<Finishing Position>` (applied to both rows)
- `Name` → Split into 2 rows, one for each player name
- `Nett` → `<Nett Score>` (applied to both rows)

**Example Processing:**
```
Input:  "1","A. REID / D. Chapman","-2"

Output: Row 1: Pos=1, Name="A. REID", Nett=-2
        Row 2: Pos=1, Name="D. Chapman", Nett=-2
```

---

### Mechanism 2: Manual Entry

#### Manual Row Addition
- Allow users to add rows manually
- Users can populate one or more rows
- **Mandatory fields**: Player position and player name
- **Optional fields**: All other columns can be added later

#### Field Requirements
- `<Finishing Position>` - **Required**
- `<Name>` - **Required**
- `<Gross Score>` - Optional
- `<Hcap>` - Optional
- `<Nett Score>` - Optional
- `<Entry Paid>` - Optional
- `<Swindle Money Paid>` - Auto-populated (see below)

---

## Swindle Money Integration

### Automatic Population
When a user identifies "Flag As Winnings" in the Transformed Records section:

1. System should populate `<Swindle Money Paid>` in the appropriate Competition Table
2. Match on the player name:
   - Competition Table: `<Name>`
   - Transformed Records: `<Player>`
3. Update the corresponding row with the winnings amount

### Matching Logic
- Exact name match between Competition Table and Transaction Player field
- Case-insensitive matching recommended
- Handle name variations (e.g., "A. REID" vs "Alastair REID")

---

## Data Persistence

### Database Requirements
- Use PostgreSQL database to persist all competition data
- Store competition metadata (name, date, type, etc.)
- Store competition results (all table rows)
- Link winnings payments to competition results
- Maintain referential integrity between competitions and transactions

### Suggested Database Schema

#### Competitions Table
```sql
CREATE TABLE competitions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('singles', 'doubles')),
  description TEXT,
  prize_structure TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Competition Results Table
```sql
CREATE TABLE competition_results (
  id SERIAL PRIMARY KEY,
  competition_id INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  finishing_position INTEGER NOT NULL,
  player_name VARCHAR(255) NOT NULL,
  gross_score INTEGER,
  handicap INTEGER,
  nett_score INTEGER,
  entry_paid BOOLEAN DEFAULT FALSE,
  swindle_money_paid DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Future Development

### 2. Yearly Presentation View
This view will be defined after the Weekly Competition Management functionality has been implemented and tested.

---

## Implementation Notes

### Phase 1: Core Functionality
1. Create Weekly Competition Management view
2. Migrate existing Competition CSV Import section
3. Implement competition list and add functionality
4. Add competition type attribute (Singles/Doubles)
5. Create competition results table UI

### Phase 2: CSV Upload
1. Implement Singles CSV parser and validator
2. Implement Doubles CSV parser with name splitting
3. Add upload UI and error handling
4. Test with sample data

### Phase 3: Manual Entry
1. Implement manual row addition UI
2. Add field validation
3. Enable editing of existing rows
4. Test data entry workflows

### Phase 4: Swindle Money Integration
1. Link flagged transactions to competition results
2. Implement name matching logic
3. Auto-populate Swindle Money Paid field
4. Test end-to-end workflow

### Phase 5: Database Integration
1. Create database schema
2. Implement data persistence layer
3. Add CRUD operations for competitions and results
4. Test data integrity and performance

---

## Success Criteria

- [ ] Weekly Competition Management view is accessible and functional
- [ ] Competition Accounts section is successfully migrated
- [ ] Users can add competitions with Singles/Doubles type
- [ ] Singles CSV upload works correctly with field mapping
- [ ] Doubles CSV upload splits names correctly
- [ ] Manual entry allows adding and editing rows
- [ ] Swindle Money Paid auto-populates from flagged transactions
- [ ] All data persists correctly in PostgreSQL database
- [ ] System handles ~40 competitions per year efficiently
- [ ] UI is responsive and user-friendly

---

## Technical Considerations

### Frontend
- Extend existing UI framework
- Reuse existing components where possible
- Implement CSV parsing in JavaScript
- Add form validation for manual entry

### Backend
- Create new API endpoints for competitions and results
- Implement CSV parsing and validation
- Add name matching algorithm for swindle money
- Ensure transaction safety for database operations

### Testing
- Unit tests for CSV parsing logic
- Integration tests for API endpoints
- End-to-end tests for complete workflows
- Performance tests with large datasets

---

## Questions for Clarification

1. Should the system support editing competition results after initial upload? Yes
2. How should name matching handle partial matches or typos? Only exct macthes
3. Should there be a confirmation step before auto-populating Swindle Money Paid? competiton table must be pouplated with matched Player Name  before the Flag as Winnings can be asssigned
4. What happens if a player name appears in multiple competitions? A player can only appear once per competition. But can appear in more than 1 competition
5. Should the system track historical changes to competition results? No
6. Are there any specific validation rules for scores (e.g., min/max values)? No
7. Should the system support bulk operations (e.g., delete multiple results)? No


Each Competition shoud also be identfied with a "For Presentation Season" Which will be an inremental annual list. Startiing with "Season: Winter 25-Summer 26" and then  "Season: Winter 26-Summer 27". The ability to add these annualy needs to exist, or auto increment. Futrure work will be that when all the competitions for a Presntation Season are marked as complete then the Competition View will archive (remove to a different view) all the Comptitions for that Presentation season and reuse the view to poplate the competition for the next prestation season