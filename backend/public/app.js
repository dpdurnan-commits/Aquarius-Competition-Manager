/**
 * Competition CSV Import Application
 * Main application logic for CSV transformation
 */

import { parse } from './csvParser.js';
import { transform } from './recordTransformer.js';
import { exportCSV } from './csvExporter.js';
import { FieldExtractor } from './fieldExtractor.js';
import { APIClient } from './apiClient.js';
import { ChronologicalValidator } from './chronologicalValidator.js';
import { WeeklySummarizer } from './weeklySummarizer.js';
import { TransactionSummaryView } from './transactionSummaryView.js';
import { CompetitionManager } from './competitionManager.js';
import { TransactionFlagger } from './transactionFlagger.js';
import { WeeklyDrillDownView } from './weeklyDrillDownView.js';
import { DuplicateChecker } from './duplicateChecker.js';
import { CompetitionAccountsView } from './competitionAccountsView.js';
import { CompetitionDetector } from './competitionDetector.js';
import { CompetitionCreationDialog } from './competitionCreationDialog.js';
import { PresentationNightView } from './presentationNightView.js';
import { CompetitionManagementView } from './competitionManagementView.js';

// Application state
let transformedRecords = [];
let enhancedRecords = [];

// Initialize components
const fieldExtractor = new FieldExtractor();
const apiClient = new APIClient();
const chronologicalValidator = new ChronologicalValidator(apiClient);
const competitionDetector = new CompetitionDetector(apiClient);
const weeklySummarizer = new WeeklySummarizer();
const competitionManager = new CompetitionManager(apiClient);
const transactionFlagger = new TransactionFlagger(apiClient, competitionManager, weeklySummarizer);
const duplicateChecker = new DuplicateChecker(apiClient);

// Create drill-down view (will be connected to summary view after it's created)
let weeklyDrillDownView = null;
let transactionSummaryView = null;
let competitionAccountsView = null;
let presentationNightView = null;
let competitionManagementView = null;

// Initialize views after API client is ready
async function initializeViews() {
    console.log('=== Initializing Views ===');
    weeklyDrillDownView = new WeeklyDrillDownView(apiClient, competitionManager, transactionFlagger, null);
    transactionSummaryView = new TransactionSummaryView('transaction-summary-container', weeklyDrillDownView);
    
    // Wire up dependencies for delete last week functionality
    transactionSummaryView.apiClient = apiClient;
    transactionSummaryView.weeklySummarizer = weeklySummarizer;
    
    // Add delete last week button
    transactionSummaryView.addDeleteLastWeekButton();
    
    competitionAccountsView = new CompetitionAccountsView(apiClient);
    presentationNightView = new PresentationNightView(apiClient);
    
    // Set up callback to refresh summaries when distributions are created
    if (presentationNightView && typeof presentationNightView.onDistributionCreated !== 'undefined') {
        presentationNightView.onDistributionCreated = async () => {
            console.log('Distribution created - refreshing summaries...');
            await loadAndDisplaySummaries();
        };
    }
    
    console.log('Creating CompetitionManagementView...');
    competitionManagementView = new CompetitionManagementView(apiClient, null);
    console.log('CompetitionManagementView created:', competitionManagementView);
    
    // Set up callback for drill-down to refresh main view
    weeklyDrillDownView.onTransactionUpdated = async () => {
        await loadAndDisplaySummaries();
        // Also reload the transformed records view if it's showing database records
        if (enhancedRecords.length > 0 && enhancedRecords[0].id) {
            const allRecords = await apiClient.getAll();
            enhancedRecords = allRecords;
            await renderRecords(enhancedRecords);
        }
    };
    
    console.log('Views initialized successfully');
}

// DOM Elements
const fileInput = document.getElementById('file-input');
const fileInputLabel = document.querySelector('.file-input-label');
const fileNameDisplay = document.getElementById('file-name');
const loadingIndicator = document.getElementById('loading-indicator');
const errorContainer = document.getElementById('error-container');
const errorText = document.getElementById('error-text');
const errorDismiss = document.getElementById('error-dismiss');
const emptyState = document.getElementById('empty-state');
const tableContainer = document.getElementById('table-container');
const recordsBody = document.getElementById('records-body');
const recordCount = document.getElementById('record-count');
const exportButton = document.getElementById('export-button');
const saveToDbButton = document.getElementById('save-to-database-button');
const resetDbButton = document.getElementById('reset-database-button');
const transactionSummarySection = document.getElementById('transaction-summary-section');
const manageCompetitionsButton = document.getElementById('manage-competitions-button');
const checkDuplicatesButton = document.getElementById('check-duplicates-button');
const competitionAccountsButton = document.getElementById('competition-accounts-button');
const competitionAccountsSection = document.getElementById('competition-accounts-section');
const presentationNightButton = document.getElementById('presentation-night-button');
const presentationNightSection = document.getElementById('presentation-night-section');

