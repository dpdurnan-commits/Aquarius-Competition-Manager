# Fix: HTML-Encoded Forward Slashes

## Problem
Forward slashes in the member, player, and competition fields were being HTML-encoded as `&#x2F;` both in the database and UI display.

Example:
- Original: `25/01/2026 - Houston Cup 26`
- Stored as: `25&#x2F;01&#x2F;2026 - Houston Cup 26`

## Root Cause
The backend sanitization middleware was overly aggressive, encoding forward slashes even though they don't pose an XSS risk when `<` and `>` are already escaped.

## Solution

### Fix 1: Backend Sanitization (Prevents Future Issues)
**File**: `backend/src/middleware/sanitization.ts`

Removed the forward slash encoding:
```typescript
// Before:
.replace(/\//g, '&#x2F;');

// After:
// (removed - forward slashes are safe)
```

### Fix 2: Frontend Display (Already Fixed)
**File**: `app.js`

Updated `escapeHtml()` to not encode forward slashes:
```javascript
function escapeHtml(text) {
    if (!text) return '';
    
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    // Note: Forward slashes are NOT encoded
}
```

## Fixing Existing Data

You have two options to fix the data already in your database:

### Option 1: Clear and Re-import (Recommended)
1. Click "Reset Database" button in the UI
2. Re-upload your CSV files
3. The data will now be stored correctly with forward slashes preserved

### Option 2: Run SQL Update Script
If you don't want to lose other data (like flagged transactions), run the SQL script:

```bash
# Connect to your PostgreSQL database
psql -U your_username -d your_database_name -f fix-encoded-slashes.sql
```

Or manually run in your database client:
```sql
UPDATE transactions 
SET 
  member = REPLACE(member, '&#x2F;', '/'),
  player = REPLACE(player, '&#x2F;', '/'),
  competition = REPLACE(competition, '&#x2F;', '/');
```

## Testing

After the fix:
1. ✅ New CSV uploads store forward slashes correctly
2. ✅ UI displays forward slashes correctly (not `&#x2F;`)
3. ✅ Database contains forward slashes (not `&#x2F;`)
4. ✅ Still protected against XSS attacks

## Files Modified
- `backend/src/middleware/sanitization.ts` - Removed forward slash encoding
- `app.js` - Updated escapeHtml() to preserve forward slashes

## Security Note
Forward slashes do NOT need to be HTML-encoded for XSS protection. The only context where `/` is dangerous is in closing tags like `</script>`, but we're already protected by escaping `<` and `>` characters.
