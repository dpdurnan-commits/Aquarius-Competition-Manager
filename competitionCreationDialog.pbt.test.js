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
});