// Event Listeners
console.log('Setting up event listeners...');
fileInput.addEventListener('change', handleFileSelect);
errorDismiss.addEventListener('click', hideError);
exportButton.addEventListener('click', handleExport);
saveToDbButton.addEventListener('click', handleSaveToDatabase);
resetDbButton.addEventListener('click', handleResetDatabase);
if (manageCompetitionsButton) {
    console.log('Attaching event listener to manage competitions button');
    manageCompetitionsButton.addEventListener('click', (e) => {
        console.log('Manage Competitions button clicked');
        e.preventDefault();
        showCompetitionResultsView().catch(error => {
            console.error('Error in showCompetitionResultsView:', error);
            showError('Failed to load Manage Competitions view: ' + error.message, 'error');
        });
    });
} else {
    console.error('manageCompetitionsButton not found!');
}
if (checkDuplicatesButton) {
    checkDuplicatesButton.addEventListener('click', handleCheckDuplicates);
}
if (competitionAccountsButton) {
    competitionAccountsButton.addEventListener('click', (e) => {
        console.log('Competition Accounts button clicked');
        e.preventDefault();
        showCompetitionAccountsView().catch(error => {
            console.error('Error in showCompetitionAccountsView:', error);
            showError('Failed to load Competition Accounts view: ' + error.message, 'error');
        });
    });
}
if (presentationNightButton) {
    presentationNightButton.addEventListener('click', (e) => {
        console.log('Presentation Night button clicked');
        e.preventDefault();
        showPresentationNightView().catch(error => {
            console.error('Error in showPresentationNightView:', error);
            showError('Failed to load Presentation Night view: ' + error.message, 'error');
        });
    });
}

// Initialize database and load existing summaries
initializeApp();

// Expose functions globally for use by other components
window.showCompetitionSelectionModal = async function(recordId, mode) {
    console.log('Global showCompetitionSelectionModal called with:', recordId, mode);
    try {
        const result = await showCompetitionSelectionModal(recordId, mode);
        console.log('Global showCompetitionSelectionModal completed successfully');
        return result;
    } catch (error) {
        console.error('Global showCompetitionSelectionModal error:', error);
        throw error;
    }
};
window.closeCompetitionSelectionModal = closeCompetitionSelectionModal;
window.enhancedRecords = enhancedRecords;
/**
 * Initialize application
 */
async function initializeApp() {
    try {
        await apiClient.initialize();
        console.log('API Client initialized successfully');
        
        // Initialize views
        await initializeViews();
        
        // Load and display existing summaries
        await loadAndDisplaySummaries();
    } catch (error) {
        console.error('API Client initialization error:', error);
        showError('Failed to connect to server. Some features may not be available.', 'warning');
    }
}

/**
 * Load and display transaction summaries from API
 */
