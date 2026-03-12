/**
 * Duplicate Records Checker
 * Run this in the browser console to check for duplicate records in the database
 * 
 * Usage:
 * 1. Open the application in your browser
 * 2. Open Developer Console (F12)
 * 3. Copy and paste this entire script into the console
 * 4. Press Enter to run
 */

(async function checkDuplicates() {
  console.log('=== Checking for Duplicate Records ===');
  
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
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        const records = getAllRequest.result;
        console.log(`Total records in database: ${records.length}`);
        
        // Create a map to track duplicates
        // Key: date + time + total + type + member
        const recordMap = new Map();
        const duplicates = [];
        
        records.forEach(record => {
          const key = `${record.date}|${record.time}|${record.total}|${record.type}|${record.member}`;
          
          if (recordMap.has(key)) {
            // Found a duplicate
            const existing = recordMap.get(key);
            duplicates.push({
              key,
              records: [existing, record]
            });
          } else {
            recordMap.set(key, record);
          }
        });
        
        if (duplicates.length === 0) {
          console.log('✅ No duplicates found!');
        } else {
          console.log(`⚠️ Found ${duplicates.length} duplicate record(s):`);
          console.log('');
          
          duplicates.forEach((dup, index) => {
            console.log(`Duplicate #${index + 1}:`);
            dup.records.forEach(record => {
              console.log(`  ID: ${record.id}, Date: ${record.date}, Time: ${record.time}, Type: ${record.type}, Member: ${record.member}, Total: ${record.total}`);
            });
            console.log('');
          });
        }
        
        // Check for records in the date range 1/12/2025 to 7/12/2025
        console.log('=== Checking date range 01/12/2025 to 07/12/2025 ===');
        
        const dateRangeRecords = records.filter(record => {
          // Parse date in DD/MM/YYYY format
          const parts = record.date.split('/');
          if (parts.length !== 3) return false;
          
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          const year = parseInt(parts[2], 10);
          
          // Check if in December 2025, days 1-7
          return year === 2025 && month === 12 && day >= 1 && day <= 7;
        });
        
        console.log(`Records in date range: ${dateRangeRecords.length}`);
        
        if (dateRangeRecords.length > 0) {
          // Check for duplicates within this date range
          const rangeMap = new Map();
          const rangeDuplicates = [];
          
          dateRangeRecords.forEach(record => {
            const key = `${record.date}|${record.time}|${record.total}|${record.type}|${record.member}`;
            
            if (rangeMap.has(key)) {
              const existing = rangeMap.get(key);
              rangeDuplicates.push({
                key,
                records: [existing, record]
              });
            } else {
              rangeMap.set(key, record);
            }
          });
          
          if (rangeDuplicates.length === 0) {
            console.log('✅ No duplicates in this date range');
          } else {
            console.log(`⚠️ Found ${rangeDuplicates.length} duplicate(s) in this date range:`);
            console.log('');
            
            rangeDuplicates.forEach((dup, index) => {
              console.log(`Duplicate #${index + 1}:`);
              dup.records.forEach(record => {
                console.log(`  ID: ${record.id}, Date: ${record.date}, Time: ${record.time}, Type: ${record.type}, Member: ${record.member}, Total: ${record.total}`);
              });
              console.log('');
            });
          }
          
          // Group by date to show summary
          const byDate = {};
          dateRangeRecords.forEach(record => {
            if (!byDate[record.date]) {
              byDate[record.date] = [];
            }
            byDate[record.date].push(record);
          });
          
          console.log('Records by date:');
          Object.keys(byDate).sort().forEach(date => {
            console.log(`  ${date}: ${byDate[date].length} record(s)`);
          });
        }
        
        db.close();
        resolve();
      };
      
      getAllRequest.onerror = () => {
        console.error('Failed to get records:', getAllRequest.error);
        db.close();
        reject(getAllRequest.error);
      };
    };
  });
})();
