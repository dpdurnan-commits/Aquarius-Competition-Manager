/**
 * Property-Based Tests for CompetitionCreationDialog
 * Tests dialog pre-population correctness using fast-check
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fc from 'fast-check';
import CompetitionCreationDialog from './competitionCreationDialog.js';

describe('CompetitionCreationDialog - Property-Based Tests', () => {
  describe('Property 3: Dialog Pre-population', () => {
    /**
     * **Validates: Requirements 2.2**
     * 
     * For any detected competition name, when the creation dialog is shown,
     * the name field should contain that exact competition name
     */

    let mockApiClient;
    let dialog;

    beforeEach(() => {
      // Set up mock API client
      mockApiClient = {
        request: jest.fn().mockResolvedValue({
          seasons: [
            {
              id: 1,
              name: 'Season: Winter 23-Summer 24',
              startYear: 2023,
              endYear: 2024,
              isActive: true,
              allCompetitionsAdded: false
            }
          ]
        }),
        createCompetition: jest.fn()
      };

      // Clear document body
      document.body.innerHTML = '';
    });

    afterEach(() => {
      // Clean up dialog if it exists
      if (dialog) {
        dialog.close();
        dialog = null;
      }
      
      // Clear document body
      document.body.innerHTML = '';
    });

    // Generator for competition names
    const competitionNameArbitrary = () => fc.oneof(
      // Regular strings (no newlines or tabs as they don't work in text inputs)
      fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('\n') && !s.includes('\r') && !s.includes('\t')),
      // Strings with special characters
      fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('\n') && !s.includes('\r') && !s.includes('\t')).map(s => s + '!@#$%'),
      // Strings with whitespace
      fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes('\n') && !s.includes('\r') && !s.includes('\t')).map(s => '  ' + s + '  '),
      // Strings with quotes and HTML-like characters (but no newlines/tabs)
      fc.constantFrom(
        'Competition "A"',
        'Competition <script>alert("xss")</script>',
        'Competition & Co.',
        "Competition's Name"
      )
    );

    test('should pre-populate name field with exact input name', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 3: Dialog Pre-population
      await fc.assert(
        fc.asyncProperty(
          competitionNameArbitrary(),
          async (competitionName) => {
            // Clean up any existing dialogs first
            document.body.innerHTML = '';
            
            const testDialog = new CompetitionCreationDialog(mockApiClient);
            
            // Show dialog (don't await completion, just verify it renders)
            const showPromise = testDialog.show(competitionName);
            
            // Wait for dialog to render (give it a tick)
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Verify dialog was created
            const nameInput = document.getElementById('competition-name');
            expect(nameInput).toBeTruthy();
            
            // Verify name field contains exact input name
            expect(nameInput.value).toBe(competitionName);
            
            // Clean up by cancelling the dialog
            const cancelButton = document.getElementById('cancel-button');
            if (cancelButton) {
              cancelButton.click();
            }
            
            // Wait for promise to resolve
            const result = await showPromise;
            expect(result).toBeNull();
            
            // Final cleanup
            testDialog.close();
            document.body.innerHTML = '';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should escape HTML in pre-populated name to prevent XSS', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            '<script>alert("xss")</script>',
            '<img src=x onerror=alert(1)>',
            '<div onclick="alert(1)">Click</div>',
            '"><script>alert(1)</script>',
            "' OR '1'='1"
          ),
          async (maliciousName) => {
            // Clean up any existing dialogs first
            document.body.innerHTML = '';
            
            const testDialog = new CompetitionCreationDialog(mockApiClient);
            
            // Show dialog
            const showPromise = testDialog.show(maliciousName);
            
            // Wait for dialog to render
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Verify name input exists
            const nameInput = document.getElementById('competition-name');
            expect(nameInput).toBeTruthy();
            
            // Verify the value is set correctly (browser handles escaping in value attribute)
            expect(nameInput.value).toBe(maliciousName);
            
            // Verify no script tags were actually created in the DOM
            const scripts = document.querySelectorAll('script');
            const injectedScripts = Array.from(scripts).filter(
              script => script.textContent.includes('alert')
            );
            expect(injectedScripts.length).toBe(0);
            
            // Clean up
            const cancelButton = document.getElementById('cancel-button');
            if (cancelButton) {
              cancelButton.click();
            }
            
            await showPromise;
            
            // Final cleanup
            testDialog.close();
            document.body.innerHTML = '';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should preserve whitespace in pre-populated name', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.integer({ min: 0, max: 5 }),
          fc.integer({ min: 0, max: 5 }),
          async (baseName, leadingSpaces, trailingSpaces) => {
            const paddedName = ' '.repeat(leadingSpaces) + baseName + ' '.repeat(trailingSpaces);
            
            // Clean up any existing dialogs first
            document.body.innerHTML = '';
            
            const testDialog = new CompetitionCreationDialog(mockApiClient);
            
            // Show dialog
            const showPromise = testDialog.show(paddedName);
            
            // Wait for dialog to render
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Verify name input exists
            const nameInput = document.getElementById('competition-name');
            expect(nameInput).toBeTruthy();
            
            // Verify whitespace is preserved exactly
            expect(nameInput.value).toBe(paddedName);
            
            // Clean up
            const cancelButton = document.getElementById('cancel-button');
            if (cancelButton) {
              cancelButton.click();
            }
            
            await showPromise;
            
            // Final cleanup
            testDialog.close();
            document.body.innerHTML = '';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle empty string as competition name', async () => {
      dialog = new CompetitionCreationDialog(mockApiClient);
      
      // Show dialog with empty string
      const showPromise = dialog.show('');
      
      // Wait for dialog to render
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Verify name input exists and is empty
      const nameInput = document.getElementById('competition-name');
      expect(nameInput).toBeTruthy();
      expect(nameInput.value).toBe('');
      
      // Clean up
      const cancelButton = document.getElementById('cancel-button');
      if (cancelButton) {
        cancelButton.click();
      }
      
      const result = await showPromise;
      expect(result).toBeNull();
    });

    test('should handle very long competition names', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 100, maxLength: 500 }),
          async (longName) => {
            // Clean up any existing dialogs first
            document.body.innerHTML = '';
            
            const testDialog = new CompetitionCreationDialog(mockApiClient);
            
            // Show dialog
            const showPromise = testDialog.show(longName);
            
            // Wait for dialog to render
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Verify name input exists
            const nameInput = document.getElementById('competition-name');
            expect(nameInput).toBeTruthy();
            
            // Verify entire long name is preserved
            expect(nameInput.value).toBe(longName);
            expect(nameInput.value.length).toBe(longName.length);
            
            // Clean up
            const cancelButton = document.getElementById('cancel-button');
            if (cancelButton) {
              cancelButton.click();
            }
            
            await showPromise;
            
            // Final cleanup
            testDialog.close();
            document.body.innerHTML = '';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle unicode and special characters in competition names', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.fullUnicode({ minLength: 1, maxLength: 30 }),
            fc.constantFrom(
              '🏆 Championship 2024',
              'Café Tournament',
              '日本語コンペティション',
              'Tørneringen',
              'Соревнование',
              '比赛名称'
            )
          ),
          async (unicodeName) => {
            // Clean up any existing dialogs first
            document.body.innerHTML = '';
            
            const testDialog = new CompetitionCreationDialog(mockApiClient);
            
            // Show dialog
            const showPromise = testDialog.show(unicodeName);
            
            // Wait for dialog to render
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Verify name input exists
            const nameInput = document.getElementById('competition-name');
            expect(nameInput).toBeTruthy();
            
            // Verify unicode characters are preserved exactly
            expect(nameInput.value).toBe(unicodeName);
            
            // Clean up
            const cancelButton = document.getElementById('cancel-button');
            if (cancelButton) {
              cancelButton.click();
            }
            
            await showPromise;
            
            // Final cleanup
            testDialog.close();
            document.body.innerHTML = '';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should make name field editable after pre-population', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 30 }),
          async (competitionName) => {
            // Clean up any existing dialogs first
            document.body.innerHTML = '';
            
            const testDialog = new CompetitionCreationDialog(mockApiClient);
            
            // Show dialog
            const showPromise = testDialog.show(competitionName);
            
            // Wait for dialog to render
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Verify name input exists and is not disabled
            const nameInput = document.getElementById('competition-name');
            expect(nameInput).toBeTruthy();
            expect(nameInput.disabled).toBe(false);
            expect(nameInput.readOnly).toBe(false);
            
            // Verify we can change the value
            const newValue = 'Modified Name';
            nameInput.value = newValue;
            expect(nameInput.value).toBe(newValue);
            
            // Clean up
            const cancelButton = document.getElementById('cancel-button');
            if (cancelButton) {
              cancelButton.click();
            }
            
            await showPromise;
            
            // Final cleanup
            testDialog.close();
            document.body.innerHTML = '';
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Required Field Validation', () => {
    /**
     * **Validates: Requirements 2.3, 2.4, 2.5**
     * 
     * For any competition creation attempt, the system should reject submissions
     * that are missing date, type, or seasonId fields
     */

    let mockApiClient;
    let dialog;

    beforeEach(() => {
      // Set up mock API client
      mockApiClient = {
        request: jest.fn().mockResolvedValue({
          seasons: [
            {
              id: 1,
              name: 'Season: Winter 23-Summer 24',
              startYear: 2023,
              endYear: 2024,
              isActive: true,
              allCompetitionsAdded: false
            },
            {
              id: 2,
              name: 'Season: Summer 24-Winter 25',
              startYear: 2024,
              endYear: 2025,
              isActive: true,
              allCompetitionsAdded: false
            }
          ]
        }),
        createCompetition: jest.fn().mockResolvedValue({
          id: 1,
          name: 'Test Competition',
          date: '2024-01-15',
          type: 'singles',
          seasonId: 1
        })
      };

      // Clear document body
      document.body.innerHTML = '';
    });

    afterEach(() => {
      // Clean up dialog if it exists
      if (dialog) {
        dialog.close();
        dialog = null;
      }
      
      // Clear document body
      document.body.innerHTML = '';
    });

    // Generator for competition data with optional missing fields
    const competitionDataWithMissingFieldsArbitrary = () => fc.record({
      name: fc.string({ minLength: 1, maxLength: 50 }),
      date: fc.option(fc.date().map(d => d.toISOString().split('T')[0]), { nil: null }),
      type: fc.option(fc.constantFrom('singles', 'doubles'), { nil: null }),
      seasonId: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null })
    }).filter(data => 
      // Ensure at least one required field is missing
      !data.date || !data.type || !data.seasonId
    );

    test('should reject submissions with missing date', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 4: Required Field Validation
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('singles', 'doubles'),
          fc.integer({ min: 1, max: 100 }),
          async (name, type, seasonId) => {
            // Clean up any existing dialogs first
            document.body.innerHTML = '';
            
            const testDialog = new CompetitionCreationDialog(mockApiClient);
            
            // Show dialog
            const showPromise = testDialog.show(name);
            
            // Wait for dialog to render and seasons to load
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Fill in all fields except date
            const nameInput = document.getElementById('competition-name');
            const dateInput = document.getElementById('competition-date');
            const typeSelect = document.getElementById('competition-type');
            const seasonSelect = document.getElementById('competition-season');
            
            expect(nameInput).toBeTruthy();
            expect(dateInput).toBeTruthy();
            expect(typeSelect).toBeTruthy();
            expect(seasonSelect).toBeTruthy();
            
            // Set values (leave date empty)
            nameInput.value = name;
            dateInput.value = ''; // Missing date
            typeSelect.value = type;
            seasonSelect.value = seasonId.toString();
            
            // Try to submit
            const form = document.getElementById('competition-form');
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);
            
            // Wait a tick for validation
            await new Promise(resolve => setTimeout(resolve, 20));
            
            // Verify error is shown for date
            const dateError = document.getElementById('date-error');
            expect(dateError).toBeTruthy();
            expect(dateError.style.display).not.toBe('none');
            expect(dateError.textContent).toContain('required');
            
            // Verify createCompetition was NOT called
            expect(mockApiClient.createCompetition).not.toHaveBeenCalled();
            
            // Clean up
            const cancelButton = document.getElementById('cancel-button');
            if (cancelButton) {
              cancelButton.click();
            }
            
            await showPromise;
            
            // Final cleanup
            testDialog.close();
            document.body.innerHTML = '';
          }
        ),
        { numRuns: 50 }
      );
    }, 10000);

    test('should reject submissions with missing type', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 4: Required Field Validation
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString().split('T')[0]),
          fc.integer({ min: 1, max: 100 }),
          async (name, date, seasonId) => {
            // Clean up any existing dialogs first
            document.body.innerHTML = '';
            
            const testDialog = new CompetitionCreationDialog(mockApiClient);
            
            // Show dialog
            const showPromise = testDialog.show(name);
            
            // Wait for dialog to render and seasons to load
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Fill in all fields except type
            const nameInput = document.getElementById('competition-name');
            const dateInput = document.getElementById('competition-date');
            const typeSelect = document.getElementById('competition-type');
            const seasonSelect = document.getElementById('competition-season');
            
            // Check if elements exist before proceeding
            if (!nameInput || !dateInput || !typeSelect || !seasonSelect) {
              // Skip this iteration if elements aren't ready
              const cancelButton = document.getElementById('cancel-button');
              if (cancelButton) cancelButton.click();
              await showPromise;
              testDialog.close();
              document.body.innerHTML = '';
              return;
            }
            
            // Set values (leave type empty)
            nameInput.value = name;
            dateInput.value = date;
            typeSelect.value = ''; // Missing type
            seasonSelect.value = seasonId.toString();
            
            // Try to submit
            const form = document.getElementById('competition-form');
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);
            
            // Wait a tick for validation
            await new Promise(resolve => setTimeout(resolve, 20));
            
            // Verify error is shown for type
            const typeError = document.getElementById('type-error');
            if (typeError) {
              expect(typeError.style.display).not.toBe('none');
              expect(typeError.textContent).toContain('required');
            }
            
            // Verify createCompetition was NOT called
            expect(mockApiClient.createCompetition).not.toHaveBeenCalled();
            
            // Clean up
            const cancelButton = document.getElementById('cancel-button');
            if (cancelButton) {
              cancelButton.click();
            }
            
            await showPromise;
            
            // Final cleanup
            testDialog.close();
            document.body.innerHTML = '';
          }
        ),
        { numRuns: 50 }
      );
    }, 10000);

    test('should reject submissions with missing seasonId', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 4: Required Field Validation
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString().split('T')[0]),
          fc.constantFrom('singles', 'doubles'),
          async (name, date, type) => {
            // Clean up any existing dialogs first
            document.body.innerHTML = '';
            
            const testDialog = new CompetitionCreationDialog(mockApiClient);
            
            // Show dialog
            const showPromise = testDialog.show(name);
            
            // Wait for dialog to render and seasons to load
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Fill in all fields except seasonId
            const nameInput = document.getElementById('competition-name');
            const dateInput = document.getElementById('competition-date');
            const typeSelect = document.getElementById('competition-type');
            const seasonSelect = document.getElementById('competition-season');
            
            expect(nameInput).toBeTruthy();
            expect(dateInput).toBeTruthy();
            expect(typeSelect).toBeTruthy();
            expect(seasonSelect).toBeTruthy();
            
            // Set values (leave seasonId empty)
            nameInput.value = name;
            dateInput.value = date;
            typeSelect.value = type;
            seasonSelect.value = ''; // Missing seasonId
            
            // Try to submit
            const form = document.getElementById('competition-form');
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);
            
            // Wait a tick for validation
            await new Promise(resolve => setTimeout(resolve, 20));
            
            // Verify error is shown for season
            const seasonError = document.getElementById('season-error');
            expect(seasonError).toBeTruthy();
            expect(seasonError.style.display).not.toBe('none');
            expect(seasonError.textContent).toContain('required');
            
            // Verify createCompetition was NOT called
            expect(mockApiClient.createCompetition).not.toHaveBeenCalled();
            
            // Clean up
            const cancelButton = document.getElementById('cancel-button');
            if (cancelButton) {
              cancelButton.click();
            }
            
            await showPromise;
            
            // Final cleanup
            testDialog.close();
            document.body.innerHTML = '';
          }
        ),
        { numRuns: 50 }
      );
    }, 10000);

    test('should reject submissions with multiple missing required fields', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 4: Required Field Validation
      await fc.assert(
        fc.asyncProperty(
          competitionDataWithMissingFieldsArbitrary(),
          async (data) => {
            // Clean up any existing dialogs first
            document.body.innerHTML = '';
            
            const testDialog = new CompetitionCreationDialog(mockApiClient);
            
            // Show dialog
            const showPromise = testDialog.show(data.name);
            
            // Wait for dialog to render and seasons to load
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Fill in fields with provided data (some will be missing)
            const nameInput = document.getElementById('competition-name');
            const dateInput = document.getElementById('competition-date');
            const typeSelect = document.getElementById('competition-type');
            const seasonSelect = document.getElementById('competition-season');
            
            // Check if elements exist before proceeding
            if (!nameInput || !dateInput || !typeSelect || !seasonSelect) {
              // Skip this iteration if elements aren't ready
              const cancelButton = document.getElementById('cancel-button');
              if (cancelButton) cancelButton.click();
              await showPromise;
              testDialog.close();
              document.body.innerHTML = '';
              return;
            }
            
            // Set values (some may be null/empty)
            nameInput.value = data.name;
            dateInput.value = data.date || '';
            typeSelect.value = data.type || '';
            seasonSelect.value = data.seasonId ? data.seasonId.toString() : '';
            
            // Try to submit
            const form = document.getElementById('competition-form');
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);
            
            // Wait a tick for validation
            await new Promise(resolve => setTimeout(resolve, 20));
            
            // Verify at least one error is shown
            const dateError = document.getElementById('date-error');
            const typeError = document.getElementById('type-error');
            const seasonError = document.getElementById('season-error');
            
            const hasDateError = !data.date && dateError && dateError.style.display !== 'none';
            const hasTypeError = !data.type && typeError && typeError.style.display !== 'none';
            const hasSeasonError = !data.seasonId && seasonError && seasonError.style.display !== 'none';
            
            // At least one error should be shown for missing fields
            expect(hasDateError || hasTypeError || hasSeasonError).toBe(true);
            
            // Verify createCompetition was NOT called
            expect(mockApiClient.createCompetition).not.toHaveBeenCalled();
            
            // Clean up
            const cancelButton = document.getElementById('cancel-button');
            if (cancelButton) {
              cancelButton.click();
            }
            
            await showPromise;
            
            // Final cleanup
            testDialog.close();
            document.body.innerHTML = '';
          }
        ),
        { numRuns: 50 }
      );
    }, 10000);

    test('should allow submission only when all required fields are present', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 4: Required Field Validation
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString().split('T')[0]),
          fc.constantFrom('singles', 'doubles'),
          fc.integer({ min: 1, max: 2 }),
          async (name, date, type, seasonId) => {
            // Clean up any existing dialogs first
            document.body.innerHTML = '';
            
            // Reset mock
            mockApiClient.createCompetition.mockClear();
            
            const testDialog = new CompetitionCreationDialog(mockApiClient);
            
            // Show dialog
            const showPromise = testDialog.show(name);
            
            // Wait for dialog to render and seasons to load
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Fill in ALL required fields
            const nameInput = document.getElementById('competition-name');
            const dateInput = document.getElementById('competition-date');
            const typeSelect = document.getElementById('competition-type');
            const seasonSelect = document.getElementById('competition-season');
            
            expect(nameInput).toBeTruthy();
            expect(dateInput).toBeTruthy();
            expect(typeSelect).toBeTruthy();
            expect(seasonSelect).toBeTruthy();
            
            // Set all values
            nameInput.value = name;
            dateInput.value = date;
            typeSelect.value = type;
            seasonSelect.value = seasonId.toString();
            
            // Try to submit
            const form = document.getElementById('competition-form');
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);
            
            // Wait for submission to complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Verify createCompetition WAS called with correct data
            expect(mockApiClient.createCompetition).toHaveBeenCalledWith({
              name: name.trim(),
              date: date,
              type: type,
              seasonId: seasonId
            });
            
            // Wait for promise to resolve
            const result = await showPromise;
            
            // Verify result is the created competition
            expect(result).toBeTruthy();
            expect(result.name).toBe('Test Competition');
            
            // Final cleanup
            testDialog.close();
            document.body.innerHTML = '';
          }
        ),
        { numRuns: 50 }
      );
    }, 15000);

    test('should show specific error messages for each missing field', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 4: Required Field Validation
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          async (name) => {
            // Clean up any existing dialogs first
            document.body.innerHTML = '';
            
            const testDialog = new CompetitionCreationDialog(mockApiClient);
            
            // Show dialog
            const showPromise = testDialog.show(name);
            
            // Wait for dialog to render and seasons to load
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Leave ALL required fields empty (except name which is pre-populated)
            const dateInput = document.getElementById('competition-date');
            const typeSelect = document.getElementById('competition-type');
            const seasonSelect = document.getElementById('competition-season');
            
            if (!dateInput || !typeSelect || !seasonSelect) {
              // Skip if elements aren't ready
              const cancelButton = document.getElementById('cancel-button');
              if (cancelButton) cancelButton.click();
              await showPromise;
              testDialog.close();
              document.body.innerHTML = '';
              return;
            }
            
            dateInput.value = '';
            typeSelect.value = '';
            seasonSelect.value = '';
            
            // Try to submit
            const form = document.getElementById('competition-form');
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);
            
            // Wait a tick for validation
            await new Promise(resolve => setTimeout(resolve, 20));
            
            // Verify specific error messages are shown for each field
            const dateError = document.getElementById('date-error');
            const typeError = document.getElementById('type-error');
            const seasonError = document.getElementById('season-error');
            
            if (dateError) {
              expect(dateError.style.display).not.toBe('none');
              expect(dateError.textContent).toBeTruthy();
            }
            
            if (typeError) {
              expect(typeError.style.display).not.toBe('none');
              expect(typeError.textContent).toBeTruthy();
            }
            
            if (seasonError) {
              expect(seasonError.style.display).not.toBe('none');
              expect(seasonError.textContent).toBeTruthy();
            }
            
            // Verify createCompetition was NOT called
            expect(mockApiClient.createCompetition).not.toHaveBeenCalled();
            
            // Clean up
            const cancelButton = document.getElementById('cancel-button');
            if (cancelButton) {
              cancelButton.click();
            }
            
            await showPromise;
            
            // Final cleanup
            testDialog.close();
            document.body.innerHTML = '';
          }
        ),
        { numRuns: 50 }
      );
    }, 10000);
  });

  describe('Property 5: Season Filtering', () => {
    /**
     * **Validates: Requirements 2.5, 5.4**
     * 
     * For any presentation season where allCompetitionsAdded is true,
     * that season should not appear in the competition creation dialog's season dropdown
     */

    let mockApiClient;
    let dialog;

    beforeEach(() => {
      // Clear document body
      document.body.innerHTML = '';
    });

    afterEach(() => {
      // Clean up dialog if it exists
      if (dialog) {
        dialog.close();
        dialog = null;
      }
      
      // Clear document body
      document.body.innerHTML = '';
    });

    // Generator for presentation seasons with various allCompetitionsAdded values
    const seasonArbitrary = () => fc.record({
      id: fc.integer({ min: 1, max: 1000 }),
      name: fc.string({ minLength: 5, maxLength: 50 }),
      startYear: fc.integer({ min: 2020, max: 2030 }),
      endYear: fc.integer({ min: 2020, max: 2030 }),
      isActive: fc.boolean(),
      allCompetitionsAdded: fc.boolean()
    });

    // Generator for a list of seasons with at least one of each type
    const mixedSeasonsArbitrary = () => fc.array(seasonArbitrary(), { minLength: 2, maxLength: 6 })
      .chain(seasons => {
        // Ensure we have at least one season with allCompetitionsAdded=true
        // and at least one with allCompetitionsAdded=false
        const hasTrue = seasons.some(s => s.allCompetitionsAdded === true);
        const hasFalse = seasons.some(s => s.allCompetitionsAdded === false);
        
        if (!hasTrue) {
          seasons[0].allCompetitionsAdded = true;
        }
        if (!hasFalse) {
          seasons[seasons.length - 1].allCompetitionsAdded = false;
        }
        
        return fc.constant(seasons);
      });

    test('should only show seasons with allCompetitionsAdded=false in dropdown', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 5: Season Filtering
      await fc.assert(
        fc.asyncProperty(
          mixedSeasonsArbitrary(),
          fc.string({ minLength: 1, maxLength: 30 }),
          async (allSeasons, competitionName) => {
            // Clean up any existing dialogs first
            document.body.innerHTML = '';
            
            // Filter seasons that should appear (allCompetitionsAdded=false)
            const expectedSeasons = allSeasons.filter(s => s.allCompetitionsAdded === false);
            const excludedSeasons = allSeasons.filter(s => s.allCompetitionsAdded === true);
            
            // Set up mock API client to return filtered seasons
            mockApiClient = {
              request: jest.fn().mockImplementation((url) => {
                if (url.includes('/api/presentation-seasons?allCompetitionsAdded=false')) {
                  return Promise.resolve({ seasons: expectedSeasons });
                }
                return Promise.resolve({ seasons: allSeasons });
              }),
              createCompetition: jest.fn()
            };
            
            const testDialog = new CompetitionCreationDialog(mockApiClient);
            
            // Show dialog
            const showPromise = testDialog.show(competitionName);
            
            // Wait for dialog to render and seasons to load
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Verify the API was called with the correct filter
            expect(mockApiClient.request).toHaveBeenCalledWith(
              '/api/presentation-seasons?allCompetitionsAdded=false',
              { method: 'GET' }
            );
            
            // Get the season dropdown
            const seasonSelect = document.getElementById('competition-season');
            expect(seasonSelect).toBeTruthy();
            
            // Get all option values (excluding the placeholder)
            const options = Array.from(seasonSelect.options)
              .filter(opt => opt.value !== '')
              .map(opt => parseInt(opt.value, 10));
            
            // Verify all expected seasons are present
            expectedSeasons.forEach(season => {
              expect(options).toContain(season.id);
            });
            
            // Verify excluded seasons are NOT present
            excludedSeasons.forEach(season => {
              expect(options).not.toContain(season.id);
            });
            
            // Verify the count matches
            expect(options.length).toBe(expectedSeasons.length);
            
            // Clean up
            const cancelButton = document.getElementById('cancel-button');
            if (cancelButton) {
              cancelButton.click();
            }
            
            await showPromise;
            
            // Final cleanup
            testDialog.close();
            document.body.innerHTML = '';
          }
        ),
        { numRuns: 30 }
      );
    }, 60000);

    test('should exclude all seasons when all have allCompetitionsAdded=true', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 5: Season Filtering
      // This test verifies that when NO seasons are available (all marked complete),
      // the dropdown shows an appropriate message
      
      const competitionName = 'Test Competition';
      
      // Clean up any existing dialogs first
      document.body.innerHTML = '';
      
      // Set up mock API client to return empty list (simulating all seasons filtered out)
      mockApiClient = {
        request: jest.fn().mockResolvedValue({ seasons: [] }),
        createCompetition: jest.fn()
      };
      
      const testDialog = new CompetitionCreationDialog(mockApiClient);
      
      // Show dialog
      const showPromise = testDialog.show(competitionName);
      
      // Wait for dialog to render and seasons to load
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Get the season dropdown
      const seasonSelect = document.getElementById('competition-season');
      expect(seasonSelect).toBeTruthy();
      
      // Verify dropdown shows "No available seasons" message and is disabled
      expect(seasonSelect.disabled).toBe(true);
      const options = Array.from(seasonSelect.options);
      expect(options.length).toBe(1);
      expect(options[0].textContent).toContain('No available seasons');
      
      // Verify error message is shown
      const seasonError = document.getElementById('season-error');
      expect(seasonError).toBeTruthy();
      expect(seasonError.style.display).not.toBe('none');
      
      // Clean up
      const cancelButton = document.getElementById('cancel-button');
      if (cancelButton) {
        cancelButton.click();
      }
      
      await showPromise;
      
      // Final cleanup
      testDialog.close();
      document.body.innerHTML = '';
    });

    test('should show all seasons when all have allCompetitionsAdded=false', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 5: Season Filtering
      await fc.assert(
        fc.asyncProperty(
          fc.array(seasonArbitrary(), { minLength: 1, maxLength: 6 }),
          fc.string({ minLength: 1, maxLength: 30 }),
          async (seasons, competitionName) => {
            // Clean up any existing dialogs first
            document.body.innerHTML = '';
            
            // Set all seasons to have allCompetitionsAdded=false
            const allIncompleteSeasons = seasons.map(s => ({ ...s, allCompetitionsAdded: false }));
            
            // Set up mock API client
            mockApiClient = {
              request: jest.fn().mockResolvedValue({ seasons: allIncompleteSeasons }),
              createCompetition: jest.fn()
            };
            
            const testDialog = new CompetitionCreationDialog(mockApiClient);
            
            // Show dialog
            const showPromise = testDialog.show(competitionName);
            
            // Wait for dialog to render and seasons to load
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Get the season dropdown
            const seasonSelect = document.getElementById('competition-season');
            expect(seasonSelect).toBeTruthy();
            
            // Verify dropdown is enabled
            expect(seasonSelect.disabled).toBe(false);
            
            // Get all option values (excluding the placeholder)
            const options = Array.from(seasonSelect.options)
              .filter(opt => opt.value !== '')
              .map(opt => parseInt(opt.value, 10));
            
            // Verify all seasons are present
            expect(options.length).toBe(allIncompleteSeasons.length);
            allIncompleteSeasons.forEach(season => {
              expect(options).toContain(season.id);
            });
            
            // Clean up
            const cancelButton = document.getElementById('cancel-button');
            if (cancelButton) {
              cancelButton.click();
            }
            
            await showPromise;
            
            // Final cleanup
            testDialog.close();
            document.body.innerHTML = '';
          }
        ),
        { numRuns: 30 }
      );
    }, 60000);

    test('should correctly filter seasons with specific allCompetitionsAdded values', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 5: Season Filtering
      const competitionName = 'Test Competition';
      
      // Clean up any existing dialogs first
      document.body.innerHTML = '';
      
      // Create seasons where some have allCompetitionsAdded=true and others false
      const allSeasons = [
        { id: 1, name: 'Season 1', allCompetitionsAdded: false },
        { id: 2, name: 'Season 2', allCompetitionsAdded: true },
        { id: 3, name: 'Season 3', allCompetitionsAdded: false },
        { id: 4, name: 'Season 4', allCompetitionsAdded: true },
        { id: 5, name: 'Season 5', allCompetitionsAdded: false }
      ];
      
      const expectedSeasons = allSeasons.filter(s => !s.allCompetitionsAdded);
      
      // Set up mock API client
      mockApiClient = {
        request: jest.fn().mockResolvedValue({ seasons: expectedSeasons }),
        createCompetition: jest.fn()
      };
      
      const testDialog = new CompetitionCreationDialog(mockApiClient);
      
      // Show dialog
      const showPromise = testDialog.show(competitionName);
      
      // Wait for dialog to render and seasons to load
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Get the season dropdown
      const seasonSelect = document.getElementById('competition-season');
      expect(seasonSelect).toBeTruthy();
      
      // Get all option values (excluding the placeholder)
      const options = Array.from(seasonSelect.options)
        .filter(opt => opt.value !== '')
        .map(opt => parseInt(opt.value, 10));
      
      // Verify only seasons with allCompetitionsAdded=false are present
      expect(options).toEqual(expect.arrayContaining([1, 3, 5]));
      expect(options).not.toContain(2);
      expect(options).not.toContain(4);
      expect(options.length).toBe(3);
      
      // Clean up
      const cancelButton = document.getElementById('cancel-button');
      if (cancelButton) {
        cancelButton.click();
      }
      
      await showPromise;
      
      // Final cleanup
      testDialog.close();
      document.body.innerHTML = '';
    });

    test('should maintain filtering consistency across multiple dialog instances', async () => {
      // Feature: auto-create-competitions-from-transactions, Property 5: Season Filtering
      await fc.assert(
        fc.asyncProperty(
          mixedSeasonsArbitrary(),
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 3 }),
          async (allSeasons, competitionNames) => {
            // Clean up any existing dialogs first
            document.body.innerHTML = '';
            
            const expectedSeasons = allSeasons.filter(s => s.allCompetitionsAdded === false);
            
            // Set up mock API client
            mockApiClient = {
              request: jest.fn().mockResolvedValue({ seasons: expectedSeasons }),
              createCompetition: jest.fn()
            };
            
            // Show multiple dialogs sequentially and verify filtering is consistent
            for (const competitionName of competitionNames) {
              const testDialog = new CompetitionCreationDialog(mockApiClient);
              
              // Show dialog
              const showPromise = testDialog.show(competitionName);
              
              // Wait for dialog to render and seasons to load
              await new Promise(resolve => setTimeout(resolve, 50));
              
              // Get the season dropdown
              const seasonSelect = document.getElementById('competition-season');
              expect(seasonSelect).toBeTruthy();
              
              // Get all option values (excluding the placeholder)
              const options = Array.from(seasonSelect.options)
                .filter(opt => opt.value !== '')
                .map(opt => parseInt(opt.value, 10));
              
              // Verify filtering is consistent
              expect(options.length).toBe(expectedSeasons.length);
              expectedSeasons.forEach(season => {
                expect(options).toContain(season.id);
              });
              
              // Clean up this dialog
              const cancelButton = document.getElementById('cancel-button');
              if (cancelButton) {
                cancelButton.click();
              }
              
              await showPromise;
              testDialog.close();
              document.body.innerHTML = '';
            }
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);
  });
});