async function loadAndDisplaySummaries() {
    try {
        // Get weekly summaries from API instead of calculating client-side
        const summaries = await apiClient.getWeeklySummaries();
        
        if (summaries.length > 0) {
            try {
                // Convert date strings to Date objects for compatibility with TransactionSummaryView
                const summariesWithDates = summaries.map(summary => ({
                    ...summary,
                    fromDate: new Date(summary.fromDate),
                    toDate: new Date(summary.toDate)
                }));
                
                transactionSummaryView.render(summariesWithDates);
                transactionSummarySection.style.display = 'block';
            } catch (error) {
                console.error('Error rendering summaries:', error);
                showError('Failed to display weekly summaries. Please check the data.', 'warning');
                transactionSummarySection.style.display = 'none';
            }
        } else {
            transactionSummarySection.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading summaries:', error);
        showError('Failed to load transaction summaries.', 'warning');
    }
}

/**
 * Handle file selection
 */
async function handleFileSelect(event) {
    const file = event.target.files[0];
    
    if (!file) {
        return;
    }

    fileNameDisplay.textContent = `Selected: ${file.name}`;
    hideError();
    showLoading();

    try {
        // Parse CSV file
        const parseResult = await parse(file);
        
        if (!parseResult.success) {
            hideLoading();
            showError(parseResult.error, 'error');
            return;
        }
        
        console.log('CSV parsed successfully:', parseResult.rows.length, 'rows');
        
        // Transform records
        const transformResult = transform(parseResult.rows);
        transformedRecords = transformResult.records;
        
        console.log('Transformation complete:', transformedRecords.length, 'records found');
        
        // Extract fields from transformed records
        enhancedRecords = transformedRecords.map(record => fieldExtractor.extract(record));
        console.log('Field extraction complete');
        
        // Log transformation errors to console
        if (transformResult.errors.length > 0) {
            console.warn('Transformation warnings:', transformResult.errors);
        }
        
        hideLoading();
        
        // Display results
        if (transformedRecords.length === 0) {
            showError('No competition records found in the uploaded file.', 'warning');
            renderRecords([]);
        } else {
            // Display warning count for incomplete records
            const incompleteCount = transformedRecords.filter(r => !r.isComplete).length;
            if (incompleteCount > 0) {
                showError(`Warning: ${incompleteCount} record${incompleteCount !== 1 ? 's are' : ' is'} incomplete due to missing data.`, 'warning');
            }
            renderRecords(enhancedRecords);
        }
        
    } catch (error) {
        hideLoading();
        showError(`Error processing file: ${error.message}`, 'error');
        console.error('File processing error:', error);
    }
}

/**
 * Show competition creation flow for multiple new competitions
 * @param {string[]} newCompetitionNames - Array of new competition names
 * @returns {Promise<Object[]|null>} - Array of created competitions or null if cancelled
 */
async function showCompetitionCreationFlow(newCompetitionNames) {
    const createdCompetitions = [];
    
    // Loop through new competition names sequentially
    for (const competitionName of newCompetitionNames) {
        // Instantiate dialog and show it
        const dialog = new CompetitionCreationDialog(apiClient);
        const result = await dialog.show(competitionName);
        
        // If user cancelled, return null to abort
        if (result === null) {
            return null;
        }
        
        // Add created competition to array
        createdCompetitions.push(result);
    }
    
    return createdCompetitions;
}

/**
 * Handle Save to Database
 */
async function handleSaveToDatabase() {
    hideError();
    
    if (!enhancedRecords || enhancedRecords.length === 0) {
        showError('No records to save. Please upload and process a CSV file first.', 'warning');
        return;
    }
    
    // Disable button and show loading
    saveToDbButton.disabled = true;
    showLoading();
    
    try {
        // Detect new competitions from the enhanced records
        const newCompetitionNames = await competitionDetector.detectNewCompetitions(enhancedRecords);
        
        // Track number of competitions created
        let competitionsCreatedCount = 0;
        
        // If new competitions exist, show creation dialogs sequentially
        if (newCompetitionNames.length > 0) {
            const createdCompetitions = await showCompetitionCreationFlow(newCompetitionNames);
            
            // If user cancelled, abort import
            if (createdCompetitions === null) {
                hideLoading();
                saveToDbButton.disabled = false;
                showError('Import cancelled. No data was saved.', 'warning');
                return;
            }
            
            competitionsCreatedCount = createdCompetitions.length;
        }
        
        // Validate chronological order
        const validationResult = await chronologicalValidator.validate(enhancedRecords);
        
        if (!validationResult.valid) {
            hideLoading();
            saveToDbButton.disabled = false;
            
            // Display validation error in alert for prominence
            alert(validationResult.error);
            
            // Also show in error container
            showError('Chronological validation failed. Import rejected.', 'error');
            
            // Prevent database writes - validation failed
            console.warn('Validation failed:', validationResult);
            return;
        }
        
        // Store records via API
        const storeResult = await apiClient.store(enhancedRecords);
        
        console.log('Storage complete:', storeResult.stored, 'records stored');
        
        if (storeResult.errors.length > 0) {
            console.warn('Storage errors:', storeResult.errors);
        }
        
        // Reload ONLY the records that were just saved (by matching their timestamps/data)
        // to get their assigned IDs, rather than loading all records from the API
        try {
            const allRecords = await apiClient.getAll();
            
            // Filter to only the records that were just uploaded by matching date/time/total
            // This keeps the view showing only the current upload batch
            const justSavedRecords = allRecords.filter(dbRecord => {
                return enhancedRecords.some(uploadedRecord => 
                    dbRecord.date === uploadedRecord.date &&
                    dbRecord.time === uploadedRecord.time &&
                    dbRecord.total === uploadedRecord.total &&
                    dbRecord.type === uploadedRecord.type &&
                    dbRecord.member === uploadedRecord.member
                );
            });
            
            // Update enhancedRecords with only the records that were just saved (now with IDs)
            enhancedRecords = justSavedRecords;
            
            // Re-render the records table with the updated records that now have IDs
            await renderRecords(enhancedRecords);
            
            // Get and display summaries from API
            const summaries = await apiClient.getWeeklySummaries();
            
            // Convert date strings to Date objects for compatibility with TransactionSummaryView
            const summariesWithDates = summaries.map(summary => ({
                ...summary,
                fromDate: new Date(summary.fromDate),
                toDate: new Date(summary.toDate)
            }));
            
            // Update transaction summary view
            transactionSummaryView.render(summariesWithDates);
            transactionSummarySection.style.display = 'block';
        } catch (error) {
            console.error('Error generating summaries after save:', error);
            showError('Records saved but failed to update summaries. Please refresh the page.', 'warning');
        }
        
        hideLoading();
        saveToDbButton.disabled = false;
        
        // Show success message
        const errorCount = storeResult.errors.length;
        if (errorCount > 0) {
            const message = competitionsCreatedCount > 0 
                ? `Saved ${storeResult.stored} record${storeResult.stored !== 1 ? 's' : ''} and created ${competitionsCreatedCount} competition${competitionsCreatedCount !== 1 ? 's' : ''}. ${errorCount} record${errorCount !== 1 ? 's' : ''} failed to save.`
                : `Saved ${storeResult.stored} record${storeResult.stored !== 1 ? 's' : ''} to database. ${errorCount} record${errorCount !== 1 ? 's' : ''} failed to save.`;
            showError(message, 'warning');
        } else {
            const message = competitionsCreatedCount > 0
                ? `Successfully imported ${storeResult.stored} transaction${storeResult.stored !== 1 ? 's' : ''} and created ${competitionsCreatedCount} competition${competitionsCreatedCount !== 1 ? 's' : ''}.`
                : `Successfully saved ${storeResult.stored} record${storeResult.stored !== 1 ? 's' : ''} to database. You can now flag transactions as winnings.`;
            showError(message, 'warning');
        }
        
    } catch (error) {
        hideLoading();
        saveToDbButton.disabled = false;
        showError(`Failed to save to database: ${error.message}`, 'error');
        console.error('Save to database error:', error);
    }
}

/**
 * Handle Database Reset
 */
async function handleResetDatabase() {
    hideError();
    
    // Confirm with user
    const confirmed = confirm('Are you sure you want to delete all stored transaction data? This cannot be undone.');
    
    if (!confirmed) {
        return;
    }
    
    // Disable button and show loading
    resetDbButton.disabled = true;
    showLoading();
    
    try {
        await apiClient.clearAll();
        
        // Clear transaction summary view
        transactionSummaryView.clear();
        transactionSummarySection.style.display = 'none';
        
        hideLoading();
        resetDbButton.disabled = false;
        
        showError('Database cleared successfully. All stored data has been removed.', 'warning');
        console.log('Database reset complete');
        
    } catch (error) {
        hideLoading();
        resetDbButton.disabled = false;
        showError(`Failed to reset database: ${error.message}`, 'error');
        console.error('Database reset error:', error);
    }
}

/**
 * Handle CSV export
 */
function handleExport() {
    hideError();
    
    try {
        if (!enhancedRecords || enhancedRecords.length === 0) {
            showError('No records to export. Please upload and process a CSV file first.', 'warning');
            return;
        }
        
        exportCSV(enhancedRecords);
        showError(`Successfully exported ${enhancedRecords.length} record${enhancedRecords.length !== 1 ? 's' : ''}.`, 'warning');
        
    } catch (error) {
        showError(`Unable to export CSV file. Please try again. ${error.message}`, 'error');
        console.error('Export error:', error);
    }
}

/**
 * Show error message
 * @param {string} message - Error message to display
 * @param {string} severity - 'error' or 'warning' (default: 'error')
 */
function showError(message, severity = 'error') {
    errorText.textContent = message;
    errorContainer.className = 'error-message ' + severity;
    errorContainer.style.display = 'flex';
}

/**
 * Hide error message
 */
function hideError() {
    errorContainer.style.display = 'none';
    errorText.textContent = '';
    errorContainer.className = 'error-message';
}

/**
 * Show loading indicator
 */
function showLoading() {
    loadingIndicator.style.display = 'flex';
}

/**
 * Hide loading indicator
 */
function hideLoading() {
    loadingIndicator.style.display = 'none';
}

/**
 * Render transformed records in table
 */
async function renderRecords(records) {
    if (!records || records.length === 0) {
        emptyState.style.display = 'block';
        tableContainer.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    tableContainer.style.display = 'block';
    
    // Update record count
    recordCount.textContent = `${records.length} record${records.length !== 1 ? 's' : ''}`;
    
    // Clear existing rows
    recordsBody.innerHTML = '';
    
    // Add rows for each record
    records.forEach(record => {
        const row = document.createElement('tr');
        if (!record.isComplete) {
            row.classList.add('incomplete');
        }
        
        // Add flagged class if transaction is flagged
        if (record.isWinning) {
            row.classList.add('flagged-row');
        }
        
        // Create flag control cell
        const flagCell = document.createElement('td');
        flagCell.className = 'flag-cell';
        
        // Only show flag controls for records that have been saved to database (have an id)
        if (record.id && transactionFlagger.canFlag(record)) {
            if (record.isWinning) {
                // Flagged state - show indicator and edit button
                flagCell.innerHTML = `
                    <div class="flagged-indicator">
                        <span class="flag-icon" aria-hidden="true">🏆</span>
                        <span class="competition-badge" id="competition-badge-${record.id}"></span>
                        <button class="edit-flag-btn" data-record-id="${record.id}" aria-label="Edit flag">Edit</button>
                    </div>
                `;
            } else {
                // Unflagged state - show flag button
                flagCell.innerHTML = `
                    <button class="flag-btn" data-record-id="${record.id}" aria-label="Flag as winnings">
                        <span class="flag-icon" aria-hidden="true">🏳️</span> Flag as Winnings
                    </button>
                `;
            }
        } else if (!record.id && transactionFlagger.canFlag(record)) {
            // Record not saved to database yet - show disabled state with tooltip
            flagCell.innerHTML = `
                <button class="flag-btn" disabled title="Save to database first to enable flagging">
                    <span class="flag-icon" aria-hidden="true">🏳️</span> Save to DB First
                </button>
            `;
        }
        
        row.innerHTML = `
            <td>${escapeHtml(record.date)}</td>
            <td>${escapeHtml(record.time)}</td>
            <td>${escapeHtml(record.till)}</td>
            <td>${escapeHtml(record.type)}</td>
            <td>${escapeHtml(record.member)}</td>
            <td>${escapeHtml(record.player || '')}</td>
            <td>${escapeHtml(record.competition || '')}</td>
            <td>${escapeHtml(record.total)}</td>
        `;
        
        row.appendChild(flagCell);
        recordsBody.appendChild(row);
    });
    
    // Attach event listeners for flag buttons
    attachFlagEventListeners();
    
    // Load competition names for flagged transactions
    await loadCompetitionNames(records);
}

/**
 * Escape HTML to prevent XSS
 * Preserves forward slashes for better readability
 */
function escapeHtml(text) {
    if (!text) return '';
    
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

/**
 * Clear all data and reset UI
 */
function clearData() {
    transformedRecords = [];
    enhancedRecords = [];
    recordsBody.innerHTML = '';
    emptyState.style.display = 'block';
    tableContainer.style.display = 'none';
    fileNameDisplay.textContent = '';
    recordCount.textContent = '0 records'; // Reset record count display
}
/**
 * Attach event listeners to flag buttons
 */
function attachFlagEventListeners() {
    // Flag buttons (unflagged transactions)
    const flagButtons = document.querySelectorAll('.flag-btn');
    flagButtons.forEach(button => {
        button.addEventListener('click', handleFlagButtonClick);
    });
    
    // Edit flag buttons (flagged transactions)
    const editFlagButtons = document.querySelectorAll('.edit-flag-btn');
    editFlagButtons.forEach(button => {
        button.addEventListener('click', handleEditFlagButtonClick);
    });
}

/**
 * Handle flag button click
 */
async function handleFlagButtonClick(event) {
    const recordId = parseInt(event.currentTarget.dataset.recordId, 10);
    
    // Show competition selection modal
    await showCompetitionSelectionModal(recordId, 'flag');
}

/**
 * Handle edit flag button click
 */
async function handleEditFlagButtonClick(event) {
    const recordId = parseInt(event.currentTarget.dataset.recordId, 10);
    
    // Show competition selection modal with edit mode
    await showCompetitionSelectionModal(recordId, 'edit');
}

/**
 * Load competition names for flagged transactions
 */
async function loadCompetitionNames(records) {
    try {
        const competitions = await competitionManager.getAll();
        const competitionMap = new Map(competitions.map(c => [c.id, c.name]));
        
        records.forEach(record => {
            if (record.isWinning && record.winningCompetitionId) {
                const competitionName = competitionMap.get(record.winningCompetitionId);
                const badgeElement = document.getElementById(`competition-badge-${record.id || record.sourceRowIndex}`);
                if (badgeElement && competitionName) {
                    badgeElement.textContent = competitionName;
                }
            }
        });
    } catch (error) {
        console.error('Error loading competition names:', error);
    }
}

/**
 * Show competition selection modal
 */
async function showCompetitionSelectionModal(recordId, mode) {
    console.log('showCompetitionSelectionModal: Starting with recordId:', recordId, 'mode:', mode);
    try {
        // Get the transaction record - check both local and global enhancedRecords
        const recordsToSearch = window.enhancedRecords && window.enhancedRecords.length > 0 ? window.enhancedRecords : enhancedRecords;
        console.log('showCompetitionSelectionModal: Searching in records array with length:', recordsToSearch.length);
        
        const record = recordsToSearch.find(r => (r.id || r.sourceRowIndex) === recordId);
        console.log('showCompetitionSelectionModal: Found record:', record);
        if (!record) {
            console.error('showCompetitionSelectionModal: Transaction not found in enhancedRecords');
            console.log('showCompetitionSelectionModal: Available record IDs:', recordsToSearch.map(r => r.id || r.sourceRowIndex));
            showError('Transaction not found', 'error');
            return;
        }
        
        // Get only active (unfinished) competitions for flagging
        console.log('showCompetitionSelectionModal: Getting competitions...');
        const competitions = await competitionManager.getAll({ finished: false });
        console.log('showCompetitionSelectionModal: Found competitions:', competitions.length);
        
        // Create modal HTML
        console.log('showCompetitionSelectionModal: Creating modal...');
        const modal = document.createElement('div');
        modal.className = 'competition-selection-modal';
        modal.id = 'competition-selection-modal';
        
        let modalContent = `
            <div class="competition-selection-content">
                <div class="competition-selection-header">
                    <h3>${mode === 'edit' ? 'Edit Flag' : 'Flag as Winnings'}</h3>
                </div>
                <div class="competition-selection-info">
                    <p><strong>Transaction:</strong> £${parseFloat(record.total).toFixed(2)} - ${escapeHtml(record.member)} - ${escapeHtml(record.date)}</p>
                </div>
        `;
        
        if (competitions.length === 0) {
            modalContent += `
                <div class="empty-competitions-message">
                    <p>No competitions available.</p>
                    <p>Please create a competition first.</p>
                </div>
                <div class="competition-selection-actions">
                    <button class="cancel-btn" id="modal-cancel-btn">Close</button>
                </div>
            `;
        } else {
            modalContent += `
                <div class="competition-options" id="competition-options">
            `;
            
            competitions.forEach(competition => {
                const isSelected = mode === 'edit' && record.winningCompetitionId === competition.id;
                modalContent += `
                    <button class="competition-option ${isSelected ? 'selected' : ''}" 
                            data-competition-id="${competition.id}"
                            aria-pressed="${isSelected}">
                        ${escapeHtml(competition.name)}
                    </button>
                `;
            });
            
            modalContent += `
                </div>
                <div class="competition-selection-actions">
                    <button class="cancel-btn" id="modal-cancel-btn">Cancel</button>
            `;
            
            if (mode === 'edit') {
                modalContent += `
                    <button class="unflag-btn" id="modal-unflag-btn">Remove Flag</button>
                `;
            }
            
            modalContent += `
                </div>
            `;
        }
        
        modalContent += `
            </div>
        `;
        
        modal.innerHTML = modalContent;
        
        // Force modal visibility with inline styles to override any conflicting CSS
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.right = '0';
        modal.style.bottom = '0';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '2000';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        
        console.log('showCompetitionSelectionModal: Appending modal to body...');
        document.body.appendChild(modal);
        
        // Add a slight delay to ensure modal is rendered
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('showCompetitionSelectionModal: Modal should now be visible with forced styles');
        
        // Attach event listeners
        const cancelBtn = document.getElementById('modal-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                console.log('showCompetitionSelectionModal: Cancel button clicked');
                closeCompetitionSelectionModal();
            });
        }
        
        if (mode === 'edit') {
            const unflagBtn = document.getElementById('modal-unflag-btn');
            if (unflagBtn) {
                unflagBtn.addEventListener('click', async () => {
                    console.log('showCompetitionSelectionModal: Unflag button clicked');
                    await handleUnflagTransaction(recordId);
                });
            }
        }
        
        // Attach competition option click handlers
        const competitionOptions = document.querySelectorAll('.competition-option');
        console.log('showCompetitionSelectionModal: Found competition options:', competitionOptions.length);
        competitionOptions.forEach(option => {
            option.addEventListener('click', async () => {
                const competitionId = parseInt(option.dataset.competitionId, 10);
                console.log('showCompetitionSelectionModal: Competition option clicked:', competitionId);
                await handleCompetitionSelection(recordId, competitionId, mode);
            });
        });
        
        // Close modal on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                console.log('showCompetitionSelectionModal: Overlay clicked');
                closeCompetitionSelectionModal();
            }
        });
        
        // Enhanced keyboard navigation
        let currentFocusIndex = 0;
        const focusableElements = Array.from(modal.querySelectorAll('.competition-option, .cancel-btn, .unflag-btn'));
        
        // Focus first competition option
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
        
        const keyboardHandler = (e) => {
            // Close modal on Escape key
            if (e.key === 'Escape') {
                console.log('showCompetitionSelectionModal: Escape key pressed');
                closeCompetitionSelectionModal();
                document.removeEventListener('keydown', keyboardHandler);
                return;
            }
            
            // Arrow key navigation
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                
                if (e.key === 'ArrowDown') {
                    currentFocusIndex = (currentFocusIndex + 1) % focusableElements.length;
                } else {
                    currentFocusIndex = (currentFocusIndex - 1 + focusableElements.length) % focusableElements.length;
                }
                
                focusableElements[currentFocusIndex].focus();
            }
            
            // Home/End keys
            if (e.key === 'Home') {
                e.preventDefault();
                currentFocusIndex = 0;
                focusableElements[0].focus();
            }
            
            if (e.key === 'End') {
                e.preventDefault();
                currentFocusIndex = focusableElements.length - 1;
                focusableElements[currentFocusIndex].focus();
            }
            
            // Update current focus index when user tabs
            const currentElement = document.activeElement;
            const newIndex = focusableElements.indexOf(currentElement);
            if (newIndex !== -1) {
                currentFocusIndex = newIndex;
            }
        };
        
        document.addEventListener('keydown', keyboardHandler);
        
        console.log('showCompetitionSelectionModal: Setup complete, modal should be visible');
        
        // Debug: Check if modal is actually in DOM and visible
        const modalCheck = document.getElementById('competition-selection-modal');
        console.log('showCompetitionSelectionModal: Modal check - exists:', !!modalCheck);
        if (modalCheck) {
            console.log('showCompetitionSelectionModal: Modal styles:', {
                display: modalCheck.style.display,
                visibility: modalCheck.style.visibility,
                zIndex: modalCheck.style.zIndex,
                position: modalCheck.style.position
            });
            console.log('showCompetitionSelectionModal: Modal computed styles:', {
                display: window.getComputedStyle(modalCheck).display,
                visibility: window.getComputedStyle(modalCheck).visibility,
                zIndex: window.getComputedStyle(modalCheck).zIndex
            });
        }
        
    } catch (error) {
        console.error('showCompetitionSelectionModal: Error occurred:', error);
        showError('Failed to load competitions. Please try again.', 'error');
    }
}

