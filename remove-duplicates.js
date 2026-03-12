/**
 * Duplicate Records Remover
 * Run this in the browser console to remove duplicate records from the database
 * 
 * WARNING: This will permanently delete duplicate records!
 * It keeps the first occurrence and removes subsequent duplicates.
 * 
 * Usage:
 * 1. Open the application in your browser
 * 2. Open Developer Console (F12)
 * 3. Run check-duplicates.js first to see what will be removed
 * 4. Copy and paste this entire script into the console
 * 5. Press Enter to run
 */

(async function removeDuplicates() {
  console.log('=== Removing Duplicate Records ===');
  console.log('⚠️ WARNING: This will permanently delete duplicate records!');
  
  // Confirm with user
  const confirmed = confirm(
    'This will permanently delete duplicate records from the database.\n\n' +
    'The first occurrence of each record will be kept, and duplicates will be removed.\n\n' +
    'Do you want to continue?'
  );
  
  if (!confirmed) {
    console.log('❌ Operation cancelled by user');
    return;
  }
  
  // Open the database
  const dbName = 'CompetitionTransactionsDB';
  const storeName = 'transactions';
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);
    
    request.onerror = () => {
      console.error('Failed to open database:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        const records = getAllRequest.result;
        console.log(`Total records in database: ${records.length}`);
        
        // Create a map to track duplicates
        // Key: date + time + total + type + member
        const recordMap = new Map();
        const duplicatesToRemove = [];
        
        records.forEach(record => {
          const key = `${record.date}|${record.time}|${record.total}|${record.type}|${record.member}`;
          
          if (recordMap.has(key)) {
            // Found a duplicate - mark for removal
            duplicatesToRemove.push(record);
            console.log(`Marking for removal: ID ${record.id}, Date: ${record.date}, Time: ${record.time}, Total: ${record.total}`);
          } else {
            // First occurrence - keep it
            recordMap.set(key, record);
          }
        });
        
        if (duplicatesToRemove.length === 0) {
          console.log('✅ No duplicates found - nothing to remove');
          db.close();
          resolve();
          return;
        }
        
        console.log(`Found ${duplicatesToRemove.length} duplicate record(s) to remove`);
        
        // Remove duplicates
        let removedCount = 0;
        let errorCount = 0;
        
        duplicatesToRemove.forEach(record => {
          const deleteRequest = store.delete(record.id);
          
          deleteRequest.onsuccess = () => {
            removedCount++;
            console.log(`✅ Removed duplicate ID ${record.id}`);
            
            if (removedCount + errorCount === duplicatesToRemove.length) {
              console.log('');
              console.log(`=== Removal Complete ===`);
              console.log(`Successfully removed: ${removedCount} record(s)`);
              console.log(`Errors: ${errorCount}`);
              console.log(`Remaining records: ${records.length - removedCount}`);
              db.close();
              
              // Refresh the page to update the UI
              if (removedCount > 0) {
                console.log('');
                console.log('Please refresh the page to see the updated data.');
              }
              
              resolve();
            }
          };
          
          deleteRequest.onerror = () => {
            errorCount++;
            console.error(`❌ Failed to remove duplicate ID ${record.id}:`, deleteRequest.error);
            
            if (removedCount + errorCount === duplicatesToRemove.length) {
              console.log('');
              console.log(`=== Removal Complete ===`);
              console.log(`Successfully removed: ${removedCount} record(s)`);
              console.log(`Errors: ${errorCount}`);
              console.log(`Remaining records: ${records.length - removedCount}`);
              db.close();
              
              // Refresh the page to update the UI
              if (removedCount > 0) {
                console.log('');
                console.log('Please refresh the page to see the updated data.');
              }
              
              resolve();
            }
          };
        });
      };
      
      getAllRequest.onerror = () => {
        console.error('Failed to get records:', getAllRequest.error);
        db.close();
        reject(getAllRequest.error);
      };
    };
  });
})();
