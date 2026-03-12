# Competition Account Manager - User Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Managing Presentation Seasons](#managing-presentation-seasons)
4. [Managing Competitions](#managing-competitions)
5. [Managing Competition Results](#managing-competition-results)
6. [CSV Upload for Competition Results](#csv-upload-for-competition-results)
7. [Manual Result Entry and Editing](#manual-result-entry-and-editing)
8. [Swindle Money Tracking](#swindle-money-tracking)
9. [Flagging Transactions as Winnings](#flagging-transactions-as-winnings)
10. [Viewing Weekly Details](#viewing-weekly-details)
11. [Understanding the Weekly Summary](#understanding-the-weekly-summary)
12. [Troubleshooting](#troubleshooting)
13. [Best Practices](#best-practices)

## Introduction

The Competition Account Manager helps you manage golf competition accounts by:

- Organizing competitions into presentation seasons
- Tracking competition results for singles and doubles competitions
- Uploading results via CSV files
- Manually entering and editing competition results
- Automatically linking prize money payments to competition results
- Tracking individual competition winnings paid to players
- Associating prize payments with specific competitions
- Calculating accurate Competition Pot balances
- Providing detailed weekly financial summaries

This guide will walk you through all the features step by step.

## Getting Started

### Initial Setup

1. **Open the Application**
   - Open `index.html` in a modern web browser (Chrome, Firefox, Safari, or Edge)
   - The application runs entirely in your browser - no installation required

2. **Import Your Transaction Data**
   - Click the "Choose File" button
   - Select your CSV file containing transaction data
   - Click "Import CSV"
   - Wait for the import to complete (you'll see a success message)

3. **View Your Data**
   - Scroll down to see the "Transformed Records" table with all transactions
   - Scroll further to see the "Aquarius Golf-Competition Transaction Summary" table

### CSV File Requirements

Your CSV file must have these columns:
```
Date,Time,Till,Type,Member,Player,Competition,Price,Discount,Subtotal,VAT,Total
```

Example row:
```
26-08-2025,18:19,Till 1,Topup (Competitions),Alastair REID,,October Medal,50.00,0.00,50.00,0.00,50.00
```

## Managing Presentation Seasons

### What is a Presentation Season?

A presentation season groups competitions by their award presentation period. Seasons follow the format:
```
Season: Winter YY-Summer YY
```

For example: "Season: Winter 25-Summer 26" represents competitions from Winter 2025 through Summer 2026.

### Creating a Presentation Season

1. Navigate to the **Competition Accounts** view
2. In the Presentation Seasons section, click **"New Season"**
3. Choose one of two options:

   **Option A: Manual Entry**
   - Enter the season name in the format "Season: Winter YY-Summer YY"
   - Example: "Season: Winter 25-Summer 26"
   - Click **"Create Season"**

   **Option B: Auto-Increment**
   - Click **"Auto-Increment Season"**
   - The system automatically creates the next season based on the most recent one
   - Example: If the latest season is "Winter 25-Summer 26", auto-increment creates "Winter 26-Summer 27"

**Important Notes:**
- Season names must follow the exact format: "Season: Winter YY-Summer YY"
- The winter year must be less than or equal to the summer year
- Season names must be unique
- Only two-digit years are accepted (e.g., 25, not 2025)

### Setting the Active Season

1. In the Presentation Seasons list, find the season you want to activate
2. Click the **"Set Active"** button next to the season name
3. The season is marked with a green "Active" badge
4. Only one season can be active at a time (setting a new active season automatically deactivates the previous one)

**Why Set an Active Season?**
- The active season is the default when creating new competitions
- It helps you focus on current competitions
- It's used for filtering and reporting

### Viewing All Seasons

All presentation seasons are displayed in chronological order, with the most recent at the top. Each season shows:
- Season name (e.g., "Season: Winter 25-Summer 26")
- Active status (green badge if active)
- Number of competitions in the season
- Actions (Set Active, Edit, Delete)

## Managing Competitions

### Competition Types

The system supports two types of competitions:

**Singles Competitions:**
- Individual players compete independently
- Results include: Position, Name, Gross Score, Handicap, Nett Score, Entry Paid, Swindle Money

**Doubles Competitions:**
- Pairs of players compete as teams
- Results include: Position, Name, Nett Score, Entry Paid, Swindle Money
- Gross Score and Handicap are not tracked for doubles

### Creating a Competition

1. Navigate to the **Competition Accounts** view
2. In the Competitions section, click **"New Competition"**
3. Fill in the competition details:
   - **Name:** Competition name (e.g., "Weekly Medal", "Monthly Stableford")
   - **Date:** Competition date (DD/MM/YYYY format)
   - **Type:** Select "Singles" or "Doubles"
   - **Presentation Season:** Select the season this competition belongs to
   - **Description:** (Optional) Additional details about the competition
   - **Prize Structure:** (Optional) Prize breakdown (e.g., "1st: £50, 2nd: £30, 3rd: £20")
4. Click **"Create Competition"**

**Important Notes:**
- All fields except Description and Prize Structure are required
- Competition names don't have to be unique (you can have multiple "Weekly Medal" competitions)
- The date helps distinguish competitions with the same name
- Competitions are automatically associated with the selected presentation season

### Filtering Competitions by Season

1. In the Competitions section, use the **Season Filter** dropdown
2. Select a presentation season to view only competitions from that season
3. Select "All Seasons" to view all competitions
4. The competition list updates immediately

### Viewing Competition Details

Click on any competition in the list to view its results. The results table displays:
- Competition name, date, and type
- All competition results (ordered by finishing position)
- Entry payment status for each player
- Swindle money paid to each player

### Editing a Competition

1. Find the competition in the list
2. Click the **"Edit"** icon (pencil) next to the competition name
3. Update the competition details
4. Click **"Save"** to confirm

**Note:** Changing the competition type (Singles ↔ Doubles) will affect which fields are displayed in the results table.

### Deleting a Competition

1. Find the competition in the list
2. Click the **"Delete"** icon (trash can)
3. Confirm the deletion when prompted

**Important:** Deleting a competition will also delete all associated results. This action cannot be undone.

## Managing Competition Results

### Viewing Competition Results

1. Click on a competition in the competition list
2. The results table displays below, showing:
   - **For Singles:** Pos, Name, Gross, Hcp, Nett, Entry Paid, Swindle Money
   - **For Doubles:** Pos, Name, Nett, Entry Paid, Swindle Money
3. Results are ordered by finishing position (ascending)

### Understanding the Results Table

**Finishing Position (Pos):**
- The player's final position in the competition
- Must be a positive integer
- Ties are allowed (multiple players can have the same position)

**Name:**
- Player's full name
- Required field
- Case-insensitive for matching purposes

**Gross Score (Singles only):**
- Player's total strokes before handicap adjustment
- Optional field

**Handicap (Hcp) (Singles only):**
- Player's handicap for the competition
- Optional field

**Nett Score:**
- Player's score after handicap adjustment (Gross - Handicap)
- Optional field

**Entry Paid:**
- Checkbox indicating whether the player paid their entry fee
- Defaults to unchecked (not paid)

**Swindle Money:**
- Prize money paid to the player
- Auto-populated when transactions are flagged as winnings
- Can be manually edited if needed
- Must be zero or positive

## CSV Upload for Competition Results

### CSV Upload Benefits

Uploading results via CSV is the fastest way to populate competition results, especially for competitions with many participants. The system:
- Validates the CSV format
- Skips invalid rows automatically
- Creates all results in a single transaction
- Provides detailed error messages if issues are found

### Singles Competition CSV Format

**Required Columns:** `Pos`, `Name`, `Gross`, `Hcp`, `Nett`

**Example CSV:**
```csv
Pos,Name,Gross,Hcp,Nett
1,John SMITH,85,12,73
2,Jane DOE,88,15,73
3,Bob JONES,90,16,74
4,Alice BROWN,92,18,74
```

**CSV Rules:**
- Column names must match exactly (case-sensitive)
- All five columns are required
- Rows with empty names are automatically skipped
- Rows matching "Division [0-9]+" are skipped (division headers)
- All field values are trimmed of whitespace
- Maximum file size: 5MB
- Maximum rows: 1000 per upload

### Doubles Competition CSV Format

**Required Columns:** `Pos`, `Name`, `Nett`

**Example CSV:**
```csv
Pos,Name,Nett
1,John SMITH / Jane DOE,73
2,Bob JONES / Alice BROWN,74
3,Charlie GREEN / Diana WHITE,75
```

**CSV Rules:**
- Column names must match exactly (case-sensitive)
- All three columns are required
- Names must be separated by " / " (space-slash-space)
- Each row creates TWO result records (one per player)
- Both players receive the same position and nett score
- Rows with empty names are automatically skipped
- Rows matching "Division [0-9]+" are skipped
- Maximum file size: 5MB
- Maximum rows: 1000 per upload

### Uploading a CSV File

1. Select a competition from the competition list
2. In the results section, click **"Upload CSV"**
3. Click **"Choose File"** and select your CSV file
4. The system validates the file and shows a preview
5. Review the parsed results:
   - Green rows: Valid results that will be imported
   - Red rows: Invalid results with error messages
6. If satisfied, click **"Confirm Upload"**
7. If there are errors, fix your CSV file and try again

**Success Message:**
```
Successfully imported 24 results for Weekly Medal
```

**Error Example:**
```
CSV Parse Error: Missing required column 'Hcp' in singles competition CSV
```

### Common CSV Upload Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Missing required column 'X' | CSV is missing a required column | Add the missing column to your CSV |
| Invalid data in row 5, field 'Pos' | Position is not a number | Ensure all positions are integers |
| Doubles name must contain "/" | Doubles CSV name missing separator | Add " / " between player names |
| File size exceeds 5MB | CSV file too large | Split into multiple files or remove unnecessary data |
| CSV contains more than 1000 rows | Too many rows | Split into multiple uploads |

### Exporting Results as CSV

1. Select a competition from the competition list
2. Click **"Export CSV"** in the results section
3. The system downloads a CSV file with all results
4. The exported CSV can be re-imported later (round-trip compatible)

**Use Cases for Export:**
- Backup competition results
- Share results with other systems
- Edit results in Excel/Google Sheets and re-import
- Archive historical data

## Manual Result Entry and Editing

### Adding a Manual Result

Use manual entry when:
- You have only a few results to add
- CSV upload is not available
- You need to add a single result to existing data

**Steps:**
1. Select a competition from the competition list
2. In the results section, click **"Add Manual Entry"**
3. Fill in the result details:
   - **Position:** Finishing position (required, positive integer)
   - **Name:** Player name (required)
   - **Gross Score:** (Singles only, optional)
   - **Handicap:** (Singles only, optional)
   - **Nett Score:** (Optional)
   - **Entry Paid:** Check if player paid entry fee
   - **Swindle Money:** Prize amount (optional, auto-populated from transactions)
4. Click **"Save Result"**

**Validation:**
- Position must be a positive integer (1, 2, 3, ...)
- Name cannot be empty
- Swindle Money must be zero or positive
- For Singles competitions, Gross/Handicap fields are available
- For Doubles competitions, Gross/Handicap fields are hidden

### Editing an Existing Result

1. Find the result in the results table
2. Click the **"Edit"** icon (pencil) next to the result
3. Update the fields you want to change
4. Click **"Save"** to confirm

**Inline Editing:**
- Some fields support inline editing (click the cell to edit)
- Press Enter to save, Escape to cancel
- Changes are saved immediately to the database

### Deleting a Result

1. Find the result in the results table
2. Click the **"Delete"** icon (trash can)
3. Confirm the deletion when prompted

**Important:** Deleting a result cannot be undone. The swindle money association (if any) will be lost.

### Bulk Editing Tips

For bulk edits:
1. Export the results as CSV
2. Edit the CSV in Excel/Google Sheets
3. Delete all existing results (or delete and recreate the competition)
4. Re-import the edited CSV

This is faster than editing results one by one.

## Swindle Money Tracking

### What is Swindle Money?

Swindle money is prize money paid to competition winners. The system automatically links prize payments to competition results, making it easy to track who has been paid and who hasn't.

### How Auto-Population Works

When you flag a transaction as winnings (see [Flagging Transactions](#flagging-transactions-as-winnings)):

1. The system extracts the player name from the transaction
2. It searches all competition results for matching names (case-insensitive)
3. It finds the most recent competition where the player has an unpaid swindle money field
4. It populates the swindle money field with the transaction amount
5. The result is updated in the database

**Name Matching:**
- Exact match (case-insensitive): "John SMITH" matches "john smith"
- Initial + surname match: "J. SMITH" matches "John SMITH"
- Surname-only match: "SMITH" matches "John SMITH" (if unique)

**Example:**
```
Transaction: "J. SMITH" paid £50
Results:
  - Competition A (2024-01-15): "John SMITH", swindle_money_paid = NULL ← MATCH
  - Competition B (2024-01-08): "John SMITH", swindle_money_paid = £30
  - Competition C (2024-01-01): "James SMITH", swindle_money_paid = NULL

Result: Competition A result updated with £50
```

### Viewing Swindle Money Status

In the results table:
- **Empty cell:** Player has not been paid
- **£XX.XX:** Player has been paid this amount
- **Green highlight:** Recently auto-populated from a transaction

### Manually Setting Swindle Money

If auto-population doesn't work or you need to override:

1. Find the result in the results table
2. Click the **"Edit"** icon
3. Enter the swindle money amount in the "Swindle Money" field
4. Click **"Save"**

**Use Cases:**
- Cash payments not recorded in transactions
- Corrections to auto-populated amounts
- Historical data entry

### Troubleshooting Swindle Money

**Problem: Swindle money not auto-populating**

Possible causes:
1. Player name in transaction doesn't match result name
   - Check spelling and formatting
   - Use "Edit Flag" to manually select the correct result
2. Player already has swindle money populated for all recent competitions
   - The system only populates NULL/empty fields
   - Manually edit if you need to update an existing value
3. No matching competition results exist
   - Ensure you've created the competition and added results
   - Check that the player name is in the results

**Problem: Wrong player matched**

If the system matches the wrong player (e.g., two players with the same surname):
1. Click "Edit Flag" on the transaction
2. Manually select the correct competition and player
3. Or manually edit the result's swindle money field

## Managing Competitions

### Creating a Competition

1. Click the **"Manage Competitions"** button at the top of the page
2. A modal window will open showing your competition list
3. In the "Add New Competition" section:
   - Enter the competition name (e.g., "October Medal 2025")
   - Click **"Add Competition"**
4. The competition appears in the list below

**Important Notes:**
- Competition names must be unique (case-insensitive)
- You cannot create two competitions with the same name
- Competition names are trimmed of extra spaces

### Editing a Competition

1. Open the Competition Manager (click "Manage Competitions")
2. Find the competition you want to edit
3. Click the **"Edit"** button next to the competition name
4. Enter the new name
5. Click **"Save"** to confirm

**Note:** The new name must still be unique across all competitions.

### Deleting a Competition

1. Open the Competition Manager
2. Find the competition you want to delete
3. Click the **"Delete"** button
4. Confirm the deletion when prompted

**Important:** You cannot delete a competition if any transactions are flagged with it. You must first unflag all associated transactions.

If deletion fails, you'll see an error message like:
```
Cannot delete 'October Medal 2025'. It has 3 associated transactions.
Please unflag these transactions first.
```

## Flagging Transactions as Winnings

### What is Flagging?

Flagging marks a "Topup (Competitions)" transaction as prize money paid to a player. This:
- Updates the "Competition Winnings Paid" column in the weekly summary
- Reduces the Competition Pot balance
- Associates the payment with a specific competition

### Flagging from the Transformed Records View

1. **Locate the Transaction**
   - Scroll through the "Transformed Records" table
   - Find the "Topup (Competitions)" transaction you want to flag
   - Only "Topup (Competitions)" transactions can be flagged

2. **Flag the Transaction**
   - Click the **"Flag as Winnings"** button in the Actions column
   - A modal opens showing all available competitions

3. **Select the Competition**
   - Click on the competition name (e.g., "October Medal 2025")
   - The modal closes automatically

4. **Verify the Flag**
   - The transaction row now shows a 🏆 trophy icon
   - The competition name appears as a badge
   - The button changes to **"Edit Flag"**
   - The weekly summary updates automatically

### Flagging from the Weekly Drill-Down View

1. **Open the Weekly View**
   - In the "Transaction Summary" table, click any week row
   - A modal opens showing all transactions for that week

2. **Flag Transactions**
   - Find the "Topup (Competitions)" transaction
   - Click **"Flag as Winnings"**
   - Select the competition
   - The drill-down view refreshes automatically

3. **Close the View**
   - Click the **X** button in the top-right corner
   - Or press the **Escape** key
   - Or click outside the modal

### Editing a Flagged Transaction

1. **Locate the Flagged Transaction**
   - Look for transactions with the 🏆 trophy icon
   - These can be in either the Transformed Records or Weekly Drill-Down view

2. **Edit the Flag**
   - Click the **"Edit Flag"** button
   - A modal opens with options:
     - Select a different competition
     - Remove the flag entirely

3. **Make Your Choice**
   - To change the competition: Click a different competition name
   - To remove the flag: Click **"Remove Flag"**

4. **Verify the Change**
   - The transaction updates immediately
   - The weekly summary recalculates automatically

### Removing a Flag

1. Find the flagged transaction
2. Click **"Edit Flag"**
3. Click **"Remove Flag"**
4. The transaction returns to unflagged state
5. The weekly summary updates

## Viewing Weekly Details

### Opening the Weekly Drill-Down

1. **Navigate to the Transaction Summary**
   - Scroll to the "Aquarius Golf-Competition Transaction Summary" table

2. **Click a Week Row**
   - Click anywhere on a week row (it will highlight on hover)
   - A modal opens showing all transactions for that week

3. **Review the Details**
   - See all transactions with dates, times, types, members, and totals
   - View which transactions are flagged (🏆 icon)
   - See the total number of transactions
   - See the total flagged winnings for the week

### Using the Drill-Down View

**Summary Information:**
- **Total Transactions:** Count of all transactions in the week
- **Flagged Winnings:** Sum of all flagged transaction totals

**Transaction Table:**
- **Date:** Transaction date
- **Time:** Transaction time
- **Type:** Transaction type
- **Member/Player:** Person involved
- **Total:** Transaction amount
- **Flag Status:** Shows 🏆 and competition name if flagged
- **Actions:** Flag/Edit buttons for "Topup (Competitions)" transactions

**Keyboard Navigation:**
- Press **Escape** to close the modal
- Use **Tab** to navigate between buttons
- Use **Arrow keys** to move between transaction rows

## Understanding the Weekly Summary

### Competition Purse Section

The Competition Purse tracks money held for competition purposes:

- **Starting Purse:** Balance at the beginning of the week
- **Application Top-Up:** Money added via the application
- **Till Top-Up:** Money added via the till
- **Competition Entries:** Entry fees collected during the week
- **Competition Refunds:** Refunds issued (shown as negative)
- **Final Purse:** Ending balance for the week

**Formula:**
```
Final Purse = Starting Purse + Application Top-Up + Till Top-Up + Competition Entries - Competition Refunds
```

### Competition Pot Section

The Competition Pot tracks prize money available:

- **Starting Pot:** Prize money available at the start of the week
- **Competition Winnings Paid:** Total of all flagged transactions for the week
- **Competition Costs:** Expenses (currently placeholder: 0)
- **Final Pot:** Remaining prize money at the end of the week

**Formula:**
```
Final Pot = Starting Pot - Competition Winnings Paid - Competition Costs
```

### Rolling Balances

Each week's starting balance equals the previous week's final balance:
- Week 2 Starting Purse = Week 1 Final Purse
- Week 2 Starting Pot = Week 1 Final Pot

This ensures continuity across all weeks.

### Automatic Recalculation

When you flag or unflag a transaction:
1. The system finds which week the transaction belongs to
2. It recalculates that week's summary
3. It recalculates all subsequent weeks (to maintain rolling balances)
4. The table updates automatically

## Troubleshooting

### Presentation Season Issues

**Problem: Cannot create season - format invalid**

**Cause:** Season name doesn't match the required format.

**Solution:**
- Use exactly: "Season: Winter YY-Summer YY"
- Use two-digit years (25, not 2025)
- Ensure winter year ≤ summer year
- Example: "Season: Winter 25-Summer 26" ✅
- Wrong: "Winter 25 - Summer 26" ❌

**Problem: Cannot delete a season**

**Cause:** The season has competitions associated with it.

**Solution:**
1. View all competitions in the season (use season filter)
2. Delete or reassign all competitions to a different season
3. Try deleting the season again

### Competition Issues

**Problem: Cannot create competition**

**Possible Causes:**
1. **Missing required fields**
   - Ensure Name, Date, Type, and Season are filled in
   - Check that date is in DD/MM/YYYY format

2. **Invalid competition type**
   - Type must be exactly "singles" or "doubles"
   - Use the dropdown, don't type manually

3. **Season doesn't exist**
   - Create the presentation season first
   - Refresh the page if you just created the season

**Problem: Competition not showing in list**

**Cause:** Season filter is active.

**Solution:**
- Check the season filter dropdown
- Select "All Seasons" to see all competitions
- Or select the correct season

### CSV Upload Issues

**Problem: CSV upload fails - missing columns**

**Cause:** CSV file doesn't have all required columns.

**Solution:**
- **Singles:** Must have Pos, Name, Gross, Hcp, Nett
- **Doubles:** Must have Pos, Name, Nett
- Column names are case-sensitive
- Check for typos in column headers

**Problem: CSV upload fails - invalid data**

**Cause:** Data in CSV doesn't match expected format.

**Solution:**
- Ensure Pos column contains only integers
- Ensure numeric fields (Gross, Hcp, Nett) contain only numbers
- Remove any text or special characters from numeric fields
- Check the error message for specific row and field

**Problem: Doubles CSV fails - missing "/" separator**

**Cause:** Doubles names don't contain " / " separator.

**Solution:**
- Format names as: "Player1 / Player2"
- Include spaces around the slash: " / " not "/"
- Example: "John SMITH / Jane DOE" ✅
- Wrong: "John SMITH/Jane DOE" ❌

**Problem: CSV upload creates duplicate results**

**Cause:** Uploading the same CSV multiple times.

**Solution:**
- Delete existing results before re-uploading
- Or delete and recreate the competition
- Check the results table before uploading

**Problem: Some CSV rows are skipped**

**Cause:** Rows with empty names or division headers are automatically skipped.

**Solution:**
- This is expected behavior
- Rows with empty Name field are skipped
- Rows matching "Division 1", "Division 2", etc. are skipped
- Check the upload preview to see which rows were skipped

### Result Entry Issues

**Problem: Cannot add manual result**

**Possible Causes:**
1. **Missing required fields**
   - Position and Name are required
   - Position must be a positive integer

2. **Invalid position value**
   - Position must be 1 or greater
   - Cannot be 0, negative, or decimal

**Problem: Cannot edit result**

**Cause:** Result doesn't exist or was deleted.

**Solution:**
- Refresh the page
- Check that the competition still exists
- Re-add the result if necessary

**Problem: Gross/Handicap fields not showing**

**Cause:** Competition type is Doubles.

**Solution:**
- Gross and Handicap are only for Singles competitions
- Check the competition type
- If wrong, edit the competition and change the type

### Swindle Money Issues

**Problem: Swindle money not auto-populating**

**Possible Causes:**
1. **Name mismatch**
   - Transaction name doesn't match result name
   - Check spelling and formatting
   - Try manual matching

2. **Already populated**
   - System only populates NULL/empty fields
   - Manually edit if you need to update

3. **No matching results**
   - Ensure competition and results exist
   - Check that player name is in results

**Solution:**
- Use "Edit Flag" to manually select the result
- Or manually edit the result's swindle money field
- Check the name matching rules in the Swindle Money section

**Problem: Wrong player matched**

**Cause:** Multiple players with similar names.

**Solution:**
- Click "Edit Flag" on the transaction
- Manually select the correct result
- Or manually edit the result's swindle money field

### Transaction Flagging Issues

### Problem: Cannot Flag a Transaction

**Possible Causes:**
1. **Wrong Transaction Type**
   - Only "Topup (Competitions)" transactions can be flagged
   - Check the Type column

2. **No Competitions Created**
   - You must create at least one competition first
   - Click "Manage Competitions" and add a competition

3. **Database Error**
   - Check the browser console for error messages
   - Try refreshing the page

### Problem: Cannot Delete a Competition

**Cause:** The competition has flagged transactions associated with it.

**Solution:**
1. Note the number of associated transactions in the error message
2. Search for transactions flagged with this competition (look for the competition badge)
3. Unflag each transaction (click "Edit Flag" → "Remove Flag")
4. Try deleting the competition again

### Problem: Weekly Summary Shows Incorrect Values

**Possible Causes:**
1. **Transactions Not Flagged**
   - Ensure you've flagged all prize payments
   - Check the drill-down view for each week

2. **Wrong Competition Selected**
   - Verify each flagged transaction has the correct competition
   - Use "Edit Flag" to correct mistakes

3. **Need to Recalculate**
   - Flag or unflag any transaction to trigger recalculation
   - The system will recalculate all affected weeks

### Problem: CSV Import Fails

**Possible Causes:**
1. **Missing Columns**
   - Ensure all required columns are present
   - Check column names match exactly

2. **Invalid Date Format**
   - Dates must be in DD-MM-YYYY format
   - Example: 26-08-2025

3. **Not in Chronological Order**
   - Transactions must be sorted by date and time
   - Sort your CSV file before importing

### Problem: Competition Name Already Exists

**Cause:** You're trying to create or rename a competition with a name that already exists.

**Solution:**
1. Check the competition list for similar names
2. Competition names are case-insensitive ("October Medal" = "october medal")
3. Choose a unique name (e.g., "October Medal 2025" instead of "October Medal")

## Best Practices

### Organizing Presentation Seasons

✅ **Good Practices:**
- Create seasons at the start of each period (e.g., Winter 2025)
- Use auto-increment for consistency
- Set the active season to the current period
- Keep historical seasons for reference

❌ **Avoid:**
- Creating seasons with non-standard formats
- Deleting seasons with historical data
- Having multiple active seasons (system prevents this)

### Naming Competitions

✅ **Good Names:**
- "October Medal 2025"
- "Summer Cup - June 2025"
- "Captain's Day 2025"
- "Weekly Stableford - Week 1"

❌ **Avoid:**
- Generic names like "Medal" or "Cup" (use date for context)
- Very long names (keep under 50 characters)
- Special characters that might cause display issues

### Competition Type Selection

**Choose Singles when:**
- Individual players compete independently
- You need to track gross scores and handicaps
- Traditional stroke play or stableford competitions

**Choose Doubles when:**
- Pairs of players compete as teams
- Gross scores and handicaps are not relevant
- Team competitions or scrambles

**Important:** Once results are added, changing the competition type may cause data display issues. Choose carefully when creating the competition.

### CSV Upload Workflow

**Recommended Process:**

1. **Prepare Your CSV**
   - Export from your scoring system
   - Verify column names match exactly
   - Remove any extra header rows or footers
   - Save as CSV (not Excel format)

2. **Validate Before Upload**
   - Open in a text editor to check format
   - Ensure no special characters in names
   - Check that positions are integers
   - Verify doubles names have " / " separator

3. **Upload and Review**
   - Upload the CSV
   - Review the preview carefully
   - Check for skipped rows
   - Verify player names are correct

4. **Confirm or Fix**
   - If preview looks good, confirm upload
   - If errors, fix CSV and re-upload
   - Don't confirm if you see unexpected skipped rows

### Manual Entry Workflow

**When to Use Manual Entry:**
- Small competitions (< 10 players)
- Adding individual results to existing data
- Correcting specific results
- CSV export not available

**Tips:**
- Enter results in position order (1, 2, 3, ...)
- Double-check player names for consistency
- Use copy-paste for repeated names (doubles)
- Save frequently to avoid losing data

### Swindle Money Management

**Recommended Process:**

1. **Set Up Competitions First**
   - Create presentation seasons
   - Create competitions with correct dates
   - Upload or enter all results

2. **Flag Transactions**
   - Work through transactions chronologically
   - Flag prize payments as winnings
   - Let the system auto-populate swindle money

3. **Verify Auto-Population**
   - Check that swindle money appears in results
   - Verify amounts match your records
   - Manually correct any mismatches

4. **Handle Exceptions**
   - Manually enter swindle money for cash payments
   - Use "Edit Flag" for name mismatches
   - Document any manual adjustments

### Data Entry Best Practices

**Consistency:**
- Use consistent name formatting (e.g., "John SMITH" not "J. Smith")
- Use consistent date formats (DD/MM/YYYY)
- Use consistent competition naming conventions

**Accuracy:**
- Double-check positions and scores
- Verify player names against membership records
- Cross-reference with paper scorecards

**Completeness:**
- Enter all results, not just winners
- Mark entry paid status accurately
- Include all required fields

### Flagging Workflow

✅ **Good Names:**
- "October Medal 2025"
- "Summer Cup - June 2025"
- "Captain's Day 2025"

❌ **Avoid:**
- Generic names like "Medal" or "Cup" (use year for uniqueness)
- Very long names (keep under 50 characters)
- Special characters that might cause display issues

### Flagging Workflow

**Recommended Process:**

1. **Import Data First**
   - Import all your transaction data before flagging
   - This ensures you have the complete picture

2. **Create Competitions**
   - Set up all competitions for the period
   - Use consistent naming conventions

3. **Flag Systematically**
   - Work through one week at a time using the drill-down view
   - Or work through one competition at a time

4. **Verify Weekly Summaries**
   - Check that winnings totals match your records
   - Verify the Competition Pot balance makes sense

### Retrospective Flagging

If you need to flag historical transactions:

1. **Work Chronologically**
   - Start with the earliest week
   - Work forward in time

2. **Verify Recalculation**
   - After flagging, check that all subsequent weeks updated
   - The rolling balances should remain consistent

3. **Document Changes**
   - Keep notes of what you flagged and why
   - This helps if you need to audit later

### Data Management

**Regular Backups:**
- Your data is stored in the browser's IndexedDB
- Clearing browser data will delete everything
- Export your data regularly (if export feature is available)

**Browser Considerations:**
- Use the same browser consistently
- Data is not shared between browsers
- Private/Incognito mode may not persist data

**Performance:**
- The system handles 1000+ transactions efficiently
- If performance degrades, try clearing old data
- Consider archiving data by year

### Keyboard Shortcuts

- **Escape:** Close any open modal
- **Tab:** Navigate between form fields and buttons
- **Enter:** Submit forms or confirm actions
- **Arrow Keys:** Navigate transaction rows in drill-down view

## Getting Help

### Error Messages

The system provides clear error messages when something goes wrong:
- Read the error message carefully
- Check the browser console for technical details (F12 key)
- Refer to the Troubleshooting section above

### Browser Console

To view technical details:
1. Press **F12** (or right-click → Inspect)
2. Click the **Console** tab
3. Look for error messages in red
4. Copy error messages when reporting issues

### Data Verification

To verify your data is correct:
1. Check the "Transformed Records" table for all transactions
2. Use the drill-down view to see weekly details
3. Compare weekly summaries with your manual records
4. Verify flagged transactions have the correct competition

## Summary

You now know how to:
- ✅ Create and manage presentation seasons
- ✅ Create and manage competitions (singles and doubles)
- ✅ Upload competition results via CSV
- ✅ Manually enter and edit competition results
- ✅ Track swindle money payments automatically
- ✅ Create and manage competitions
- ✅ Flag transactions as prize winnings
- ✅ Associate winnings with specific competitions
- ✅ View detailed weekly transaction breakdowns
- ✅ Understand the weekly financial summaries
- ✅ Troubleshoot common issues
- ✅ Follow best practices for data management

For additional support or to report issues, contact your system administrator.