/**
 * Close competition selection modal
 */
function closeCompetitionSelectionModal() {
    const modal = document.getElementById('competition-selection-modal');
    if (modal) {
        modal.remove();
    }
    
    // Restore original enhancedRecords if it was temporarily modified by WeeklyDrillDownView
    if (window.weeklyDrillDownOriginalRecords) {
        console.log('Restoring original enhancedRecords after modal close');
        window.enhancedRecords = window.weeklyDrillDownOriginalRecords;
        delete window.weeklyDrillDownOriginalRecords;
    }
}

/**
 * Handle competition selection
 */
async function handleCompetitionSelection(recordId, competitionId, mode) {
    try {
        showLoading();
        
        if (mode === 'edit') {
            await transactionFlagger.updateFlag(recordId, competitionId);
        } else {
            await transactionFlagger.flagTransaction(recordId, competitionId);
        }
        
        // If called from WeeklyDrillDownView, skip re-rendering the main records table
        // The WeeklyDrillDownView will handle its own refresh after the modal closes
        const calledFromDrillDown = !!window.weeklyDrillDownOriginalRecords;
        
        if (!calledFromDrillDown) {
            // Reload ONLY the records currently in view (not all database records)
            const currentRecordIds = enhancedRecords.map(r => r.id).filter(id => id !== undefined);
            
            if (currentRecordIds.length > 0) {
                const allRecords = await apiClient.getAll();
                enhancedRecords = allRecords.filter(r => currentRecordIds.includes(r.id));
            } else {
                const allRecords = await apiClient.getAll();
                enhancedRecords = allRecords;
            }
            
            // Re-render the table
            await renderRecords(enhancedRecords);
        }
        
        // Reload and display summaries
        await loadAndDisplaySummaries();
        
        hideLoading();
        closeCompetitionSelectionModal();
        
        showError(`Transaction ${mode === 'edit' ? 'updated' : 'flagged'} successfully.`, 'warning');
        
    } catch (error) {
        hideLoading();
        console.error('Error handling competition selection:', error);
        
        let errorMessage = 'Failed to flag transaction. Please try again.';
        if (error.code === 'TRANSACTION_NOT_FOUND') {
            errorMessage = 'Transaction not found.';
        } else if (error.code === 'COMPETITION_NOT_FOUND') {
            errorMessage = 'Competition not found. Please refresh and try again.';
        } else if (error.code === 'INVALID_TRANSACTION_TYPE') {
            errorMessage = 'Only Topup (Competitions) transactions can be flagged.';
        }
        
        showError(errorMessage, 'error');
    }
}

