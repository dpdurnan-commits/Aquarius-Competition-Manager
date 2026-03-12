/**
 * Unit tests for WinnersTable component
 */

import { WinnersTable } from './winnersTable.js';

describe('WinnersTable', () => {
  let winnersTable;
  let mockApiClient;
  let container;

  beforeEach(() => {
    // Create mock API client
    mockApiClient = {};

    // Create container element
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);

    // Create instance
    winnersTable = new WinnersTable(mockApiClient);
  });

  afterEach(() => {
    // Clean up
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('render()', () => {
    test('should render empty message when winners array is empty', () => {
      winnersTable.render('test-container', []);

      const emptyMessage = container.querySelector('.empty-message');
      expect(emptyMessage).toBeTruthy();
      expect(emptyMessage.textContent).toContain('No competitions found');
    });

    test('should render table with correct headers', () => {
      const winners = [
        {
          competitionId: 1,
          competitionName: 'Test Competition',
          competitionDate: '2024-01-15',
          competitionType: 'singles',
          winners: [{ playerName: 'John Doe', finishingPosition: 1 }]
        }
      ];

      winnersTable.render('test-container', winners);

      const headers = container.querySelectorAll('th');
      expect(headers.length).toBe(5);
      expect(headers[0].textContent).toBe('Competition');
      expect(headers[1].textContent).toBe('Date');
      expect(headers[2].textContent).toBe('Type');
      expect(headers[3].textContent).toBe('Winner(s)');
      expect(headers[4].textContent).toBe('Amount (£)');
    });

    test('should render singles competition with single winner name', () => {
      const winners = [
        {
          competitionId: 1,
          competitionName: 'Singles Test',
          competitionDate: '2024-01-15',
          competitionType: 'singles',
          winners: [{ playerName: 'John Doe', finishingPosition: 1 }]
        }
      ];

      winnersTable.render('test-container', winners);

      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);

      const cells = rows[0].querySelectorAll('td');
      expect(cells[0].textContent).toBe('Singles Test');
      expect(cells[1].textContent).toBe('2024-01-15');
      expect(cells[2].textContent).toBe('singles');
      expect(cells[3].textContent).toBe('John Doe');
    });

    test('should render doubles competition with both winner names', () => {
      const winners = [
        {
          competitionId: 2,
          competitionName: 'Doubles Test',
          competitionDate: '2024-01-20',
          competitionType: 'doubles',
          winners: [
            { playerName: 'John Doe', finishingPosition: 1 },
            { playerName: 'Jane Smith', finishingPosition: 1 }
          ]
        }
      ];

      winnersTable.render('test-container', winners);

      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);

      const cells = rows[0].querySelectorAll('td');
      expect(cells[3].textContent).toBe('John Doe & Jane Smith');
    });

    test('should render "No winner recorded" for competitions without winners', () => {
      const winners = [
        {
          competitionId: 3,
          competitionName: 'No Winner Test',
          competitionDate: '2024-01-25',
          competitionType: 'singles',
          winners: []
        }
      ];

      winnersTable.render('test-container', winners);

      const rows = container.querySelectorAll('tbody tr');
      const cells = rows[0].querySelectorAll('td');
      expect(cells[3].textContent).toBe('No winner recorded');
      expect(cells[3].className).toContain('no-winner');
    });

    test('should render input field for competitions with winners', () => {
      const winners = [
        {
          competitionId: 1,
          competitionName: 'Test Competition',
          competitionDate: '2024-01-15',
          competitionType: 'singles',
          winners: [{ playerName: 'John Doe', finishingPosition: 1 }]
        }
      ];

      winnersTable.render('test-container', winners);

      const input = container.querySelector('.amount-input');
      expect(input).toBeTruthy();
      expect(input.type).toBe('number');
      expect(input.step).toBe('0.01');
      expect(input.min).toBe('0');
    });

    test('should disable input field for competitions without winners', () => {
      const winners = [
        {
          competitionId: 3,
          competitionName: 'No Winner Test',
          competitionDate: '2024-01-25',
          competitionType: 'singles',
          winners: []
        }
      ];

      winnersTable.render('test-container', winners);

      const input = container.querySelector('.amount-input');
      expect(input).toBeTruthy();
      expect(input.disabled).toBe(true);
      expect(input.value).toBe('N/A');
    });

    test('should render in read-only mode with existing assignments', () => {
      const winners = [
        {
          competitionId: 1,
          competitionName: 'Test Competition',
          competitionDate: '2024-01-15',
          competitionType: 'singles',
          winners: [{ playerName: 'John Doe', finishingPosition: 1 }]
        }
      ];

      const existingAssignments = [
        { competitionId: 1, amount: 50.00 }
      ];

      winnersTable.render('test-container', winners, true, existingAssignments);

      const amountCell = container.querySelector('.amount-readonly');
      expect(amountCell).toBeTruthy();
      expect(amountCell.textContent).toBe('£50.00');

      // Should not have input fields
      const input = container.querySelector('input.amount-input');
      expect(input).toBeFalsy();
    });

    test('should render mix of singles and doubles competitions', () => {
      const winners = [
        {
          competitionId: 1,
          competitionName: 'Singles Test',
          competitionDate: '2024-01-15',
          competitionType: 'singles',
          winners: [{ playerName: 'John Doe', finishingPosition: 1 }]
        },
        {
          competitionId: 2,
          competitionName: 'Doubles Test',
          competitionDate: '2024-01-20',
          competitionType: 'doubles',
          winners: [
            { playerName: 'Jane Smith', finishingPosition: 1 },
            { playerName: 'Bob Johnson', finishingPosition: 1 }
          ]
        }
      ];

      winnersTable.render('test-container', winners);

      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);

      const row1Cells = rows[0].querySelectorAll('td');
      expect(row1Cells[3].textContent).toBe('John Doe');

      const row2Cells = rows[1].querySelectorAll('td');
      expect(row2Cells[3].textContent).toBe('Jane Smith & Bob Johnson');
    });
  });

  describe('validateAmountInput()', () => {
    test('should accept valid non-negative decimal numbers', () => {
      const input = document.createElement('input');
      input.value = '50.00';
      const errorMsg = document.createElement('div');
      errorMsg.className = 'input-error';
      const cell = document.createElement('td');
      cell.appendChild(input);
      cell.appendChild(errorMsg);

      const result = winnersTable.validateAmountInput(input);

      expect(result).toBe(true);
      expect(input.classList.contains('invalid')).toBe(false);
    });

    test('should accept zero as valid amount', () => {
      const input = document.createElement('input');
      input.value = '0';
      const errorMsg = document.createElement('div');
      errorMsg.className = 'input-error';
      const cell = document.createElement('td');
      cell.appendChild(input);
      cell.appendChild(errorMsg);

      const result = winnersTable.validateAmountInput(input);

      expect(result).toBe(true);
      expect(input.classList.contains('invalid')).toBe(false);
    });

    test('should accept empty value', () => {
      const input = document.createElement('input');
      input.value = '';
      const errorMsg = document.createElement('div');
      errorMsg.className = 'input-error';
      const cell = document.createElement('td');
      cell.appendChild(input);
      cell.appendChild(errorMsg);

      const result = winnersTable.validateAmountInput(input);

      expect(result).toBe(true);
      expect(input.classList.contains('invalid')).toBe(false);
    });

    test('should reject negative numbers', () => {
      const input = document.createElement('input');
      input.value = '-10.00';
      const errorMsg = document.createElement('div');
      errorMsg.className = 'input-error';
      const cell = document.createElement('td');
      cell.appendChild(input);
      cell.appendChild(errorMsg);

      const result = winnersTable.validateAmountInput(input);

      expect(result).toBe(false);
      expect(input.classList.contains('invalid')).toBe(true);
      expect(errorMsg.textContent).toContain('cannot be negative');
    });

    test('should reject non-numeric values', () => {
      const input = document.createElement('input');
      input.value = 'abc';
      const errorMsg = document.createElement('div');
      errorMsg.className = 'input-error';
      const cell = document.createElement('td');
      cell.appendChild(input);
      cell.appendChild(errorMsg);

      const result = winnersTable.validateAmountInput(input);

      expect(result).toBe(false);
      expect(input.classList.contains('invalid')).toBe(true);
      expect(errorMsg.textContent).toContain('valid number');
    });

    test('should reject values with more than 2 decimal places', () => {
      const input = document.createElement('input');
      input.value = '50.123';
      const errorMsg = document.createElement('div');
      errorMsg.className = 'input-error';
      const cell = document.createElement('td');
      cell.appendChild(input);
      cell.appendChild(errorMsg);

      const result = winnersTable.validateAmountInput(input);

      expect(result).toBe(false);
      expect(input.classList.contains('invalid')).toBe(true);
      expect(errorMsg.textContent).toContain('2 decimal places');
    });

    test('should accept values with 1 decimal place', () => {
      const input = document.createElement('input');
      input.value = '50.5';
      const errorMsg = document.createElement('div');
      errorMsg.className = 'input-error';
      const cell = document.createElement('td');
      cell.appendChild(input);
      cell.appendChild(errorMsg);

      const result = winnersTable.validateAmountInput(input);

      expect(result).toBe(true);
      expect(input.classList.contains('invalid')).toBe(false);
    });

    test('should accept values with exactly 2 decimal places', () => {
      const input = document.createElement('input');
      input.value = '50.99';
      const errorMsg = document.createElement('div');
      errorMsg.className = 'input-error';
      const cell = document.createElement('td');
      cell.appendChild(input);
      cell.appendChild(errorMsg);

      const result = winnersTable.validateAmountInput(input);

      expect(result).toBe(true);
      expect(input.classList.contains('invalid')).toBe(false);
    });
  });

  describe('getAssignments()', () => {
    test('should return empty array when no amounts assigned', () => {
      const winners = [
        {
          competitionId: 1,
          competitionName: 'Test Competition',
          competitionDate: '2024-01-15',
          competitionType: 'singles',
          winners: [{ playerName: 'John Doe', finishingPosition: 1 }]
        }
      ];

      winnersTable.render('test-container', winners);

      const assignments = winnersTable.getAssignments();
      expect(assignments).toEqual([]);
    });

    test('should return assignments for competitions with amounts', () => {
      const winners = [
        {
          competitionId: 1,
          competitionName: 'Test Competition',
          competitionDate: '2024-01-15',
          competitionType: 'singles',
          winners: [{ playerName: 'John Doe', finishingPosition: 1 }]
        }
      ];

      winnersTable.render('test-container', winners);
      winnersTable.amounts.set(1, 50.00);

      const assignments = winnersTable.getAssignments();
      expect(assignments).toEqual([
        { competitionId: 1, amount: 50.00 }
      ]);
    });

    test('should exclude competitions without winners', () => {
      const winners = [
        {
          competitionId: 1,
          competitionName: 'With Winner',
          competitionDate: '2024-01-15',
          competitionType: 'singles',
          winners: [{ playerName: 'John Doe', finishingPosition: 1 }]
        },
        {
          competitionId: 2,
          competitionName: 'No Winner',
          competitionDate: '2024-01-20',
          competitionType: 'singles',
          winners: []
        }
      ];

      winnersTable.render('test-container', winners);
      winnersTable.amounts.set(1, 50.00);
      winnersTable.amounts.set(2, 30.00); // This should be excluded

      const assignments = winnersTable.getAssignments();
      expect(assignments).toEqual([
        { competitionId: 1, amount: 50.00 }
      ]);
    });

    test('should return multiple assignments', () => {
      const winners = [
        {
          competitionId: 1,
          competitionName: 'Competition 1',
          competitionDate: '2024-01-15',
          competitionType: 'singles',
          winners: [{ playerName: 'John Doe', finishingPosition: 1 }]
        },
        {
          competitionId: 2,
          competitionName: 'Competition 2',
          competitionDate: '2024-01-20',
          competitionType: 'doubles',
          winners: [
            { playerName: 'Jane Smith', finishingPosition: 1 },
            { playerName: 'Bob Johnson', finishingPosition: 1 }
          ]
        }
      ];

      winnersTable.render('test-container', winners);
      winnersTable.amounts.set(1, 50.00);
      winnersTable.amounts.set(2, 75.00);

      const assignments = winnersTable.getAssignments();
      expect(assignments).toEqual([
        { competitionId: 1, amount: 50.00 },
        { competitionId: 2, amount: 75.00 }
      ]);
    });
  });

  describe('validateAssignments()', () => {
    test('should return valid when all winners have assigned amounts', () => {
      const winners = [
        {
          competitionId: 1,
          competitionName: 'Competition 1',
          competitionDate: '2024-01-15',
          competitionType: 'singles',
          winners: [{ playerName: 'John Doe', finishingPosition: 1 }]
        }
      ];

      winnersTable.render('test-container', winners);
      winnersTable.amounts.set(1, 50.00);

      const result = winnersTable.validateAssignments();
      expect(result.valid).toBe(true);
      expect(result.warning).toBe('');
    });

    test('should return invalid when some winners have no assigned amounts', () => {
      const winners = [
        {
          competitionId: 1,
          competitionName: 'Competition 1',
          competitionDate: '2024-01-15',
          competitionType: 'singles',
          winners: [{ playerName: 'John Doe', finishingPosition: 1 }]
        },
        {
          competitionId: 2,
          competitionName: 'Competition 2',
          competitionDate: '2024-01-20',
          competitionType: 'singles',
          winners: [{ playerName: 'Jane Smith', finishingPosition: 1 }]
        }
      ];

      winnersTable.render('test-container', winners);
      winnersTable.amounts.set(1, 50.00);
      // Competition 2 has no amount

      const result = winnersTable.validateAssignments();
      expect(result.valid).toBe(false);
      expect(result.warning).toContain('Competition 2');
      expect(result.warning).toContain('physical prizes');
    });

    test('should accept zero amounts as valid', () => {
      const winners = [
        {
          competitionId: 1,
          competitionName: 'Competition 1',
          competitionDate: '2024-01-15',
          competitionType: 'singles',
          winners: [{ playerName: 'John Doe', finishingPosition: 1 }]
        }
      ];

      winnersTable.render('test-container', winners);
      winnersTable.amounts.set(1, 0);

      const result = winnersTable.validateAssignments();
      expect(result.valid).toBe(true);
    });

    test('should ignore competitions without winners', () => {
      const winners = [
        {
          competitionId: 1,
          competitionName: 'With Winner',
          competitionDate: '2024-01-15',
          competitionType: 'singles',
          winners: [{ playerName: 'John Doe', finishingPosition: 1 }]
        },
        {
          competitionId: 2,
          competitionName: 'No Winner',
          competitionDate: '2024-01-20',
          competitionType: 'singles',
          winners: []
        }
      ];

      winnersTable.render('test-container', winners);
      winnersTable.amounts.set(1, 50.00);
      // Competition 2 has no winner, so no amount needed

      const result = winnersTable.validateAssignments();
      expect(result.valid).toBe(true);
    });
  });

  describe('handleAmountChange()', () => {
    test('should emit amounts-changed event when amount changes', (done) => {
      const winners = [
        {
          competitionId: 1,
          competitionName: 'Test Competition',
          competitionDate: '2024-01-15',
          competitionType: 'singles',
          winners: [{ playerName: 'John Doe', finishingPosition: 1 }]
        }
      ];

      winnersTable.render('test-container', winners);

      document.addEventListener('amounts-changed', (event) => {
        expect(event.detail.amounts).toEqual([
          { competitionId: 1, amount: 50.00 }
        ]);
        done();
      }, { once: true });

      const input = container.querySelector('.amount-input');
      input.value = '50.00';
      input.dispatchEvent(new Event('input'));
    });
  });

  describe('Edge cases and additional validation', () => {
    test('should handle very large amounts', () => {
      const input = document.createElement('input');
      input.value = '999999.99';
      const errorMsg = document.createElement('div');
      errorMsg.className = 'input-error';
      const cell = document.createElement('td');
      cell.appendChild(input);
      cell.appendChild(errorMsg);

      const result = winnersTable.validateAmountInput(input);

      expect(result).toBe(true);
      expect(input.classList.contains('invalid')).toBe(false);
    });

    test('should handle whitespace in input', () => {
      const input = document.createElement('input');
      input.value = '  50.00  ';
      const errorMsg = document.createElement('div');
      errorMsg.className = 'input-error';
      const cell = document.createElement('td');
      cell.appendChild(input);
      cell.appendChild(errorMsg);

      const result = winnersTable.validateAmountInput(input);

      expect(result).toBe(true);
      expect(input.classList.contains('invalid')).toBe(false);
    });

    test('should render mix of competitions with and without winners', () => {
      const winners = [
        {
          competitionId: 1,
          competitionName: 'Singles with Winner',
          competitionDate: '2024-01-15',
          competitionType: 'singles',
          winners: [{ playerName: 'John Doe', finishingPosition: 1 }]
        },
        {
          competitionId: 2,
          competitionName: 'Doubles with Winners',
          competitionDate: '2024-01-20',
          competitionType: 'doubles',
          winners: [
            { playerName: 'Jane Smith', finishingPosition: 1 },
            { playerName: 'Bob Johnson', finishingPosition: 1 }
          ]
        },
        {
          competitionId: 3,
          competitionName: 'Singles No Winner',
          competitionDate: '2024-01-25',
          competitionType: 'singles',
          winners: []
        },
        {
          competitionId: 4,
          competitionName: 'Doubles No Winner',
          competitionDate: '2024-01-30',
          competitionType: 'doubles',
          winners: []
        }
      ];

      winnersTable.render('test-container', winners);

      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(4);

      // Check first row (singles with winner)
      const row1Cells = rows[0].querySelectorAll('td');
      expect(row1Cells[3].textContent).toBe('John Doe');
      const row1Input = row1Cells[4].querySelector('.amount-input');
      expect(row1Input).toBeTruthy();
      expect(row1Input.disabled).toBe(false);

      // Check second row (doubles with winners)
      const row2Cells = rows[1].querySelectorAll('td');
      expect(row2Cells[3].textContent).toBe('Jane Smith & Bob Johnson');
      const row2Input = row2Cells[4].querySelector('.amount-input');
      expect(row2Input).toBeTruthy();
      expect(row2Input.disabled).toBe(false);

      // Check third row (singles no winner)
      const row3Cells = rows[2].querySelectorAll('td');
      expect(row3Cells[3].textContent).toBe('No winner recorded');
      const row3Input = row3Cells[4].querySelector('.amount-input');
      expect(row3Input).toBeTruthy();
      expect(row3Input.disabled).toBe(true);
      expect(row3Input.value).toBe('N/A');

      // Check fourth row (doubles no winner)
      const row4Cells = rows[3].querySelectorAll('td');
      expect(row4Cells[3].textContent).toBe('No winner recorded');
      const row4Input = row4Cells[4].querySelector('.amount-input');
      expect(row4Input).toBeTruthy();
      expect(row4Input.disabled).toBe(true);
      expect(row4Input.value).toBe('N/A');
    });

    test('should handle snake_case field names from API', () => {
      const winners = [
        {
          competition_id: 1,
          competition_name: 'Test Competition',
          competition_date: '2024-01-15',
          competition_type: 'singles',
          winners: [{ player_name: 'John Doe', finishing_position: 1 }]
        }
      ];

      winnersTable.render('test-container', winners);

      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);

      const cells = rows[0].querySelectorAll('td');
      expect(cells[0].textContent).toBe('Test Competition');
      expect(cells[1].textContent).toBe('2024-01-15');
      expect(cells[2].textContent).toBe('singles');
      expect(cells[3].textContent).toBe('John Doe');
    });

    test('should handle doubles with snake_case field names', () => {
      const winners = [
        {
          competition_id: 2,
          competition_name: 'Doubles Test',
          competition_date: '2024-01-20',
          competition_type: 'doubles',
          winners: [
            { player_name: 'John Doe', finishing_position: 1 },
            { player_name: 'Jane Smith', finishing_position: 1 }
          ]
        }
      ];

      winnersTable.render('test-container', winners);

      const rows = container.querySelectorAll('tbody tr');
      const cells = rows[0].querySelectorAll('td');
      expect(cells[3].textContent).toBe('John Doe & Jane Smith');
    });

    test('should validate all inputs and return false if any are invalid', () => {
      const winners = [
        {
          competitionId: 1,
          competitionName: 'Competition 1',
          competitionDate: '2024-01-15',
          competitionType: 'singles',
          winners: [{ playerName: 'John Doe', finishingPosition: 1 }]
        },
        {
          competitionId: 2,
          competitionName: 'Competition 2',
          competitionDate: '2024-01-20',
          competitionType: 'singles',
          winners: [{ playerName: 'Jane Smith', finishingPosition: 1 }]
        }
      ];

      winnersTable.render('test-container', winners);

      const inputs = container.querySelectorAll('.amount-input');
      inputs[0].value = '50.00'; // Valid
      inputs[1].value = '-10.00'; // Invalid

      const result = winnersTable.validateAllInputs();
      expect(result).toBe(false);
    });

    test('should validate all inputs and return true if all are valid', () => {
      const winners = [
        {
          competitionId: 1,
          competitionName: 'Competition 1',
          competitionDate: '2024-01-15',
          competitionType: 'singles',
          winners: [{ playerName: 'John Doe', finishingPosition: 1 }]
        },
        {
          competitionId: 2,
          competitionName: 'Competition 2',
          competitionDate: '2024-01-20',
          competitionType: 'singles',
          winners: [{ playerName: 'Jane Smith', finishingPosition: 1 }]
        }
      ];

      winnersTable.render('test-container', winners);

      const inputs = container.querySelectorAll('.amount-input');
      inputs[0].value = '50.00';
      inputs[1].value = '75.50';

      const result = winnersTable.validateAllInputs();
      expect(result).toBe(true);
    });

    test('should handle integer amounts without decimal point', () => {
      const input = document.createElement('input');
      input.value = '50';
      const errorMsg = document.createElement('div');
      errorMsg.className = 'input-error';
      const cell = document.createElement('td');
      cell.appendChild(input);
      cell.appendChild(errorMsg);

      const result = winnersTable.validateAmountInput(input);

      expect(result).toBe(true);
      expect(input.classList.contains('invalid')).toBe(false);
    });

    test('should reject special characters in amount', () => {
      const input = document.createElement('input');
      input.value = '50.00£';
      const errorMsg = document.createElement('div');
      errorMsg.className = 'input-error';
      const cell = document.createElement('td');
      cell.appendChild(input);
      cell.appendChild(errorMsg);

      const result = winnersTable.validateAmountInput(input);

      expect(result).toBe(false);
      expect(input.classList.contains('invalid')).toBe(true);
    });

    test('should handle multiple competitions in validateAssignments warning', () => {
      const winners = [
        {
          competitionId: 1,
          competitionName: 'Competition 1',
          competitionDate: '2024-01-15',
          competitionType: 'singles',
          winners: [{ playerName: 'John Doe', finishingPosition: 1 }]
        },
        {
          competitionId: 2,
          competitionName: 'Competition 2',
          competitionDate: '2024-01-20',
          competitionType: 'singles',
          winners: [{ playerName: 'Jane Smith', finishingPosition: 1 }]
        },
        {
          competitionId: 3,
          competitionName: 'Competition 3',
          competitionDate: '2024-01-25',
          competitionType: 'singles',
          winners: [{ playerName: 'Bob Johnson', finishingPosition: 1 }]
        }
      ];

      winnersTable.render('test-container', winners);
      winnersTable.amounts.set(1, 50.00);
      // Competitions 2 and 3 have no amounts

      const result = winnersTable.validateAssignments();
      expect(result.valid).toBe(false);
      expect(result.warning).toContain('Competition 2');
      expect(result.warning).toContain('Competition 3');
    });
  });
});
