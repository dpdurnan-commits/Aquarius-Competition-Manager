# Competition Account Manager - User Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Navigating the Application](#navigating-the-application)
3. [Competition Accounts View](#competition-accounts-view)
4. [Manage Competitions View](#manage-competitions-view)
5. [Presentation Night View](#presentation-night-view)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## Introduction

The Competition Account Manager helps you manage golf competition accounts by:

- Importing and tracking financial transactions from CSV exports
- Organising competitions into presentation seasons
- Tracking competition results for singles and doubles competitions
- Automatically linking prize money payments to competition results
- Calculating accurate Competition Pot balances with weekly summaries
- Distributing winnings at presentation night and recording competition costs

This guide covers all three main views of the application.

---

## Navigating the Application

The application has three main views, accessed via the navigation buttons at the top of the page:

- **Competition Accounts** — Financial and transaction management (CSV import, weekly summaries, flagging winnings)
- **Manage Competitions** — Competition and results management (CRUD, results entry, season management)
- **Presentation Night** — End-of-season winnings distribution and competition costs

Click the relevant button to switch between views. Your data persists across view changes.

---

## Competition Accounts View

This is the primary financial view. It handles everything related to transaction data.

### Importing Transaction Data

1. Click **"Choose File"** and select your CSV export
2. Click **"Import CSV"**
3. Wait for the success message — the Transformed Records table will populate

**CSV file format required:**
```
Date,Time,Till,Type,Member,Player,Competition,Price,Discount,Subtotal,VAT,Total
```

Example row:
```
26-08-2025,18:19,Till 1,Topup (Competitions),Alastair REID,,October Medal,50.00,0.00,50.00,0.00,50.00
```

### Database Operations

The toolbar provides buttons for managing the underlying database:

- **Save to DB** — Persists imported records to the server database
- **Load from DB** — Reloads records from the server database
- **Clear DB** — Removes all records (use with caution)
- **Download CSV** — Exports current records as a CSV file

### Transformed Records Table

After importing, the full transaction list appears here. Each row shows:

- Date, time, member name, competition name, amount
- A flag icon if the transaction has been flagged as a competition winning

### Weekly Summary Table

Below the records table is the **Aquarius Golf-Competition Transaction Summary**. This shows a week-by-week breakdown including:

- Total income for the week
- Competition Pot running balance
- Flagged winnings paid out that week

Click any week row to open the **Weekly Drill-Down** for that week.

### Weekly Drill-Down

Clicking a week in the summary table expands an inline drill-down panel showing all transactions for that week. From here you can:

- See each transaction with its current flag status
- **Flag a transaction as a winning** — click the "Flag for Winnings" button on any unflagged transaction
- **Edit an existing flag** — click "Edit Flag" on a flagged transaction
- **Remove a flag** — click "Remove Flag" inside the Edit Flag modal

The drill-down updates immediately after any flag/unflag action without requiring a page reload.

### Flagging Transactions as Winnings

Flagging links a prize payment transaction to a specific competition result.

**To flag a transaction:**

1. Open the Weekly Drill-Down for the relevant week
2. Click **"Flag for Winnings"** on the transaction row
3. A competition selection modal appears showing tiles for all available competitions
4. Click the competition tile that matches this prize payment
5. The system records the flag and updates the drill-down view

**To edit or remove a flag:**

1. Click **"Edit Flag"** on a flagged transaction row
2. The Edit Flag modal opens showing the current competition assignment
3. To change the competition, select a new tile
4. To remove the flag entirely, click **"Remove Flag"**
5. The drill-down updates immediately

**Notes:**
- Only one competition can be linked per transaction
- Swindle money is auto-populated from flagged transactions where applicable
- The Competition Pot balance recalculates automatically after flagging


---

## Manage Competitions View

This view handles all competition and results management. It does not deal with financial transactions.

### Managing Presentation Seasons

#### What is a Presentation Season?

A presentation season groups competitions by their award presentation period. Seasons follow the format:
```
Season: Winter YY-Summer YY
```
For example: "Season: Winter 25-Summer 26" covers competitions from Winter 2025 through Summer 2026.

#### Creating a Season

1. In the Presentation Seasons section, click **"New Season"**
2. Choose one of two options:

   **Manual Entry:**
   - Enter the season name in the format `Season: Winter YY-Summer YY`
   - Click **"Create Season"**

   **Auto-Increment:**
   - Click **"Auto-Increment Season"**
   - The system creates the next season based on the most recent one

**Rules:**
- Season names must follow the exact format
- The winter year must be ≤ the summer year
- Only two-digit years (e.g., 25, not 2025)
- Season names must be unique

#### Setting the Active Season

1. Find the season in the list
2. Click **"Set Active"**
3. Only one season can be active at a time — the previous active season is deactivated automatically

#### Deleting a Season

1. Click **"Delete"** next to the season
2. Confirm the deletion
3. Seasons with associated competitions cannot be deleted

### Managing Competitions

#### Creating a Competition

1. Click **"New Competition"**
2. Fill in:
   - **Name** — e.g., "October Medal 2025"
   - **Date** — competition date
   - **Type** — Singles or Doubles
   - **Season** — select the presentation season this belongs to
3. Click **"Create Competition"**

#### Editing a Competition

1. Click **"Edit"** next to the competition
2. Update the fields as needed
3. Click **"Save"**

Note: Changing the competition type after results have been added may cause display issues.

#### Marking a Competition as Finished

Once all results are entered and verified, you can mark a competition as finished:

1. Click **"Mark as Finished"** on the competition
2. Finished competitions are visually distinguished in the list
3. This status can be toggled if corrections are needed

#### Deleting a Competition

1. Click **"Delete"** next to the competition
2. Confirm the deletion
3. Competitions with results cannot be deleted until results are removed

### Managing Competition Results

#### Uploading Results via CSV

1. Select the competition from the list
2. Click **"Upload Results CSV"**
3. Select your CSV file
4. Review the preview — check for skipped rows or unexpected data
5. Click **"Confirm Upload"** if the preview looks correct

**CSV format for Singles:**
```
Position,Player,Gross,Handicap,Nett
1,John SMITH,72,10,62
```

**CSV format for Doubles:**
```
Position,Player1 / Player2,Gross,Handicap,Nett
1,John SMITH / Jane DOE,,,
```

Player names in doubles must use ` / ` (space-slash-space) as the separator.

#### Manual Result Entry

1. Select the competition
2. Click **"Add Result"**
3. Enter:
   - Position (integer)
   - Player name(s)
   - Gross score, handicap, nett score (singles only)
   - Entry paid status
4. Click **"Save Result"**

#### Editing Results

1. Click **"Edit"** next to the result row
2. Update the fields
3. Click **"Save"**

#### Deleting Results

1. Click **"Delete"** next to the result row
2. Confirm the deletion

#### Swindle Money

For competitions where swindle money is paid:

- The system auto-populates swindle money amounts from flagged transactions in the Competition Accounts view
- You can manually enter or override swindle money amounts in the result entry form
- Swindle money is tracked per player per competition


---

## Presentation Night View

This view is used at the end of a season to distribute winnings to competition winners and record general competition costs.

It has two sections:
- **Winnings Distribution** — assign payout amounts to each competition winner for the selected season
- **Competition Costs** — record and review general costs (trophies, engraving, stationery, etc.)

### Winnings Distribution

#### Selecting a Season

1. Use the **"Select Presentation Season"** dropdown at the top
2. Choose the season you want to distribute winnings for
3. The winners table loads automatically

The system remembers your last selected season across page reloads.

#### The Winners Table

Once a season is selected, the winners table shows one row per competition in that season:

| Column | Description |
|--------|-------------|
| Competition | Competition name |
| Date | Competition date |
| Type | Singles or Doubles |
| Winner(s) | First-place player(s) |
| Amount (£) | Input field for the payout amount |

- Competitions with no recorded winner show "No winner recorded" and the amount field is disabled
- For doubles competitions, both winners are shown

#### Entering Distribution Amounts

1. For each competition row, enter the payout amount in the **Amount (£)** field
2. Amounts are saved automatically to your browser as you type — you won't lose progress if you navigate away
3. The **Total Distribution** summary at the bottom updates in real time as you enter amounts
4. Enter £0.00 for competitions where a physical prize was given instead of cash

#### Confirming the Distribution

Once all amounts are entered:

1. Click **"Confirm Distribution"**
2. If any competitions are missing amounts, you'll be warned and can choose to proceed or go back
3. A date picker appears — select the transaction date for the distribution record
4. A final confirmation dialog shows the total amount
5. Click **"Confirm"** to record the distribution

After confirmation:
- The distribution is saved to the database
- The view switches to read-only mode showing the confirmed amounts
- A cost transaction is created automatically

**Important:** Confirmed distributions cannot be edited. Contact your administrator if a correction is needed.

#### Clearing Amounts

If you want to start over before confirming:

1. Click **"Clear All"**
2. Confirm the prompt
3. All entered amounts are cleared and the form resets

#### Read-Only Mode

If a season already has a confirmed distribution, the view loads in read-only mode:
- Amount fields are replaced with the confirmed values (shown in green)
- The Confirm and Clear buttons are hidden
- A status message indicates the distribution is already confirmed

### Competition Costs

This section records general costs associated with running competitions — things like trophy engraving, stationery, or equipment purchases. These are separate from the per-competition winnings distribution.

#### Recording a Cost

1. Fill in the **Record Competition Cost** form:
   - **Description** — e.g., "Trophy Engraving", "Stationery", "Equipment"
   - **Date** — the date the cost was incurred (defaults to today)
   - **Amount (£)** — the cost amount
2. Click **"Record Cost"**
3. A success message confirms the entry and the cost appears in the history table

**Notes:**
- Descriptions must be unique — you cannot record two costs with the same description
- Amounts must be positive with up to 2 decimal places

#### Viewing Cost History

The **Competition Cost History** table shows all recorded costs with:
- Date
- Description
- Amount (shown in red)
- Running total at the bottom

#### Filtering by Date Range

1. Enter a **start date** and **end date** in the filter controls
2. Click **"Apply Filter"** to show only costs within that range
3. Click **"Clear Filter"** to return to the full list

---

## Troubleshooting

### Competition Selection Modal Not Appearing

If clicking "Flag for Winnings" does nothing or shows an error:

1. Check the browser console (F12 → Console tab) for error messages
2. Ensure you are in the Competition Accounts view — navigate away and back if needed
3. Verify the transaction data has been loaded (the Transformed Records table should be populated)

### Weekly Drill-Down Not Updating After Flag/Unflag

The drill-down should refresh automatically after any flag action. If it doesn't:

1. Click the week row in the summary table again to reload the drill-down
2. If the issue persists, reload the page and re-open the drill-down

### CSV Import Errors

**"Unexpected column" error:**
- Open the CSV in a text editor and verify the header row matches exactly:
  `Date,Time,Till,Type,Member,Player,Competition,Price,Discount,Subtotal,VAT,Total`

**Rows being skipped:**
- Check for blank rows or rows with missing required fields
- Ensure dates are in DD-MM-YYYY format

**Duplicate records:**
- The system detects duplicates during import and skips them
- Review the import summary to see how many rows were skipped

### Results CSV Upload Issues

**Doubles names not parsing:**
- Ensure the separator is exactly ` / ` (space, forward slash, space)
- Check there are no extra spaces or different slash characters

**Positions not recognised:**
- Positions must be integers (1, 2, 3 — not "1st", "2nd")

### Presentation Night — Season Not Loading

If the winners table fails to load after selecting a season:

1. Ensure competitions exist for that season in the Manage Competitions view
2. Ensure at least some competitions have results entered with a first-place position
3. Check the browser console for API errors

### Distribution Confirm Button Disabled or Missing

The Confirm Distribution button only appears when:
- A season is selected
- The season does not already have a confirmed distribution

If the button is missing, the season likely already has a confirmed distribution (read-only mode).

---

## Best Practices

### Workflow Order

For best results, follow this sequence each season:

1. **Set up seasons** — Create the presentation season in Manage Competitions
2. **Create competitions** — Add all competitions for the season with correct dates and types
3. **Import transactions** — Import your CSV data in Competition Accounts
4. **Enter results** — Upload or manually enter results for each competition
5. **Flag transactions** — Work through weekly drill-downs to flag prize payments
6. **Distribute winnings** — At season end, use Presentation Night to assign and confirm payouts
7. **Record costs** — Add any competition costs (trophies, etc.) in the Presentation Night view

### Naming Conventions

**Seasons:**
- Always use the exact format: `Season: Winter YY-Summer YY`
- Keep years as two digits

**Competitions:**
- Include the date or month for uniqueness: "October Medal 2025"
- Keep names under 50 characters
- Avoid special characters

**Players:**
- Use consistent formatting across all entries: e.g., "John SMITH" not "J. Smith"
- Consistency matters for swindle money auto-population

### Data Entry Tips

- Enter results in position order (1, 2, 3...)
- Double-check player names against membership records before saving
- For doubles, always use the ` / ` separator
- Flag transactions chronologically — start with the earliest week

### Flagging Tips

- Work one week at a time using the drill-down view
- If a player name in the transaction doesn't match the competition result, use "Edit Flag" to manually link them
- You can assign £0.00 for physical prizes to keep the records complete

### Browser Considerations

- Use the same browser consistently — data is stored server-side but session state is browser-specific
- The application is designed for Chrome, Firefox, Safari, and Edge
- Avoid using private/incognito mode for regular use

### Keyboard Shortcuts

- **Escape** — Close any open modal
- **Tab** — Navigate between form fields
- **Enter** — Submit forms or confirm actions
- **F12** — Open browser developer tools for troubleshooting

---

*For additional support or to report issues, contact your system administrator.*