/**
 * Handle unflag transaction
 */
async function handleUnflagTransaction(recordId) {
    try {
        showLoading();
        
        await transactionFlagger.unflagTransaction(recordId);
        
        // Reload ONLY the records currently in view (not all database records)
        // Get the IDs of records currently displayed
        const currentRecordIds = enhancedRecords.map(r => r.id).filter(id => id !== undefined);
        
        if (currentRecordIds.length > 0) {
            // Reload only the records that are currently displayed
            const allRecords = await apiClient.getAll();
            enhancedRecords = allRecords.filter(r => currentRecordIds.includes(r.id));
        } else {
            // If no IDs (shouldn't happen after save), reload all
            const allRecords = await apiClient.getAll();
            enhancedRecords = allRecords;
        }
        
        // Re-render the table
        await renderRecords(enhancedRecords);
        
        // Reload and display summaries
        await loadAndDisplaySummaries();
        
        hideLoading();
        closeCompetitionSelectionModal();
        
        showError('Transaction unflagged successfully.', 'warning');
        
    } catch (error) {
        hideLoading();
        console.error('Error unflagging transaction:', error);
        showError('Failed to unflag transaction. Please try again.', 'error');
    }
}

/**
 * Handle Check Duplicates button click
 */
async function handleCheckDuplicates() {
    const modal = document.getElementById('duplicate-checker-modal');
    const loading = document.getElementById('duplicate-checker-loading');
    const results = document.getElementById('duplicate-checker-results');
    const summary = document.getElementById('duplicate-checker-summary');
    const details = document.getElementById('duplicate-checker-details');
    const actions = document.getElementById('duplicate-checker-actions');
    
    // Show modal
    modal.style.display = 'block';
    loading.style.display = 'flex';
    results.style.display = 'none';
    
    try {
        const checkResult = await duplicateChecker.checkForDuplicates();
        
        // Hide loading
        loading.style.display = 'none';
        results.style.display = 'block';
        
        // Display summary
        summary.innerHTML = `
            <p><strong>Total Records:</strong> ${checkResult.totalRecords}</p>
            <p><strong>Status:</strong> ${checkResult.message}</p>
        `;
        
        // Display details
        details.innerHTML = duplicateChecker.formatDuplicatesForDisplay(checkResult);
        
        // Show/hide remove button
        if (checkResult.hasDuplicates) {
            actions.style.display = 'flex';
        } else {
            actions.style.display = 'none';
        }
        
    } catch (error) {
        loading.style.display = 'none';
        results.style.display = 'block';
        summary.innerHTML = `<p class="error-message">❌ Error checking for duplicates: ${error.message}</p>`;
        details.innerHTML = '';
        actions.style.display = 'none';
    }
}

