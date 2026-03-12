/**
 * End-to-End Integration Tests for Competition Winnings Tracking
 * Tests complete workflows including competition management, transaction flagging,
 * drill-down views, and retrospective recalculation
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { DatabaseManager } from './databaseManager.js';
import { CompetitionManager } from './competitionManager.js';
import { TransactionFlagger } from './transactionFlagger.js';
import { WeeklySummarizer } from './weeklySummarizer.js';
import { TransactionSummaryView } from './transactionSummaryView.js';
import { WeeklyDrillDownView } from './weeklyDrillDownView.js';
import { FieldExtractor } from './fieldExtractor.js';

describe('End-to-End Integration Tests', () => {
  let databaseManager;
  let competitionManager;
  let transactionFlagger;
  let weeklySummarizer;
  let transactionSummaryView;
  let weeklyDrillDownView;
  let fieldExtractor;
  let summaryContainer;
  let drillDownContainer;

  beforeEach(async () => {
    // Initialize all components
    databaseManager = new DatabaseManager();
    await databaseManager.initialize();
    await databaseManager.clearAll();
    
    competitionManager = new CompetitionManager(databaseManager);
    weeklySummarizer = new WeeklySummarizer();
    transactionFlagger = new TransactionFlagger(databaseManager, competitionManager, weeklySummarizer);
    fieldExtractor = new FieldExtractor();
    
    // Create containers for views
    summaryContainer = document.createElement('div');
    summaryContainer.id = 'test-summary-container';
    document.body.appendChild(summaryContainer);
    transactionSummaryView = new TransactionSummaryView('test-summary-container');
    
    // Create drill-down container with required structure
    drillDownContainer = document.createElement('div');
    drillDownContainer.innerHTML = `
      <div id="weekly-drilldown-modal" class="modal" style="display: none;">
        <div class="modal-overlay"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="drill-down-heading">Transactions for Week</h2>
            <button id="close-drill-down" class="close-button">×</button>
          </div>
          <div class="modal-body">
            <div class="drill-down-summary">
              <div class="summary-item">
                <span class="label">Total Transactions:</span>
                <span id="drill-down-total-count" class="value">0</span>
              </div>
              <div class="summary-item">
                <span class="label">Flagged Winnings:</span>
                <span id="drill-down-winnings-total" class="value">£0.00</span>
              </div>
            </div>
            <div id="drill-down-loading" class="loading" style="display: none;">
              <div class="spinner"></div>
              <span>Loading transactions...</span>
            </div>
            <div class="table-wrapper">
              <table id="drill-down-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Member/Player</th>
                    <th>Total</th>
                    <th>Flag Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="drill-down-body"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(drillDownContainer);
    weeklyDrillDownView = new WeeklyDrillDownView(
      databaseManager,
      competitionManager,
      transactionFlagger,
      transactionSummaryView
    );
  });

  afterEach(async () => {
    await databaseManager.clearAll();
    if (summaryContainer && summaryContainer.parentNode) {
      document.body.removeChild(summaryContainer);
    }
    // Clean up drill-down modal
    const modal = document.getElementById('weekly-drilldown-modal');
    if (modal && modal.parentNode) {
      document.body.removeChild(modal.parentNode);
    }
  });

  /**
   * Task 9.1: Test complete flagging workflow
   * Requirements: 1.1-1.8, 2.1-2.7, 4.1-4.5
   */
  describe('9.1 Complete Flagging Workflow', () => {
    test('should complete full workflow: create competition, import data, flag, verify, unflag', async () => {
      // Step 1: Create competition
      const competition = await competitionManager.create('Summer Medal 2024');
      expect(competition.id).toBeDefined();
      expect(competition.name).toBe('Summer Medal 2024');

      // Step 2: Import CSV data with Topup (Competitions) transactions
      const csvRecords = [
        {
          date: '01/01/2024',
          time: '10:00:00',
          till: '',
          type: 'Topup (Competitions)',
          member: 'John Doe',
          price: '50.00',
          discount: '0.00',
          subtotal: '50.00',
          vat: '10.00',
          total: '60.00',
          sourceRowIndex: 1,
          isComplete: true
        },
        {
          date: '02/01/2024',
          time: '11:00:00',
          till: '',
          type: 'Topup (Competitions)',
          member: 'Jane Smith',
          price: '30.00',
          discount: '0.00',
          subtotal: '30.00',
          vat: '6.00',
          total: '36.00',
          sourceRowIndex: 2,
          isComplete: true
        },
        {
          date: '03/01/2024',
          time: '12:00:00',
          till: '',
          type: 'Sale',
          member: 'Bob Jones & Medal: Entry',
          price: '5.00',
          discount: '0.00',
          subtotal: '5.00',
          vat: '1.00',
          total: '6.00',
          sourceRowIndex: 3,
          isComplete: true
        }
      ];

      const enhancedRecords = csvRecords.map(r => fieldExtractor.extract(r));
      await databaseManager.store(enhancedRecords);

      let storedRecords = await databaseManager.getAll();
      expect(storedRecords).toHaveLength(3);

      // Step 3: Generate initial summary (no winnings flagged yet)
      let summaries = weeklySummarizer.generateSummaries(storedRecords);
      expect(summaries).toHaveLength(1);
      expect(summaries[0].winningsPaid).toBe(0);
      expect(summaries[0].startingPot).toBe(0);
      // Competition Pot = Starting Pot - Winnings Paid - Competition Costs
      // With competition entries: 0 - 0 - 0 + 6 (entry) = 6
      expect(summaries[0].finalPot).toBe(6); // Includes competition entry

      // Step 4: Flag first transaction as winnings
      const firstTransaction = storedRecords.find(r => r.member === 'John Doe');
      await transactionFlagger.flagTransaction(firstTransaction.id, competition.id);

      // Step 5: Verify transaction is flagged
      const flaggedTransaction = await databaseManager.getById(firstTransaction.id);
      expect(flaggedTransaction.isWinning).toBe(true);
      expect(flaggedTransaction.winningCompetitionId).toBe(competition.id);

      // Step 6: Verify summary updates with winnings
      storedRecords = await databaseManager.getAll();
      summaries = weeklySummarizer.generateSummaries(storedRecords);
      expect(summaries[0].winningsPaid).toBe(60.00); // John Doe's total
      expect(summaries[0].finalPot).toBe(-54.00); // 0 - 60 - 0 + 6 (entry)

      // Step 7: Unflag transaction
      await transactionFlagger.unflagTransaction(firstTransaction.id);

      // Step 8: Verify transaction is unflagged
      const unflaggedTransaction = await databaseManager.getById(firstTransaction.id);
      expect(unflaggedTransaction.isWinning).toBe(false);
      expect(unflaggedTransaction.winningCompetitionId).toBeNull();

      // Step 9: Verify summary resets to zero winnings
      storedRecords = await databaseManager.getAll();
      summaries = weeklySummarizer.generateSummaries(storedRecords);
      expect(summaries[0].winningsPaid).toBe(0);
      expect(summaries[0].finalPot).toBe(6); // Back to just competition entry
    });


    test('should handle multiple flagged transactions in same week', async () => {
      // Create two competitions
      const comp1 = await competitionManager.create('Medal A');
      const comp2 = await competitionManager.create('Medal B');

      // Import transactions
      const records = [
        {
          date: '01/01/2024',
          time: '10:00:00',
          till: '',
          type: 'Topup (Competitions)',
          member: 'Player 1',
          price: '50.00',
          discount: '0.00',
          subtotal: '50.00',
          vat: '10.00',
          total: '60.00',
          sourceRowIndex: 1,
          isComplete: true
        },
        {
          date: '02/01/2024',
          time: '11:00:00',
          till: '',
          type: 'Topup (Competitions)',
          member: 'Player 2',
          price: '40.00',
          discount: '0.00',
          subtotal: '40.00',
          vat: '8.00',
          total: '48.00',
          sourceRowIndex: 2,
          isComplete: true
        }
      ];

      const enhanced = records.map(r => fieldExtractor.extract(r));
      await databaseManager.store(enhanced);
      let stored = await databaseManager.getAll();

      // Flag both transactions with different competitions
      await transactionFlagger.flagTransaction(stored[0].id, comp1.id);
      await transactionFlagger.flagTransaction(stored[1].id, comp2.id);

      // Verify both are flagged
      stored = await databaseManager.getAll();
      const flagged = stored.filter(r => r.isWinning);
      expect(flagged).toHaveLength(2);

      // Verify summary sums both winnings
      const summaries = weeklySummarizer.generateSummaries(stored);
      expect(summaries[0].winningsPaid).toBe(108.00); // 60 + 48
    });
  });


  /**
   * Task 9.2: Test drill-down and flag from weekly view
   * Requirements: 5.1-5.5, 7.1-7.6, 8.1-8.5
   */
  describe('9.2 Drill-Down and Flag from Weekly View', () => {
    test('should open drill-down, flag transaction, and update both views', async () => {
      // Create competition
      const competition = await competitionManager.create('Weekly Medal');

      // Import transactions
      const records = [
        {
          date: '01/01/2024',
          time: '10:00:00',
          till: '',
          type: 'Topup (Competitions)',
          member: 'Player 1',
          price: '50.00',
          discount: '0.00',
          subtotal: '50.00',
          vat: '10.00',
          total: '60.00',
          sourceRowIndex: 1,
          isComplete: true
        },
        {
          date: '02/01/2024',
          time: '11:00:00',
          till: '',
          type: 'Sale',
          member: 'Player 2 & Medal: Entry',
          price: '5.00',
          discount: '0.00',
          subtotal: '5.00',
          vat: '1.00',
          total: '6.00',
          sourceRowIndex: 2,
          isComplete: true
        }
      ];

      const enhanced = records.map(r => fieldExtractor.extract(r));
      await databaseManager.store(enhanced);
      const stored = await databaseManager.getAll();

      // Generate and render summary
      let summaries = weeklySummarizer.generateSummaries(stored);
      transactionSummaryView.render(summaries);


      // Verify initial state - no winnings
      expect(summaries[0].winningsPaid).toBe(0);

      // Open drill-down view for the week
      const weekStart = new Date('2024-01-01');
      const weekEnd = new Date('2024-01-07');
      await weeklyDrillDownView.show(weekStart, weekEnd);

      // Verify drill-down is visible
      const modal = document.getElementById('weekly-drilldown-modal');
      expect(modal.style.display).toBe('block');
      const drillDownTable = document.getElementById('drill-down-table');
      expect(drillDownTable).not.toBeNull();

      // Verify transactions are displayed
      const rows = document.querySelectorAll('#drill-down-body tr');
      expect(rows.length).toBeGreaterThan(0);

      // Flag transaction from drill-down
      const topupTransaction = stored.find(r => r.type === 'Topup (Competitions)');
      await transactionFlagger.flagTransaction(topupTransaction.id, competition.id);

      // Refresh drill-down view
      await weeklyDrillDownView.refresh();

      // Verify flagged indicator appears in drill-down
      const updatedRows = document.querySelectorAll('#drill-down-body tr');
      const flaggedRow = Array.from(updatedRows).find(row => 
        row.textContent.includes('🏆')
      );
      expect(flaggedRow).not.toBeNull();

      // Verify summary view updates
      const updatedStored = await databaseManager.getAll();
      summaries = weeklySummarizer.generateSummaries(updatedStored);
      expect(summaries[0].winningsPaid).toBe(60.00);

      // Close drill-down
      weeklyDrillDownView.hide();
      expect(modal.style.display).toBe('none');
    });


    test('should display correct transactions for selected week in drill-down', async () => {
      // Import transactions across multiple weeks
      const records = [
        {
          date: '01/01/2024', // Week 1
          time: '10:00:00',
          till: '',
          type: 'Topup (Competitions)',
          member: 'Week 1 Player',
          price: '50.00',
          discount: '0.00',
          subtotal: '50.00',
          vat: '10.00',
          total: '60.00',
          sourceRowIndex: 1,
          isComplete: true
        },
        {
          date: '08/01/2024', // Week 2
          time: '10:00:00',
          till: '',
          type: 'Topup (Competitions)',
          member: 'Week 2 Player',
          price: '40.00',
          discount: '0.00',
          subtotal: '40.00',
          vat: '8.00',
          total: '48.00',
          sourceRowIndex: 2,
          isComplete: true
        }
      ];

      const enhanced = records.map(r => fieldExtractor.extract(r));
      await databaseManager.store(enhanced);

      // Open drill-down for week 1
      const week1Start = new Date('2024-01-01');
      const week1End = new Date('2024-01-07');
      await weeklyDrillDownView.show(week1Start, week1End);

      // Verify only week 1 transactions are shown
      const rows = document.querySelectorAll('#drill-down-body tr');
      expect(rows).toHaveLength(1);
      expect(rows[0].textContent).toContain('Week 1 Player');
      expect(rows[0].textContent).not.toContain('Week 2 Player');

      weeklyDrillDownView.hide();
    });
  });


  /**
   * Task 9.3: Test competition deletion protection
   * Requirements: 1.6-1.8, 9.1-9.4
   */
  describe('9.3 Competition Deletion Protection', () => {
    test('should prevent deletion when competition has flagged transactions', async () => {
      // Create competition
      const competition = await competitionManager.create('Protected Competition');

      // Import and flag transaction
      const records = [{
        date: '01/01/2024',
        time: '10:00:00',
        till: '',
        type: 'Topup (Competitions)',
        member: 'Player 1',
        price: '50.00',
        discount: '0.00',
        subtotal: '50.00',
        vat: '10.00',
        total: '60.00',
        sourceRowIndex: 1,
        isComplete: true
      }];

      const enhanced = records.map(r => fieldExtractor.extract(r));
      await databaseManager.store(enhanced);
      const stored = await databaseManager.getAll();

      // Flag transaction
      await transactionFlagger.flagTransaction(stored[0].id, competition.id);

      // Attempt to delete competition (should fail)
      const deleteResult = await competitionManager.delete(competition.id);
      expect(deleteResult.success).toBe(false);
      expect(deleteResult.reason).toBe('has_transactions');
      expect(deleteResult.count).toBe(1);

      // Verify competition still exists
      const competitions = await competitionManager.getAll();
      expect(competitions).toHaveLength(1);
      expect(competitions[0].id).toBe(competition.id);
    });


    test('should allow deletion after unflagging all transactions', async () => {
      // Create competition
      const competition = await competitionManager.create('Temporary Competition');

      // Import and flag transaction
      const records = [{
        date: '01/01/2024',
        time: '10:00:00',
        till: '',
        type: 'Topup (Competitions)',
        member: 'Player 1',
        price: '50.00',
        discount: '0.00',
        subtotal: '50.00',
        vat: '10.00',
        total: '60.00',
        sourceRowIndex: 1,
        isComplete: true
      }];

      const enhanced = records.map(r => fieldExtractor.extract(r));
      await databaseManager.store(enhanced);
      let stored = await databaseManager.getAll();

      // Flag transaction
      await transactionFlagger.flagTransaction(stored[0].id, competition.id);

      // Verify deletion fails
      let deleteResult = await competitionManager.delete(competition.id);
      expect(deleteResult.success).toBe(false);

      // Unflag transaction
      await transactionFlagger.unflagTransaction(stored[0].id);

      // Verify transaction is unflagged
      stored = await databaseManager.getAll();
      expect(stored[0].isWinning).toBe(false);
      expect(stored[0].winningCompetitionId).toBeNull();

      // Now deletion should succeed
      deleteResult = await competitionManager.delete(competition.id);
      expect(deleteResult.success).toBe(true);

      // Verify competition is deleted
      const competitions = await competitionManager.getAll();
      expect(competitions).toHaveLength(0);
    });


    test('should handle multiple flagged transactions from same competition', async () => {
      // Create competition
      const competition = await competitionManager.create('Multi-Transaction Competition');

      // Import multiple transactions
      const records = [
        {
          date: '01/01/2024',
          time: '10:00:00',
          till: '',
          type: 'Topup (Competitions)',
          member: 'Player 1',
          price: '50.00',
          discount: '0.00',
          subtotal: '50.00',
          vat: '10.00',
          total: '60.00',
          sourceRowIndex: 1,
          isComplete: true
        },
        {
          date: '02/01/2024',
          time: '11:00:00',
          till: '',
          type: 'Topup (Competitions)',
          member: 'Player 2',
          price: '40.00',
          discount: '0.00',
          subtotal: '40.00',
          vat: '8.00',
          total: '48.00',
          sourceRowIndex: 2,
          isComplete: true
        }
      ];

      const enhanced = records.map(r => fieldExtractor.extract(r));
      await databaseManager.store(enhanced);
      let stored = await databaseManager.getAll();

      // Flag both transactions with same competition
      await transactionFlagger.flagTransaction(stored[0].id, competition.id);
      await transactionFlagger.flagTransaction(stored[1].id, competition.id);

      // Attempt deletion (should fail with count of 2)
      const deleteResult = await competitionManager.delete(competition.id);
      expect(deleteResult.success).toBe(false);
      expect(deleteResult.count).toBe(2);
    });
  });


  /**
   * Task 9.4: Test retrospective flagging and recalculation
   * Requirements: 4.5, 8.1-8.4
   */
  describe('9.4 Retrospective Flagging and Recalculation', () => {
    test('should recalculate all weeks after flagging early transaction', async () => {
      // Create competition
      const competition = await competitionManager.create('Retrospective Medal');

      // Import transactions across 3 weeks
      const records = [
        {
          date: '01/01/2024', // Week 1
          time: '10:00:00',
          till: '',
          type: 'Topup (Competitions)',
          member: 'Week 1 Player',
          price: '50.00',
          discount: '0.00',
          subtotal: '50.00',
          vat: '10.00',
          total: '60.00',
          sourceRowIndex: 1,
          isComplete: true
        },
        {
          date: '08/01/2024', // Week 2
          time: '10:00:00',
          till: '',
          type: 'Sale',
          member: 'Week 2 Player & Medal: Entry',
          price: '5.00',
          discount: '0.00',
          subtotal: '5.00',
          vat: '1.00',
          total: '6.00',
          sourceRowIndex: 2,
          isComplete: true
        },
        {
          date: '15/01/2024', // Week 3
          time: '10:00:00',
          till: '',
          type: 'Sale',
          member: 'Week 3 Player & Medal: Entry',
          price: '5.00',
          discount: '0.00',
          subtotal: '5.00',
          vat: '1.00',
          total: '6.00',
          sourceRowIndex: 3,
          isComplete: true
        }
      ];

      const enhanced = records.map(r => fieldExtractor.extract(r));
      await databaseManager.store(enhanced);
      let stored = await databaseManager.getAll();


      // Generate initial summaries (no winnings)
      let summaries = weeklySummarizer.generateSummaries(stored);
      expect(summaries).toHaveLength(3);
      
      // Verify initial state - no winnings in any week
      expect(summaries[0].winningsPaid).toBe(0);
      expect(summaries[1].winningsPaid).toBe(0);
      expect(summaries[2].winningsPaid).toBe(0);

      // Verify initial rolling balances
      expect(summaries[0].startingPot).toBe(0);
      expect(summaries[0].finalPot).toBe(0); // Week 1: 0 - 0 - 0 (no entries)
      expect(summaries[1].startingPot).toBe(0);
      expect(summaries[1].finalPot).toBe(6); // Week 2: 0 - 0 - 0 + 6 (entry)
      expect(summaries[2].startingPot).toBe(6);
      expect(summaries[2].finalPot).toBe(12); // Week 3: 6 - 0 - 0 + 6 (entry)

      // Flag transaction in week 1 (early week)
      const week1Transaction = stored.find(r => r.date === '01/01/2024');
      await transactionFlagger.flagTransaction(week1Transaction.id, competition.id);

      // Recalculate summaries
      stored = await databaseManager.getAll();
      summaries = weeklySummarizer.generateSummaries(stored);

      // Verify week 1 shows winnings
      expect(summaries[0].winningsPaid).toBe(60.00);
      expect(summaries[0].finalPot).toBe(-60.00); // Week 1: 0 - 60 - 0 (no entries)

      // Verify subsequent weeks have updated rolling balances
      expect(summaries[1].startingPot).toBe(-60.00); // Carries from week 1
      expect(summaries[1].finalPot).toBe(-54.00); // Week 2: -60 - 0 - 0 + 6 (entry)
      expect(summaries[2].startingPot).toBe(-54.00); // Carries from week 2
      expect(summaries[2].finalPot).toBe(-48.00); // Week 3: -54 - 0 - 0 + 6 (entry)
    });


    test('should maintain rolling balance consistency after unflagging', async () => {
      // Create competition
      const competition = await competitionManager.create('Balance Test');

      // Import transactions across 2 weeks
      const records = [
        {
          date: '01/01/2024', // Week 1
          time: '10:00:00',
          till: '',
          type: 'Topup (Competitions)',
          member: 'Player 1',
          price: '50.00',
          discount: '0.00',
          subtotal: '50.00',
          vat: '10.00',
          total: '60.00',
          sourceRowIndex: 1,
          isComplete: true
        },
        {
          date: '08/01/2024', // Week 2
          time: '10:00:00',
          till: '',
          type: 'Topup (Competitions)',
          member: 'Player 2',
          price: '40.00',
          discount: '0.00',
          subtotal: '40.00',
          vat: '8.00',
          total: '48.00',
          sourceRowIndex: 2,
          isComplete: true
        }
      ];

      const enhanced = records.map(r => fieldExtractor.extract(r));
      await databaseManager.store(enhanced);
      let stored = await databaseManager.getAll();

      // Flag both transactions
      await transactionFlagger.flagTransaction(stored[0].id, competition.id);
      await transactionFlagger.flagTransaction(stored[1].id, competition.id);

      // Verify flagged state
      stored = await databaseManager.getAll();
      let summaries = weeklySummarizer.generateSummaries(stored);
      expect(summaries[0].winningsPaid).toBe(60.00);
      expect(summaries[1].winningsPaid).toBe(48.00);
      expect(summaries[0].finalPot).toBe(-60.00);
      expect(summaries[1].startingPot).toBe(-60.00);
      expect(summaries[1].finalPot).toBe(-108.00);

      // Unflag week 1 transaction
      await transactionFlagger.unflagTransaction(stored[0].id);

      // Verify recalculation
      stored = await databaseManager.getAll();
      summaries = weeklySummarizer.generateSummaries(stored);
      expect(summaries[0].winningsPaid).toBe(0);
      expect(summaries[1].winningsPaid).toBe(48.00);
      expect(summaries[0].finalPot).toBe(0);
      expect(summaries[1].startingPot).toBe(0); // Should reset
      expect(summaries[1].finalPot).toBe(-48.00);
    });


    test('should handle flagging in middle week and recalculate forward', async () => {
      // Create competition
      const competition = await competitionManager.create('Middle Week Test');

      // Import transactions across 4 weeks
      const records = [
        { date: '01/01/2024', time: '10:00:00', till: '', type: 'Sale', member: 'P1 & Medal: Entry', 
          price: '5.00', discount: '0.00', subtotal: '5.00', vat: '1.00', total: '6.00', 
          sourceRowIndex: 1, isComplete: true },
        { date: '08/01/2024', time: '10:00:00', till: '', type: 'Topup (Competitions)', member: 'P2',
          price: '50.00', discount: '0.00', subtotal: '50.00', vat: '10.00', total: '60.00',
          sourceRowIndex: 2, isComplete: true },
        { date: '15/01/2024', time: '10:00:00', till: '', type: 'Sale', member: 'P3 & Medal: Entry',
          price: '5.00', discount: '0.00', subtotal: '5.00', vat: '1.00', total: '6.00',
          sourceRowIndex: 3, isComplete: true },
        { date: '22/01/2024', time: '10:00:00', till: '', type: 'Sale', member: 'P4 & Medal: Entry',
          price: '5.00', discount: '0.00', subtotal: '5.00', vat: '1.00', total: '6.00',
          sourceRowIndex: 4, isComplete: true }
      ];

      const enhanced = records.map(r => fieldExtractor.extract(r));
      await databaseManager.store(enhanced);
      let stored = await databaseManager.getAll();

      // Initial state
      let summaries = weeklySummarizer.generateSummaries(stored);
      expect(summaries).toHaveLength(4);
      const initialWeek1Pot = summaries[0].finalPot;
      const initialWeek2Pot = summaries[1].finalPot;

      // Flag transaction in week 2 (middle week)
      const week2Transaction = stored.find(r => r.date === '08/01/2024');
      await transactionFlagger.flagTransaction(week2Transaction.id, competition.id);

      // Verify recalculation
      stored = await databaseManager.getAll();
      summaries = weeklySummarizer.generateSummaries(stored);

      // Week 1 should be unchanged
      expect(summaries[0].finalPot).toBe(initialWeek1Pot);

      // Week 2 should show winnings
      expect(summaries[1].winningsPaid).toBe(60.00);
      expect(summaries[1].finalPot).toBe(initialWeek2Pot - 60.00);

      // Weeks 3 and 4 should have updated rolling balances
      expect(summaries[2].startingPot).toBe(summaries[1].finalPot);
      expect(summaries[3].startingPot).toBe(summaries[2].finalPot);
    });
  });


  /**
   * Task 9.5: Test error scenarios and recovery
   * Requirements: 14.1-14.4
   */
  describe('9.5 Error Scenarios and Recovery', () => {
    test('should handle flagging with invalid competition ID', async () => {
      // Import transaction
      const records = [{
        date: '01/01/2024',
        time: '10:00:00',
        till: '',
        type: 'Topup (Competitions)',
        member: 'Player 1',
        price: '50.00',
        discount: '0.00',
        subtotal: '50.00',
        vat: '10.00',
        total: '60.00',
        sourceRowIndex: 1,
        isComplete: true
      }];

      const enhanced = records.map(r => fieldExtractor.extract(r));
      await databaseManager.store(enhanced);
      const stored = await databaseManager.getAll();

      // Attempt to flag with non-existent competition ID
      await expect(
        transactionFlagger.flagTransaction(stored[0].id, 99999)
      ).rejects.toThrow('Competition not found');

      // Verify transaction remains unflagged
      const transaction = await databaseManager.getById(stored[0].id);
      expect(transaction.isWinning).toBe(false);
      expect(transaction.winningCompetitionId).toBeNull();
    });

    test('should handle flagging non-Topup transaction', async () => {
      // Create competition
      const competition = await competitionManager.create('Test Competition');

      // Import non-Topup transaction
      const records = [{
        date: '01/01/2024',
        time: '10:00:00',
        till: '',
        type: 'Sale',
        member: 'Player 1 & Medal: Entry',
        price: '5.00',
        discount: '0.00',
        subtotal: '5.00',
        vat: '1.00',
        total: '6.00',
        sourceRowIndex: 1,
        isComplete: true
      }];

      const enhanced = records.map(r => fieldExtractor.extract(r));
      await databaseManager.store(enhanced);
      const stored = await databaseManager.getAll();

      // Attempt to flag non-Topup transaction
      await expect(
        transactionFlagger.flagTransaction(stored[0].id, competition.id)
      ).rejects.toThrow('Only Topup (Competitions) transactions can be flagged');

      // Verify transaction remains unflagged
      const transaction = await databaseManager.getById(stored[0].id);
      expect(transaction.isWinning).toBe(false);
    });


    test('should handle updating flag with invalid competition', async () => {
      // Create competition and flag transaction
      const competition = await competitionManager.create('Original Competition');
      
      const records = [{
        date: '01/01/2024',
        time: '10:00:00',
        till: '',
        type: 'Topup (Competitions)',
        member: 'Player 1',
        price: '50.00',
        discount: '0.00',
        subtotal: '50.00',
        vat: '10.00',
        total: '60.00',
        sourceRowIndex: 1,
        isComplete: true
      }];

      const enhanced = records.map(r => fieldExtractor.extract(r));
      await databaseManager.store(enhanced);
      let stored = await databaseManager.getAll();

      await transactionFlagger.flagTransaction(stored[0].id, competition.id);

      // Attempt to update with invalid competition
      await expect(
        transactionFlagger.updateFlag(stored[0].id, 99999)
      ).rejects.toThrow('Competition not found');

      // Verify original flag is preserved
      stored = await databaseManager.getAll();
      expect(stored[0].isWinning).toBe(true);
      expect(stored[0].winningCompetitionId).toBe(competition.id);
    });

    test('should handle concurrent modifications gracefully', async () => {
      // Create competition
      const competition = await competitionManager.create('Concurrent Test');

      // Import transaction
      const records = [{
        date: '01/01/2024',
        time: '10:00:00',
        till: '',
        type: 'Topup (Competitions)',
        member: 'Player 1',
        price: '50.00',
        discount: '0.00',
        subtotal: '50.00',
        vat: '10.00',
        total: '60.00',
        sourceRowIndex: 1,
        isComplete: true
      }];

      const enhanced = records.map(r => fieldExtractor.extract(r));
      await databaseManager.store(enhanced);
      const stored = await databaseManager.getAll();

      // Flag and unflag in sequence (simulating rapid user actions)
      await transactionFlagger.flagTransaction(stored[0].id, competition.id);
      await transactionFlagger.unflagTransaction(stored[0].id);

      // Verify final state is unflagged
      const finalTransaction = await databaseManager.getById(stored[0].id);
      expect(finalTransaction.isWinning).toBe(false);
      expect(finalTransaction.winningCompetitionId).toBeNull();
    });


    test('should handle database errors during flagging', async () => {
      // Create competition
      const competition = await competitionManager.create('Error Test');

      // Import transaction
      const records = [{
        date: '01/01/2024',
        time: '10:00:00',
        till: '',
        type: 'Topup (Competitions)',
        member: 'Player 1',
        price: '50.00',
        discount: '0.00',
        subtotal: '50.00',
        vat: '10.00',
        total: '60.00',
        sourceRowIndex: 1,
        isComplete: true
      }];

      const enhanced = records.map(r => fieldExtractor.extract(r));
      await databaseManager.store(enhanced);
      const stored = await databaseManager.getAll();

      // Attempt to flag with invalid transaction ID
      await expect(
        transactionFlagger.flagTransaction(99999, competition.id)
      ).rejects.toThrow('Transaction not found');
    });

    test('should recover from failed deletion attempt', async () => {
      // Create competition and flag transaction
      const competition = await competitionManager.create('Recovery Test');
      
      const records = [{
        date: '01/01/2024',
        time: '10:00:00',
        till: '',
        type: 'Topup (Competitions)',
        member: 'Player 1',
        price: '50.00',
        discount: '0.00',
        subtotal: '50.00',
        vat: '10.00',
        total: '60.00',
        sourceRowIndex: 1,
        isComplete: true
      }];

      const enhanced = records.map(r => fieldExtractor.extract(r));
      await databaseManager.store(enhanced);
      let stored = await databaseManager.getAll();

      await transactionFlagger.flagTransaction(stored[0].id, competition.id);

      // Attempt deletion (should fail)
      const deleteResult = await competitionManager.delete(competition.id);
      expect(deleteResult.success).toBe(false);

      // Verify system is still functional - can still flag/unflag
      await transactionFlagger.unflagTransaction(stored[0].id);
      stored = await databaseManager.getAll();
      expect(stored[0].isWinning).toBe(false);

      // Now deletion should work
      const secondDeleteResult = await competitionManager.delete(competition.id);
      expect(secondDeleteResult.success).toBe(true);
    });
  });
});
