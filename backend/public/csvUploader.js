/**
 * CSV Uploader Component
 * Handles CSV file upload and parsing for competition results
 */

/* global Papa */

export class CSVUploader {
  constructor(apiClient) {
    this.apiClient = apiClient;
    
    // State
    this.competition = null;
    this.parsedResults = null;
    this.isUploading = false;
    
    // DOM Elements
    this.container = null;
    this.fileInput = null;
    this.uploadBtn = null;
    this.exportBtn = null;
    this.progressBar = null;
    
    // Bind methods
    this.handleFileSelect = this.handleFileSelect.bind(this);
    this.handleUpload = this.handleUpload.bind(this);
    this.handleExport = this.handleExport.bind(this);
  }

  /**
   * Set the current competition
   * @param {Object} competition - Competition object
   */
  setCompetition(competition) {
    this.competition = competition;
    this.parsedResults = null;
    this.render();
  }

  /**
   * Upload singles CSV file
   * @param {File} file - CSV file
   */
  async uploadSinglesCSV(file) {
      try {
        // Validate file
        this.validateFile(file);

        // Read file content
        const text = await this.readFileAsText(file);

        console.log('CSV text length:', text.length);
        console.log('First 500 chars:', text.substring(0, 500));

        // The CSV is completely malformed - it's all on one line
        let cleanedText = text;
        
        // Step 1: Simple string replace to remove Division header
        cleanedText = cleanedText.replace('"Division 1"', '');
        cleanedText = cleanedText.replace('"Division 2"', '');
        cleanedText = cleanedText.replace('"Division 3"', '');
        
        // Step 2: Add newline after header (before first digit)
        // Pattern: ...New Exact""1","Euan... becomes ...New Exact\n"1","Euan...
        cleanedText = cleanedText.replace(/(Pos,Name,Gross,Hcp,Nett[^"]*)"+"(\d+",")/i, '$1\n"$2');
        
        // Step 3: Add newlines between data rows
        // Pattern: ...,"62","""2","Dan... becomes ...,"62"\n"2","Dan...
        cleanedText = cleanedText.replace(/,"""(\d+",")/g, '\n"$1');
        
        // Step 4: Remove trailing empty quotes at end of lines
        cleanedText = cleanedText.replace(/""$/gm, '');
        
        // Step 5: Filter out metadata rows (Date:, Score Type:, Course/Tee:)
        const lines = cleanedText.split('\n');
        cleanedText = lines.filter(line => {
          const lower = line.toLowerCase();
          return !lower.includes('date:') && 
                 !lower.includes('score type:') && 
                 !lower.includes('course/tee:');
        }).join('\n');
        
        console.log('Cleaned CSV first 500 chars:', cleanedText.substring(0, 500));
        console.log('Number of lines after cleaning:', cleanedText.split('\n').length);

        // Parse CSV with very lenient settings
        const parseResult = window.Papa.parse(cleanedText, {
          header: true,
          skipEmptyLines: 'greedy',
          transformHeader: (header) => header.trim().replace(/^["']|["']$/g, ''),
          delimiter: ',',
          quoteChar: '"',
          escapeChar: '"',
          dynamicTyping: false,
          skipEmptyLines: true
        });

        console.log('Parse result errors:', parseResult.errors);
        console.log('Parsed headers:', parseResult.meta.fields);
        console.log('Total rows parsed:', parseResult.data.length);
        console.log('First 3 rows:', parseResult.data.slice(0, 3));

        if (parseResult.errors && parseResult.errors.length > 0) {
          console.warn('CSV parsing warnings:', parseResult.errors);
          // Only throw on critical errors, not warnings
          const criticalErrors = parseResult.errors.filter(e => e.type === 'Delimiter' || e.type === 'FieldMismatch');
          if (criticalErrors.length > 0) {
            console.error('Critical CSV parsing errors:', criticalErrors);
            throw new Error(`CSV parsing failed: ${criticalErrors[0].message}`);
          }
        }

        // Validate required columns
        const requiredColumns = ['Pos', 'Name', 'Gross', 'Hcp', 'Nett'];
        const headers = parseResult.meta.fields || [];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));

        if (missingColumns.length > 0) {
          throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
        }

        // Transform to result DTOs
        const results = parseResult.data
          .filter(row => {
            const name = (row.Name || '').toString().trim().replace(/^["']|["']$/g, '');
            const pos = (row.Pos || '').toString().trim().replace(/^["']|["']$/g, '');
            // Skip empty names, division headers, and metadata rows
            return name && pos && 
                   !name.match(/^Division\s+\d+$/i) &&
                   !name.toLowerCase().startsWith('date:') &&
                   !name.toLowerCase().startsWith('score type:') &&
                   !name.toLowerCase().startsWith('course/tee:') &&
                   !isNaN(parseInt(pos, 10));
          })
          .map(row => {
            // Clean all values by removing quotes
            const cleanValue = (val) => (val || '').toString().trim().replace(/^["']|["']$/g, '');

            return {
              competitionId: this.competition.id,
              finishingPosition: parseInt(cleanValue(row.Pos), 10),
              playerName: cleanValue(row.Name),
              grossScore: row.Gross ? parseInt(cleanValue(row.Gross), 10) : null,
              handicap: row.Hcp ? parseInt(cleanValue(row.Hcp), 10) : null,
              nettScore: row.Nett ? parseInt(cleanValue(row.Nett), 10) : null,
              entryPaid: null
            };
          });

        console.log('Results after filtering and mapping:', results.length);
        console.log('First result:', results[0]);

        if (results.length === 0) {
          throw new Error('No valid results found in CSV after filtering');
        }

        // Upload to API
        const response = await this.apiClient.request('/api/competition-results/bulk', {
          method: 'POST',
          body: JSON.stringify({
            competitionId: this.competition.id,
            results: results
          })
        });

        return {
          success: true,
          count: response.created || results.length,
          results: response.results || []
        };
      } catch (error) {
        const wrappedError = new Error(`Failed to upload singles CSV: ${error.message}`);
        wrappedError.code = error.code || 'UPLOAD_FAILED';
        wrappedError.originalError = error;
        throw wrappedError;
      }
    }


  /**
   * Upload doubles CSV file
   * @param {File} file - CSV file
   */
  async uploadDoublesCSV(file) {
    try {
      // Validate file
      this.validateFile(file);
      
      // Read file content
      const text = await this.readFileAsText(file);
      
      // Parse CSV with auto-delimiter detection and lenient quote handling
      const parseResult = window.Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().replace(/^["']|["']$/g, ''), // Remove quotes from headers
        delimiter: '', // Auto-detect delimiter
        delimitersToGuess: [',', '\t', ';', '|'],
        quoteChar: '"',
        escapeChar: '"',
        dynamicTyping: false, // Keep as strings to handle malformed data
        skipEmptyLines: 'greedy' // Skip lines with only whitespace
      });

      if (parseResult.errors && parseResult.errors.length > 0) {
        // Only throw on critical errors, not warnings
        const criticalErrors = parseResult.errors.filter(e => e.type === 'Delimiter' || e.type === 'FieldMismatch');
        if (criticalErrors.length > 0) {
          console.warn('CSV parsing warnings:', parseResult.errors);
        }
      }

      // Validate required columns
      const requiredColumns = ['Pos', 'Name', 'Nett'];
      const headers = parseResult.meta.fields || [];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      
      if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
      }

      // Transform to result DTOs (split names on "/")
      const results = [];
      parseResult.data.forEach(row => {
        // Clean all values by removing quotes
        const cleanValue = (val) => (val || '').toString().trim().replace(/^["']|["']$/g, '');
        
        const name = cleanValue(row.Name);
        const pos = cleanValue(row.Pos);
        
        // Skip empty names, division headers, and metadata rows
        if (!name || !pos || 
            name.match(/^Division\s+\d+$/i) ||
            name.toLowerCase().startsWith('date:') ||
            name.toLowerCase().startsWith('score type:') ||
            name.toLowerCase().startsWith('course/tee:') ||
            isNaN(parseInt(pos, 10))) {
          return;
        }

        // Check for "/" separator
        if (!name.includes('/')) {
          throw new Error(`Invalid doubles format: "${name}" must contain "/" separator`);
        }

        // Split names
        const names = name.split('/').map(n => n.trim());
        if (names.length !== 2 || !names[0] || !names[1]) {
          throw new Error(`Invalid doubles format: "${name}" must have exactly 2 non-empty names`);
        }

        const position = parseInt(pos, 10);
        const nettScore = row.Nett ? parseInt(cleanValue(row.Nett), 10) : null;

        // Create two result entries
        names.forEach(playerName => {
          results.push({
            competitionId: this.competition.id,
            finishingPosition: position,
            playerName: playerName,
            nettScore: nettScore,
            entryPaid: null
          });
        });
      });

      // Upload to API
      const response = await this.apiClient.request('/api/competition-results/bulk', {
        method: 'POST',
        body: JSON.stringify({
          competitionId: this.competition.id,
          results: results
        })
      });

      return {
        success: true,
        count: response.count || results.length,
        results: response.results || []
      };
    } catch (error) {
      const wrappedError = new Error(`Failed to upload doubles CSV: ${error.message}`);
      wrappedError.code = error.code || 'UPLOAD_FAILED';
      wrappedError.originalError = error;
      throw wrappedError;
    }
  }

  /**
   * Validate file
   * @param {File} file - File to validate
   */
  validateFile(file) {
    // Check file exists
    if (!file) {
      throw new Error('No file selected');
    }

    // Check file type
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (!validTypes.includes(file.type) && fileExtension !== 'csv') {
      throw new Error('Invalid file type. Please upload a CSV file.');
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      throw new Error('File size exceeds 5MB limit');
    }
  }

  /**
   * Read file as text
   * @param {File} file - File to read
   * @returns {Promise<string>} - File content
   */
  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        resolve(event.target.result);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  }

  /**
   * Handle file selection
   */
  async handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      this.showProgress(true);
      
      // Upload based on competition type
      let result;
      if (this.competition.type === 'singles') {
        result = await this.uploadSinglesCSV(file);
      } else {
        result = await this.uploadDoublesCSV(file);
      }

      this.showSuccess(`Successfully uploaded ${result.count} results`);
      
      // Auto-populate financial fields from transactions
      try {
        console.log('Auto-populating financial fields from transactions...');
        const populateResponse = await this.apiClient.request('/api/competition-results/populate-from-transactions', {
          method: 'POST',
          body: JSON.stringify({
            competitionId: this.competition.id
          })
        });

        if (populateResponse.updated > 0) {
          this.showSuccess(`Auto-populated financial fields for ${populateResponse.updated} player(s)`);
        }

        if (populateResponse.errors && populateResponse.errors.length > 0) {
          console.warn('Some players could not be auto-populated:', populateResponse.errors);
        }
      } catch (populateError) {
        console.error('Error auto-populating financial fields:', populateError);
        // Don't fail the upload if auto-populate fails
        this.showNotification('Results uploaded but auto-populate failed. Use manual populate if needed.', 'warning');
      }
      
      // Dispatch event for other components to refresh
      const event = new CustomEvent('results-uploaded', {
        detail: { competitionId: this.competition.id, count: result.count }
      });
      document.dispatchEvent(event);
      
      // Clear file input
      if (this.fileInput) {
        this.fileInput.value = '';
      }
    } catch (error) {
      console.error('Error uploading CSV:', error);
      this.showError(error.message);
    } finally {
      this.showProgress(false);
    }
  }

  /**
   * Handle upload button click
   */
  handleUpload() {
    if (this.fileInput) {
      this.fileInput.click();
    }
  }

  /**
   * Handle export button click
   */
  async handleExport() {
    if (!this.competition) {
      this.showError('No competition selected');
      return;
    }

    try {
      this.showProgress(true);
      
      // Fetch results
      const response = await this.apiClient.request(
        `/api/competition-results?competitionId=${this.competition.id}`,
        { method: 'GET' }
      );

      const results = response.results || [];
      
      if (results.length === 0) {
        this.showError('No results to export');
        return;
      }

      // Format as CSV
      let csvContent;
      if (this.competition.type === 'singles') {
        csvContent = this.formatSinglesCSV(results);
      } else {
        csvContent = this.formatDoublesCSV(results);
      }

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${this.competition.name}_results.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      this.showSuccess('Results exported successfully');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      this.showError(`Failed to export: ${error.message}`);
    } finally {
      this.showProgress(false);
    }
  }

  /**
   * Format singles results as CSV
   * @param {Array} results - Results array
   * @returns {string} - CSV content
   */
  formatSinglesCSV(results) {
    const headers = ['Pos', 'Name', 'Gross', 'Hcp', 'Nett'];
    const rows = results
      .sort((a, b) => {
        const posA = a.finishingPosition || a.finishing_position;
        const posB = b.finishingPosition || b.finishing_position;
        return posA - posB;
      })
      .map(result => [
        result.finishingPosition || result.finishing_position,
        result.playerName || result.player_name,
        result.grossScore || result.gross_score || '',
        result.handicap || '',
        result.nettScore || result.nett_score || ''
      ]);

    return Papa.unparse({
      fields: headers,
      data: rows
    });
  }

  /**
   * Format doubles results as CSV
   * @param {Array} results - Results array
   * @returns {string} - CSV content
   */
  formatDoublesCSV(results) {
    // Group results by position
    const grouped = {};
    results.forEach(result => {
      const pos = result.finishingPosition || result.finishing_position;
      if (!grouped[pos]) {
        grouped[pos] = [];
      }
      grouped[pos].push(result);
    });

    // Create rows with combined names
    const headers = ['Pos', 'Name', 'Nett'];
    const rows = Object.keys(grouped)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map(pos => {
        const pair = grouped[pos];
        const names = pair.map(r => r.playerName || r.player_name).join(' / ');
        const nett = pair[0].nettScore || pair[0].nett_score || '';
        return [pos, names, nett];
      });

    return Papa.unparse({
      fields: headers,
      data: rows
    });
  }

  /**
   * Render the component
   */
  render() {
    if (!this.container) {
      this.container = document.getElementById('csv-uploader-container');
      if (!this.container) {
        console.error('CSV uploader container not found');
        return;
      }
    }

    // Clear existing content
    this.container.innerHTML = '';

    if (!this.competition) {
      // Show empty state
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.textContent = 'Select a competition to upload or export CSV';
      this.container.appendChild(emptyState);
      return;
    }

    // Create main wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'csv-uploader';

    // Create header
    const header = document.createElement('div');
    header.className = 'csv-uploader-header';

    const title = document.createElement('h4');
    title.textContent = 'CSV Upload/Export';
    header.appendChild(title);

    wrapper.appendChild(header);

    // Create upload section
    const uploadSection = document.createElement('div');
    uploadSection.className = 'csv-upload-section';

    // File input (hidden)
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = '.csv,text/csv';
    this.fileInput.style.display = 'none';
    this.fileInput.addEventListener('change', this.handleFileSelect);
    uploadSection.appendChild(this.fileInput);

    // Upload button
    this.uploadBtn = document.createElement('button');
    this.uploadBtn.className = 'btn btn-primary';
    this.uploadBtn.textContent = `Upload ${this.competition.type === 'singles' ? 'Singles' : 'Doubles'} CSV`;
    this.uploadBtn.addEventListener('click', this.handleUpload);
    uploadSection.appendChild(this.uploadBtn);

    // Export button
    this.exportBtn = document.createElement('button');
    this.exportBtn.className = 'btn btn-secondary';
    this.exportBtn.textContent = 'Export CSV';
    this.exportBtn.addEventListener('click', this.handleExport);
    uploadSection.appendChild(this.exportBtn);

    wrapper.appendChild(uploadSection);

    // Create progress bar
    this.progressBar = document.createElement('div');
    this.progressBar.className = 'progress-bar';
    this.progressBar.style.display = 'none';
    
    const progressFill = document.createElement('div');
    progressFill.className = 'progress-fill';
    this.progressBar.appendChild(progressFill);
    
    wrapper.appendChild(this.progressBar);

    // Create info section
    const infoSection = document.createElement('div');
    infoSection.className = 'csv-info';

    const infoText = document.createElement('p');
    if (this.competition.type === 'singles') {
      infoText.innerHTML = '<strong>Singles CSV Format:</strong> Pos, Name, Gross, Hcp, Nett';
    } else {
      infoText.innerHTML = '<strong>Doubles CSV Format:</strong> Pos, Name (Player1 / Player2), Nett';
    }
    infoSection.appendChild(infoText);

    const limitText = document.createElement('p');
    limitText.className = 'text-muted';
    limitText.textContent = 'Maximum file size: 5MB';
    infoSection.appendChild(limitText);

    wrapper.appendChild(infoSection);

    // Add to container
    this.container.appendChild(wrapper);

    return this.container;
  }

  /**
   * Show/hide progress bar
   * @param {boolean} show - Whether to show progress
   */
  showProgress(show) {
    if (this.progressBar) {
      this.progressBar.style.display = show ? 'block' : 'none';
    }
    
    if (this.uploadBtn) {
      this.uploadBtn.disabled = show;
    }
    
    if (this.exportBtn) {
      this.exportBtn.disabled = show;
    }
    
    this.isUploading = show;
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  /**
   * Show error message
   */
  showError(message) {
    this.showNotification(message, 'error');
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('notification-fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Clean up resources
   */
  destroy() {
    // Remove event listeners
    if (this.fileInput) {
      this.fileInput.removeEventListener('change', this.handleFileSelect);
    }
    
    if (this.uploadBtn) {
      this.uploadBtn.removeEventListener('click', this.handleUpload);
    }
    
    if (this.exportBtn) {
      this.exportBtn.removeEventListener('click', this.handleExport);
    }

    // Clear DOM
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