/**
 * Handle Remove Duplicates button click
 */
async function handleRemoveDuplicates() {
    const confirmed = confirm(
        'This will permanently delete duplicate records from the database.\n\n' +
        'The first occurrence of each record will be kept, and duplicates will be removed.\n\n' +
        'Do you want to continue?'
    );
    
    if (!confirmed) {
        return;
    }
    
    const loading = document.getElementById('duplicate-checker-loading');
    const results = document.getElementById('duplicate-checker-results');
    
    loading.style.display = 'flex';
    results.style.display = 'none';
    
    try {
        const removeResult = await duplicateChecker.removeDuplicates();
        
        // Close modal
        closeDuplicateCheckerModal();
        
        // Reload summaries
        await loadAndDisplaySummaries();
        
        // Show success message
        showError(removeResult.message, removeResult.success ? 'warning' : 'error');
        
    } catch (error) {
        loading.style.display = 'none';
        results.style.display = 'block';
        showError(`Failed to remove duplicates: ${error.message}`, 'error');
    }
}

/**
 * Close duplicate checker modal
 */
function closeDuplicateCheckerModal() {
    const modal = document.getElementById('duplicate-checker-modal');
    modal.style.display = 'none';
}

// Duplicate checker modal event listeners
document.getElementById('close-duplicate-checker').addEventListener('click', closeDuplicateCheckerModal);
document.getElementById('remove-duplicates-btn').addEventListener('click', handleRemoveDuplicates);
document.getElementById('cancel-remove-btn').addEventListener('click', closeDuplicateCheckerModal);

