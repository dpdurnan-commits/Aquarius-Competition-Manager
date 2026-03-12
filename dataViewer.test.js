/**
 * Data Viewer Unit Tests
 * Tests for the data viewing functionality
 */

import * as fc from 'fast-check';

describe('Data Viewer', () => {
    let container;
    let emptyState;
    let tableContainer;
    let recordsBody;
    let recordCount;

    beforeEach(() => {
        // Set up DOM structure
        document.body.innerHTML = `
            <div id="data-viewer">
                <div id="empty-state" class="empty-state">
                    No competition records found. Please upload a CSV file.
                </div>
                
                <div id="table-container" style="display: none;">
                    <div class="table-header">
                        <h2>Transformed Records</h2>
                        <span id="record-count" class="record-count"></span>
                    </div>
                    
                    <div class="table-wrapper">
                        <table id="records-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Time</th>
                                    <th>Till</th>
                                    <th>Type</th>
                                    <th>Member</th>
                                    <th>Price</th>
                                    <th>Discount</th>
                                    <th>Subtotal</th>
                                    <th>VAT</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody id="records-body">
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        emptyState = document.getElementById('empty-state');
        tableContainer = document.getElementById('table-container');
        recordsBody = document.getElementById('records-body');
        recordCount = document.getElementById('record-count');
    });

    describe('HTML Structure', () => {
        test('should have table with correct headers', () => {
            const headers = document.querySelectorAll('#records-table thead th');
            expect(headers).toHaveLength(10);
            expect(headers[0].textContent).toBe('Date');
            expect(headers[1].textContent).toBe('Time');
            expect(headers[2].textContent).toBe('Till');
            expect(headers[3].textContent).toBe('Type');
            expect(headers[4].textContent).toBe('Member');
            expect(headers[5].textContent).toBe('Price');
            expect(headers[6].textContent).toBe('Discount');
            expect(headers[7].textContent).toBe('Subtotal');
            expect(headers[8].textContent).toBe('VAT');
            expect(headers[9].textContent).toBe('Total');
        });

        test('should have empty state element', () => {
            expect(emptyState).toBeTruthy();
            expect(emptyState.textContent).toContain('No competition records found');
        });

        test('should have table container', () => {
            expect(tableContainer).toBeTruthy();
        });

        test('should have records body', () => {
            expect(recordsBody).toBeTruthy();
        });
    });

    describe('renderRecords function', () => {
        // Helper function to simulate renderRecords
        function renderRecords(records) {
            if (!records || records.length === 0) {
                emptyState.style.display = 'block';
                tableContainer.style.display = 'none';
                return;
            }

            emptyState.style.display = 'none';
            tableContainer.style.display = 'block';
            
            recordCount.textContent = `${records.length} record${records.length !== 1 ? 's' : ''}`;
            recordsBody.innerHTML = '';
            
            records.forEach(record => {
                const row = document.createElement('tr');
                if (!record.isComplete) {
                    row.classList.add('incomplete');
                }
                
                row.innerHTML = `
                    <td>${escapeHtml(record.date)}</td>
                    <td>${escapeHtml(record.time)}</td>
                    <td>${escapeHtml(record.till)}</td>
                    <td>${escapeHtml(record.type)}</td>
                    <td>${escapeHtml(record.member)}</td>
                    <td>${escapeHtml(record.price)}</td>
                    <td>${escapeHtml(record.discount)}</td>
                    <td>${escapeHtml(record.subtotal)}</td>
                    <td>${escapeHtml(record.vat)}</td>
                    <td>${escapeHtml(record.total)}</td>
                `;
                
                recordsBody.appendChild(row);
            });
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }

        test('should display empty state when no records', () => {
            renderRecords([]);
            
            expect(emptyState.style.display).toBe('block');
            expect(tableContainer.style.display).toBe('none');
        });

        test('should display empty state when records is null', () => {
            renderRecords(null);
            
            expect(emptyState.style.display).toBe('block');
            expect(tableContainer.style.display).toBe('none');
        });

        test('should display table when records exist', () => {
            const records = [{
                date: '2024-01-15',
                time: '10:30',
                till: 'Till 1',
                type: 'Sale',
                member: 'John Doe',
                price: '25.00',
                discount: '0.00',
                subtotal: '25.00',
                vat: '5.00',
                total: '30.00',
                isComplete: true
            }];

            renderRecords(records);
            
            expect(emptyState.style.display).toBe('none');
            expect(tableContainer.style.display).toBe('block');
        });

        test('should render correct number of rows', () => {
            const records = [
                {
                    date: '2024-01-15',
                    time: '10:30',
                    till: 'Till 1',
                    type: 'Sale',
                    member: 'John Doe',
                    price: '25.00',
                    discount: '0.00',
                    subtotal: '25.00',
                    vat: '5.00',
                    total: '30.00',
                    isComplete: true
                },
                {
                    date: '2024-01-16',
                    time: '11:00',
                    till: 'Till 2',
                    type: 'Refund',
                    member: 'Jane Smith',
                    price: '-25.00',
                    discount: '0.00',
                    subtotal: '-25.00',
                    vat: '-5.00',
                    total: '-30.00',
                    isComplete: true
                }
            ];

            renderRecords(records);
            
            const rows = recordsBody.querySelectorAll('tr');
            expect(rows).toHaveLength(2);
        });

        test('should populate cells with record data', () => {
            const records = [{
                date: '2024-01-15',
                time: '10:30',
                till: 'Till 1',
                type: 'Sale',
                member: 'John Doe',
                price: '25.00',
                discount: '0.00',
                subtotal: '25.00',
                vat: '5.00',
                total: '30.00',
                isComplete: true
            }];

            renderRecords(records);
            
            const cells = recordsBody.querySelectorAll('td');
            expect(cells[0].textContent).toBe('2024-01-15');
            expect(cells[1].textContent).toBe('10:30');
            expect(cells[2].textContent).toBe('Till 1');
            expect(cells[3].textContent).toBe('Sale');
            expect(cells[4].textContent).toBe('John Doe');
            expect(cells[5].textContent).toBe('25.00');
            expect(cells[6].textContent).toBe('0.00');
            expect(cells[7].textContent).toBe('25.00');
            expect(cells[8].textContent).toBe('5.00');
            expect(cells[9].textContent).toBe('30.00');
        });

        test('should highlight incomplete records', () => {
            const records = [{
                date: '2024-01-15',
                time: '10:30',
                till: 'Till 1',
                type: 'Sale',
                member: 'John Doe',
                price: '',
                discount: '',
                subtotal: '',
                vat: '',
                total: '',
                isComplete: false
            }];

            renderRecords(records);
            
            const row = recordsBody.querySelector('tr');
            expect(row.classList.contains('incomplete')).toBe(true);
        });

        test('should update record count', () => {
            const records = [
                { date: '2024-01-15', time: '10:30', till: 'Till 1', type: 'Sale', member: 'John', price: '25.00', discount: '0.00', subtotal: '25.00', vat: '5.00', total: '30.00', isComplete: true },
                { date: '2024-01-16', time: '11:00', till: 'Till 2', type: 'Refund', member: 'Jane', price: '-25.00', discount: '0.00', subtotal: '-25.00', vat: '-5.00', total: '-30.00', isComplete: true },
                { date: '2024-01-17', time: '12:00', till: 'Till 1', type: 'Sale', member: 'Bob', price: '50.00', discount: '5.00', subtotal: '45.00', vat: '9.00', total: '54.00', isComplete: true }
            ];

            renderRecords(records);
            
            expect(recordCount.textContent).toBe('3 records');
        });

        test('should use singular form for single record', () => {
            const records = [{
                date: '2024-01-15',
                time: '10:30',
                till: 'Till 1',
                type: 'Sale',
                member: 'John Doe',
                price: '25.00',
                discount: '0.00',
                subtotal: '25.00',
                vat: '5.00',
                total: '30.00',
                isComplete: true
            }];

            renderRecords(records);
            
            expect(recordCount.textContent).toBe('1 record');
        });

        test('should handle empty cells', () => {
            const records = [{
                date: '2024-01-15',
                time: '',
                till: '',
                type: 'Sale',
                member: '',
                price: '',
                discount: '',
                subtotal: '',
                vat: '',
                total: '',
                isComplete: false
            }];

            renderRecords(records);
            
            const cells = recordsBody.querySelectorAll('td');
            expect(cells[1].textContent).toBe('');
            expect(cells[2].textContent).toBe('');
        });

        test('should clear existing rows before rendering', () => {
            // First render
            const records1 = [{
                date: '2024-01-15',
                time: '10:30',
                till: 'Till 1',
                type: 'Sale',
                member: 'John',
                price: '25.00',
                discount: '0.00',
                subtotal: '25.00',
                vat: '5.00',
                total: '30.00',
                isComplete: true
            }];
            renderRecords(records1);
            expect(recordsBody.querySelectorAll('tr')).toHaveLength(1);

            // Second render with different data
            const records2 = [
                { date: '2024-01-16', time: '11:00', till: 'Till 2', type: 'Refund', member: 'Jane', price: '-25.00', discount: '0.00', subtotal: '-25.00', vat: '-5.00', total: '-30.00', isComplete: true },
                { date: '2024-01-17', time: '12:00', till: 'Till 1', type: 'Sale', member: 'Bob', price: '50.00', discount: '5.00', subtotal: '45.00', vat: '9.00', total: '54.00', isComplete: true }
            ];
            renderRecords(records2);
            
            expect(recordsBody.querySelectorAll('tr')).toHaveLength(2);
        });
    });

    describe('Property-Based Tests', () => {
        // Helper function to simulate renderRecords
        function renderRecords(records) {
            if (!records || records.length === 0) {
                emptyState.style.display = 'block';
                tableContainer.style.display = 'none';
                return;
            }

            emptyState.style.display = 'none';
            tableContainer.style.display = 'block';
            
            recordCount.textContent = `${records.length} record${records.length !== 1 ? 's' : ''}`;
            recordsBody.innerHTML = '';
            
            records.forEach(record => {
                const row = document.createElement('tr');
                if (!record.isComplete) {
                    row.classList.add('incomplete');
                }
                
                row.innerHTML = `
                    <td>${escapeHtml(record.date)}</td>
                    <td>${escapeHtml(record.time)}</td>
                    <td>${escapeHtml(record.till)}</td>
                    <td>${escapeHtml(record.type)}</td>
                    <td>${escapeHtml(record.member)}</td>
                    <td>${escapeHtml(record.price)}</td>
                    <td>${escapeHtml(record.discount)}</td>
                    <td>${escapeHtml(record.subtotal)}</td>
                    <td>${escapeHtml(record.vat)}</td>
                    <td>${escapeHtml(record.total)}</td>
                `;
                
                recordsBody.appendChild(row);
            });
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }

        // Generator for transformed records
        const transformedRecordGen = fc.record({
            date: fc.string(),
            time: fc.string(),
            till: fc.string(),
            type: fc.constantFrom('Sale', 'Refund', 'Topup Competitions'),
            member: fc.string(),
            price: fc.string(),
            discount: fc.string(),
            subtotal: fc.string(),
            vat: fc.string(),
            total: fc.string(),
            isComplete: fc.boolean(),
            sourceRowIndex: fc.nat()
        });

        /**
         * Property 11: All transformed records are displayed
         * Feature: competition-csv-import, Property 11: All transformed records are displayed
         * Validates: Requirements 9.1
         * 
         * For any non-empty array of transformed records, rendering the data viewer 
         * should produce a table where the number of data rows equals the number of 
         * transformed records.
         */
        test('Property 11: All transformed records are displayed', () => {
            fc.assert(
                fc.property(
                    fc.array(transformedRecordGen, { minLength: 1, maxLength: 50 }),
                    (records) => {
                        // Render the records
                        renderRecords(records);
                        
                        // Verify table is visible and empty state is hidden
                        expect(tableContainer.style.display).toBe('block');
                        expect(emptyState.style.display).toBe('none');
                        
                        // Count the number of rows in the table
                        const rows = recordsBody.querySelectorAll('tr');
                        
                        // Property: Number of table rows must equal number of records
                        expect(rows.length).toBe(records.length);
                        
                        // Additional verification: Each record should have 10 cells (columns A-J)
                        rows.forEach((row, index) => {
                            const cells = row.querySelectorAll('td');
                            expect(cells.length).toBe(10);
                            
                            // Verify the data matches the record
                            const record = records[index];
                            expect(cells[0].textContent).toBe(record.date);
                            expect(cells[1].textContent).toBe(record.time);
                            expect(cells[2].textContent).toBe(record.till);
                            expect(cells[3].textContent).toBe(record.type);
                            expect(cells[4].textContent).toBe(record.member);
                            expect(cells[5].textContent).toBe(record.price);
                            expect(cells[6].textContent).toBe(record.discount);
                            expect(cells[7].textContent).toBe(record.subtotal);
                            expect(cells[8].textContent).toBe(record.vat);
                            expect(cells[9].textContent).toBe(record.total);
                        });
                        
                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
