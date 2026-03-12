# Duplicate Records Checker & Remover

## Easy Way: Use the UI Button (Recommended)

The application now has a built-in duplicate checker that's much easier to use than the console scripts!

### How to Use:

1. **Open your application** at http://127.0.0.1:8081
2. **Look for the "Check Duplicates" button** in the Transaction Summary section (next to the Reset Database button)
3. **Click "Check Duplicates"**
4. A modal will appear showing:
   - Total number of records
   - Whether duplicates were found
   - Details of each duplicate
5. **If duplicates are found**, click "Remove Duplicates" to clean them up
6. **Confirm** the operation when prompted
7. The page will refresh automatically with the cleaned data

That's it! No console commands needed.

---

## Alternative Way: Console Scripts (Advanced Users)

If you prefer using the browser console, these utility scripts are still available:

### Files

1. **check-duplicates.js** - Identifies duplicate records without modifying the database
2. **remove-duplicates.js** - Removes duplicate records (keeps first occurrence)

## How to Use

### Step 1: Check for Duplicates

1. Open the application in your browser (http://127.0.0.1:8081)
2. Open Developer Console (Press F12)
3. Open the file `check-duplicates.js` in a text editor
4. Copy the entire contents
5. Paste into the browser console
6. Press Enter

The script will output:
- Total number of records in the database
- List of any duplicate records found
- Specific check for the date range 01/12/2025 to 07/12/2025
- Summary of records by date

### Step 2: Remove Duplicates (if found)

⚠️ **WARNING**: This permanently deletes records from the database!

1. After running the check script and confirming duplicates exist
2. Open the file `remove-duplicates.js` in a text editor
3. Copy the entire contents
4. Paste into the browser console
5. Press Enter
6. Confirm the operation when prompted
7. Refresh the page after completion

The script will:
- Keep the first occurrence of each record
- Delete all subsequent duplicates
- Show progress as it removes records
- Display a summary when complete

## What Defines a Duplicate?

Two records are considered duplicates if they have identical values for:
- Date
- Time
- Total
- Type
- Member

## Prevention

The chronological validator has been updated to prevent duplicate imports in the future. It will now:
1. Check that new records come after existing records chronologically
2. Check that new records don't already exist in the database

If you try to import the same CSV file twice, you'll now see an error message like:
```
Import rejected: Duplicate records detected.

X record(s) in the new import already exist(s) in the database.

Example duplicate: 01/12/2025 at 10:30:00, Topup (Competitions), John Doe, £50.00

Please check your CSV file and ensure you're not importing the same data twice.
```

## Notes

- The scripts only work when run in the browser console while the application is open
- They directly access the IndexedDB database
- The remove script requires user confirmation before deleting
- After removing duplicates, refresh the page to see updated data