// Close modal on overlay click
document.getElementById('duplicate-checker-modal').addEventListener('click', (e) => {
    if (e.target.id === 'duplicate-checker-modal') {
        closeDuplicateCheckerModal();
    }
});

// Initialize
console.log('Competition CSV Import application loaded');

/**
 * CLEAN NAVIGATION FUNCTIONS
 * Show Competition Management view (competitions, results, seasons)
 * This is what users see when they click "Manage Competitions" button
 * Functionality: Competition CRUD, Results Management, Season Management, CSV Results Import/Export
 */
async function showCompetitionResultsView() {
    console.log('=== showCompetitionResultsView called ===');
    console.log('competitionManagementView:', competitionManagementView);
    console.log('competitionAccountsSection:', competitionAccountsSection);
    
    // Hide other sections
    const dataViewer = document.getElementById('data-viewer');
    const uploadSection = document.querySelector('.upload-section');
    
    console.log('Hiding sections...');
    if (dataViewer) dataViewer.style.display = 'none';
    if (uploadSection) uploadSection.style.display = 'none';
    if (transactionSummarySection) transactionSummarySection.style.display = 'none';
    if (presentationNightSection) presentationNightSection.style.display = 'none';
    
    // Show Competition Management section
    if (competitionAccountsSection) {
        console.log('Showing competition accounts section...');
        competitionAccountsSection.style.display = 'block';
        
        // Initialize and render the Competition Management View
        if (competitionManagementView) {
            try {
                console.log('Initializing CompetitionManagementView...');
                await competitionManagementView.initialize();
                console.log('Rendering CompetitionManagementView...');
                competitionManagementView.render('competition-accounts-container');
                console.log('CompetitionManagementView rendered successfully');
            } catch (error) {
                console.error('Error initializing Competition Management View:', error);
                // Fallback: Show a basic message
                const container = document.getElementById('competition-accounts-container');
                if (container) {
                    container.innerHTML = `
                        <div style="padding: 20px; text-align: center;">
                            <h2>Competition Management</h2>
                            <p>Competition management features are temporarily unavailable.</p>
                            <p>Error: ${error.message}</p>
                            <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 10px;">Reload Page</button>
                        </div>
                    `;
                }
                showError('Failed to load Competition Management View: ' + error.message, 'error');
            }
        } else {
            console.error('competitionManagementView is null or undefined');
            // Fallback: Show a basic message
            const container = document.getElementById('competition-accounts-container');
            if (container) {
                container.innerHTML = `
                    <div style="padding: 20px; text-align: center;">
                        <h2>Competition Management</h2>
                        <p>Competition management component not loaded.</p>
                        <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 10px;">Reload Page</button>
                    </div>
                `;
            }
        }
    } else {
        console.error('competitionAccountsSection not found');
    }
}

/**
 * Show Competition Accounts view (transaction CSV management, financial balances)
 * This is what users see when they click "Competition Accounts" button
 * Functionality: Transaction CSV Upload/Download, Database Operations, Financial Tracking, Balance Management
 */
async function showCompetitionAccountsView() {
    console.log('Showing Competition Accounts View (Transaction/Financial Management)...');
    
    // Hide other sections
    if (competitionAccountsSection) competitionAccountsSection.style.display = 'none';
    if (presentationNightSection) presentationNightSection.style.display = 'none';
    
    // Clear all old data before showing the view
    console.log('Clearing old Competition Accounts data...');
    
    // 1. Clear CSV upload data and transaction table
    clearData(); // This clears transformedRecords, enhancedRecords, table content, file name, and record count
    
    // 2. Clear any displayed weekly drill-down transactions
    if (weeklyDrillDownView) {
        weeklyDrillDownView.hideInline(); // This clears the weekly transactions display
    }
    
    // 3. Clear any error messages
    hideError();
    
    // 4. Reset file input
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.value = '';
    }
    
    // 5. Hide loading states and ensure buttons are enabled
    hideLoading();
    if (saveToDbButton) saveToDbButton.disabled = false;
    if (resetDbButton) resetDbButton.disabled = false;
    if (exportButton) exportButton.disabled = false;
    if (checkDuplicatesButton) checkDuplicatesButton.disabled = false;
    
    // 6. Close any open modals
    const duplicateModal = document.getElementById('duplicate-checker-modal');
    if (duplicateModal) {
        duplicateModal.style.display = 'none';
    }
    
    // Show the main transaction/financial management sections
    const dataViewer = document.getElementById('data-viewer');
    const uploadSection = document.querySelector('.upload-section');
    
    if (dataViewer) dataViewer.style.display = 'block';
    if (uploadSection) uploadSection.style.display = 'block';
    if (transactionSummarySection) transactionSummarySection.style.display = 'block';
    
    // 7. Refresh summaries to ensure latest data (including any new distribution costs)
    console.log('Refreshing weekly summaries...');
    await loadAndDisplaySummaries();
    
    console.log('Competition Accounts view refreshed successfully');
}

/**
 * Show Presentation Night Winnings Distribution view
 */
async function showPresentationNightView() {
    console.log('showPresentationNightView called');
    
    // Hide other sections
    const dataViewer = document.getElementById('data-viewer');
    const uploadSection = document.querySelector('.upload-section');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    if (dataViewer) dataViewer.style.display = 'none';
    if (uploadSection) uploadSection.style.display = 'none';
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    if (transactionSummarySection) transactionSummarySection.style.display = 'none';
    if (competitionAccountsSection) competitionAccountsSection.style.display = 'none';
    
    // Show Presentation Night section
    if (presentationNightSection) {
        presentationNightSection.style.display = 'block';
        
        // Initialize and render the view if not already done
        if (presentationNightView) {
            try {
                console.log('Initializing presentation night view...');
                presentationNightView.initialize('presentation-night-container');
                console.log('Presentation Night view initialized successfully');
            } catch (error) {
                console.error('Error showing Presentation Night view:', error);
                alert('Failed to load Presentation Night view. Please try again.');
            }
        } else {
            console.error('presentationNightView is null or undefined');
            alert('Presentation Night view not initialized. Please refresh the page.');
        }
    } else {
        console.error('presentationNightSection element not found');
        alert('Presentation Night section not found in the page.');
    }
}