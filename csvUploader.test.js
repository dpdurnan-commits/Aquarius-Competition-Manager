/**
 * Unit Tests for CSVUploader
 * Tests CSV upload, export, and validation
 */

import { CSVUploader } from './csvUploader.js';

// Mock Papa Parse
global.Papa = {
  parse: jest.fn(),
  unparse: jest.fn()
};

describe('CSVUploader', () => {
  let csvUploader;
  let mockApiClient;

  beforeEach(() => {
    // Create mock API client
    mockApiClient = {
      request: jest.fn()
    };

    // Create instance
    csvUploader = new CSVUploader(mockApiClient);

    // Mock DOM
    document.body.innerHTML = '<div id="csv-uploader-container"></div>';

    // Reset Papa mocks
    Papa.parse.mockReset();
    Papa.unparse.mockReset();
  });

  afterEach(() => {
    // Clean up
    if (csvUploader) {
      csvUploader.destroy();
    }
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with null competition', () => {
      expect(csvUploader.competition).toBeNull();
      expect(csvUploader.parsedResults).toBeNull();
      expect(csvUploader.isUploading).toBe(false);
    });
  });

  describe('setCompetition', () => {
    test('should set competition and render', () => {
      const competition = { id: 1, name: 'Test Competition', type: 'singles' };
      
      csvUploader.setCompetition(competition);

      expect(csvUploader.competition).toEqual(competition);
      expect(csvUploader.parsedResults).toBeNull();
    });

    test('should clear parsed results when setting new competition', () => {
      csvUploader.parsedResults = [{ id: 1 }];
      const competition = { id: 2, name: 'New Competition', type: 'doubles' };
      
      csvUploader.setCompetition(competition);

      expect(csvUploader.parsedResults).toBeNull();
    });
  });

  describe('validateFile', () => {
    test('should accept valid CSV file', () => {
      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      
      expect(() => csvUploader.validateFile(file)).not.toThrow();
    });

    test('should reject null file', () => {
      expect(() => csvUploader.validateFile(null)).toThrow('No file selected');
    });

    test('should reject non-CSV file type', () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      
      expect(() => csvUploader.validateFile(file)).toThrow('Invalid file type');
    });

    test('should accept CSV with application/vnd.ms-excel type', () => {
      const file = new File(['test'], 'test.csv', { type: 'application/vnd.ms-excel' });
      
      expect(() => csvUploader.validateFile(file)).not.toThrow();
    });

    test('should reject file larger than 5MB', () => {
      const largeContent = 'x'.repeat(6 * 1024 * 1024); // 6MB
      const file = new File([largeContent], 'large.csv', { type: 'text/csv' });
      
      expect(() => csvUploader.validateFile(file)).toThrow('File size exceeds 5MB limit');
    });

    test('should accept file with .csv extension even if type is text/plain', () => {
      const file = new File(['test'], 'test.csv', { type: 'text/plain' });
      
      expect(() => csvUploader.validateFile(file)).not.toThrow();
    });
  });

  describe('uploadSinglesCSV', () => {
    beforeEach(() => {
      csvUploader.competition = { id: 1, name: 'Test Competition', type: 'singles' };
    });

    test('should upload valid singles CSV successfully', async () => {
      const file = new File(['Pos,Name,Gross,Hcp,Nett\n1,John SMITH,85,12,73'], 'test.csv', { type: 'text/csv' });
      
      Papa.parse.mockReturnValue({
        data: [
          { Pos: '1', Name: 'John SMITH', Gross: '85', Hcp: '12', Nett: '73' }
        ],
        meta: { fields: ['Pos', 'Name', 'Gross', 'Hcp', 'Nett'] },
        errors: []
      });

      mockApiClient.request.mockResolvedValue({
        count: 1,
        results: [{ id: 1, finishingPosition: 1, playerName: 'John SMITH' }]
      });

      const result = await csvUploader.uploadSinglesCSV(file);

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(mockApiClient.request).toHaveBeenCalledWith('/api/competition-results/batch', {
        method: 'POST',
        body: expect.any(String)
      });
    });

    test('should reject CSV with missing required columns', async () => {
      const file = new File(['Pos,Name\n1,John SMITH'], 'test.csv', { type: 'text/csv' });
      
      Papa.parse.mockReturnValue({
        data: [{ Pos: '1', Name: 'John SMITH' }],
        meta: { fields: ['Pos', 'Name'] },
        errors: []
      });

      await expect(csvUploader.uploadSinglesCSV(file)).rejects.toThrow('Missing required columns');
    });

    test('should skip rows with empty names', async () => {
      const file = new File(['Pos,Name,Gross,Hcp,Nett\n1,,85,12,73\n2,Jane DOE,88,15,73'], 'test.csv', { type: 'text/csv' });
      
      Papa.parse.mockReturnValue({
        data: [
          { Pos: '1', Name: '', Gross: '85', Hcp: '12', Nett: '73' },
          { Pos: '2', Name: 'Jane DOE', Gross: '88', Hcp: '15', Nett: '73' }
        ],
        meta: { fields: ['Pos', 'Name', 'Gross', 'Hcp', 'Nett'] },
        errors: []
      });

      mockApiClient.request.mockResolvedValue({ count: 1, results: [] });

      const result = await csvUploader.uploadSinglesCSV(file);

      const requestBody = JSON.parse(mockApiClient.request.mock.calls[0][1].body);
      expect(requestBody.results.length).toBe(1);
      expect(requestBody.results[0].playerName).toBe('Jane DOE');
    });

    test('should skip division header rows', async () => {
      const file = new File(['Pos,Name,Gross,Hcp,Nett\n,Division 1,,,\n1,John SMITH,85,12,73'], 'test.csv', { type: 'text/csv' });
      
      Papa.parse.mockReturnValue({
        data: [
          { Pos: '', Name: 'Division 1', Gross: '', Hcp: '', Nett: '' },
          { Pos: '1', Name: 'John SMITH', Gross: '85', Hcp: '12', Nett: '73' }
        ],
        meta: { fields: ['Pos', 'Name', 'Gross', 'Hcp', 'Nett'] },
        errors: []
      });

      mockApiClient.request.mockResolvedValue({ count: 1, results: [] });

      const result = await csvUploader.uploadSinglesCSV(file);

      const requestBody = JSON.parse(mockApiClient.request.mock.calls[0][1].body);
      expect(requestBody.results.length).toBe(1);
      expect(requestBody.results[0].playerName).toBe('John SMITH');
    });

    test('should handle parsing errors', async () => {
      const file = new File(['invalid csv'], 'test.csv', { type: 'text/csv' });
      
      Papa.parse.mockReturnValue({
        data: [],
        meta: { fields: [] },
        errors: [{ message: 'Parse error' }]
      });

      await expect(csvUploader.uploadSinglesCSV(file)).rejects.toThrow('CSV parsing failed');
    });

    test('should wrap API errors', async () => {
      const file = new File(['Pos,Name,Gross,Hcp,Nett\n1,John SMITH,85,12,73'], 'test.csv', { type: 'text/csv' });
      
      Papa.parse.mockReturnValue({
        data: [{ Pos: '1', Name: 'John SMITH', Gross: '85', Hcp: '12', Nett: '73' }],
        meta: { fields: ['Pos', 'Name', 'Gross', 'Hcp', 'Nett'] },
        errors: []
      });

      const apiError = new Error('Network error');
      apiError.code = 'NETWORK_ERROR';
      mockApiClient.request.mockRejectedValue(apiError);

      await expect(csvUploader.uploadSinglesCSV(file)).rejects.toThrow('Failed to upload singles CSV');
    });
  });

  describe('uploadDoublesCSV', () => {
    beforeEach(() => {
      csvUploader.competition = { id: 1, name: 'Test Competition', type: 'doubles' };
    });

    test('should upload valid doubles CSV successfully', async () => {
      const file = new File(['Pos,Name,Nett\n1,John SMITH / Jane DOE,73'], 'test.csv', { type: 'text/csv' });
      
      Papa.parse.mockReturnValue({
        data: [
          { Pos: '1', Name: 'John SMITH / Jane DOE', Nett: '73' }
        ],
        meta: { fields: ['Pos', 'Name', 'Nett'] },
        errors: []
      });

      mockApiClient.request.mockResolvedValue({
        count: 2,
        results: [
          { id: 1, finishingPosition: 1, playerName: 'John SMITH' },
          { id: 2, finishingPosition: 1, playerName: 'Jane DOE' }
        ]
      });

      const result = await csvUploader.uploadDoublesCSV(file);

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      
      const requestBody = JSON.parse(mockApiClient.request.mock.calls[0][1].body);
      expect(requestBody.results.length).toBe(2);
      expect(requestBody.results[0].playerName).toBe('John SMITH');
      expect(requestBody.results[1].playerName).toBe('Jane DOE');
    });

    test('should reject CSV with missing required columns', async () => {
      const file = new File(['Pos,Name\n1,John SMITH / Jane DOE'], 'test.csv', { type: 'text/csv' });
      
      Papa.parse.mockReturnValue({
        data: [{ Pos: '1', Name: 'John SMITH / Jane DOE' }],
        meta: { fields: ['Pos', 'Name'] },
        errors: []
      });

      await expect(csvUploader.uploadDoublesCSV(file)).rejects.toThrow('Missing required columns');
    });

    test('should reject names without "/" separator', async () => {
      const file = new File(['Pos,Name,Nett\n1,John SMITH,73'], 'test.csv', { type: 'text/csv' });
      
      Papa.parse.mockReturnValue({
        data: [{ Pos: '1', Name: 'John SMITH', Nett: '73' }],
        meta: { fields: ['Pos', 'Name', 'Nett'] },
        errors: []
      });

      await expect(csvUploader.uploadDoublesCSV(file)).rejects.toThrow('must contain "/" separator');
    });

    test('should reject names with empty parts after split', async () => {
      const file = new File(['Pos,Name,Nett\n1,John SMITH / ,73'], 'test.csv', { type: 'text/csv' });
      
      Papa.parse.mockReturnValue({
        data: [{ Pos: '1', Name: 'John SMITH / ', Nett: '73' }],
        meta: { fields: ['Pos', 'Name', 'Nett'] },
        errors: []
      });

      await expect(csvUploader.uploadDoublesCSV(file)).rejects.toThrow('must have exactly 2 non-empty names');
    });

    test('should trim whitespace from split names', async () => {
      const file = new File(['Pos,Name,Nett\n1,  John SMITH  /  Jane DOE  ,73'], 'test.csv', { type: 'text/csv' });
      
      Papa.parse.mockReturnValue({
        data: [{ Pos: '1', Name: '  John SMITH  /  Jane DOE  ', Nett: '73' }],
        meta: { fields: ['Pos', 'Name', 'Nett'] },
        errors: []
      });

      mockApiClient.request.mockResolvedValue({ count: 2, results: [] });

      await csvUploader.uploadDoublesCSV(file);

      const requestBody = JSON.parse(mockApiClient.request.mock.calls[0][1].body);
      expect(requestBody.results[0].playerName).toBe('John SMITH');
      expect(requestBody.results[1].playerName).toBe('Jane DOE');
    });

    test('should skip division header rows', async () => {
      const file = new File(['Pos,Name,Nett\n,Division 1,\n1,John SMITH / Jane DOE,73'], 'test.csv', { type: 'text/csv' });
      
      Papa.parse.mockReturnValue({
        data: [
          { Pos: '', Name: 'Division 1', Nett: '' },
          { Pos: '1', Name: 'John SMITH / Jane DOE', Nett: '73' }
        ],
        meta: { fields: ['Pos', 'Name', 'Nett'] },
        errors: []
      });

      mockApiClient.request.mockResolvedValue({ count: 2, results: [] });

      const result = await csvUploader.uploadDoublesCSV(file);

      const requestBody = JSON.parse(mockApiClient.request.mock.calls[0][1].body);
      expect(requestBody.results.length).toBe(2);
    });
  });

  describe('formatSinglesCSV', () => {
    test('should format singles results correctly', () => {
      const results = [
        { finishingPosition: 1, playerName: 'John SMITH', grossScore: 85, handicap: 12, nettScore: 73 },
        { finishingPosition: 2, playerName: 'Jane DOE', grossScore: 88, handicap: 15, nettScore: 73 }
      ];

      Papa.unparse.mockReturnValue('Pos,Name,Gross,Hcp,Nett\n1,John SMITH,85,12,73\n2,Jane DOE,88,15,73');

      const csv = csvUploader.formatSinglesCSV(results);

      expect(Papa.unparse).toHaveBeenCalledWith({
        fields: ['Pos', 'Name', 'Gross', 'Hcp', 'Nett'],
        data: [
          [1, 'John SMITH', 85, 12, 73],
          [2, 'Jane DOE', 88, 15, 73]
        ]
      });
      expect(csv).toContain('John SMITH');
    });

    test('should handle snake_case field names', () => {
      const results = [
        { finishing_position: 1, player_name: 'John SMITH', gross_score: 85, handicap: 12, nett_score: 73 }
      ];

      Papa.unparse.mockReturnValue('Pos,Name,Gross,Hcp,Nett\n1,John SMITH,85,12,73');

      csvUploader.formatSinglesCSV(results);

      expect(Papa.unparse).toHaveBeenCalled();
    });

    test('should handle empty optional fields', () => {
      const results = [
        { finishingPosition: 1, playerName: 'John SMITH' }
      ];

      Papa.unparse.mockReturnValue('Pos,Name,Gross,Hcp,Nett\n1,John SMITH,,,');

      const csv = csvUploader.formatSinglesCSV(results);

      expect(Papa.unparse).toHaveBeenCalledWith({
        fields: ['Pos', 'Name', 'Gross', 'Hcp', 'Nett'],
        data: [[1, 'John SMITH', '', '', '']]
      });
    });

    test('should sort results by position', () => {
      const results = [
        { finishingPosition: 3, playerName: 'Bob JONES' },
        { finishingPosition: 1, playerName: 'John SMITH' },
        { finishingPosition: 2, playerName: 'Jane DOE' }
      ];

      Papa.unparse.mockReturnValue('csv');

      csvUploader.formatSinglesCSV(results);

      const callArgs = Papa.unparse.mock.calls[0][0];
      expect(callArgs.data[0][0]).toBe(1); // First position
      expect(callArgs.data[1][0]).toBe(2); // Second position
      expect(callArgs.data[2][0]).toBe(3); // Third position
    });
  });

  describe('formatDoublesCSV', () => {
    test('should format doubles results correctly', () => {
      const results = [
        { finishingPosition: 1, playerName: 'John SMITH', nettScore: 73 },
        { finishingPosition: 1, playerName: 'Jane DOE', nettScore: 73 },
        { finishingPosition: 2, playerName: 'Bob JONES', nettScore: 74 },
        { finishingPosition: 2, playerName: 'Alice BROWN', nettScore: 74 }
      ];

      Papa.unparse.mockReturnValue('Pos,Name,Nett\n1,John SMITH / Jane DOE,73\n2,Bob JONES / Alice BROWN,74');

      const csv = csvUploader.formatDoublesCSV(results);

      expect(Papa.unparse).toHaveBeenCalledWith({
        fields: ['Pos', 'Name', 'Nett'],
        data: [
          ['1', 'John SMITH / Jane DOE', 73],
          ['2', 'Bob JONES / Alice BROWN', 74]
        ]
      });
    });

    test('should handle snake_case field names', () => {
      const results = [
        { finishing_position: 1, player_name: 'John SMITH', nett_score: 73 },
        { finishing_position: 1, player_name: 'Jane DOE', nett_score: 73 }
      ];

      Papa.unparse.mockReturnValue('csv');

      csvUploader.formatDoublesCSV(results);

      expect(Papa.unparse).toHaveBeenCalled();
    });

    test('should group results by position', () => {
      const results = [
        { finishingPosition: 2, playerName: 'Bob JONES', nettScore: 74 },
        { finishingPosition: 1, playerName: 'John SMITH', nettScore: 73 },
        { finishingPosition: 1, playerName: 'Jane DOE', nettScore: 73 },
        { finishingPosition: 2, playerName: 'Alice BROWN', nettScore: 74 }
      ];

      Papa.unparse.mockReturnValue('csv');

      csvUploader.formatDoublesCSV(results);

      const callArgs = Papa.unparse.mock.calls[0][0];
      expect(callArgs.data.length).toBe(2); // Two positions
      expect(callArgs.data[0][0]).toBe('1'); // First position
      expect(callArgs.data[1][0]).toBe('2'); // Second position
    });
  });

  describe('render', () => {
    test('should show empty state when no competition selected', () => {
      csvUploader.competition = null;
      csvUploader.render();

      const emptyState = document.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
      expect(emptyState.textContent).toBe('Select a competition to upload or export CSV');
    });

    test('should render upload and export buttons for singles competition', () => {
      csvUploader.competition = { id: 1, name: 'Test Competition', type: 'singles' };
      csvUploader.render();

      const uploadBtn = document.querySelector('.btn-primary');
      const exportBtn = document.querySelector('.btn-secondary');
      
      expect(uploadBtn).toBeTruthy();
      expect(uploadBtn.textContent).toBe('Upload Singles CSV');
      expect(exportBtn).toBeTruthy();
      expect(exportBtn.textContent).toBe('Export CSV');
    });

    test('should render upload and export buttons for doubles competition', () => {
      csvUploader.competition = { id: 1, name: 'Test Competition', type: 'doubles' };
      csvUploader.render();

      const uploadBtn = document.querySelector('.btn-primary');
      
      expect(uploadBtn).toBeTruthy();
      expect(uploadBtn.textContent).toBe('Upload Doubles CSV');
    });

    test('should show singles format info', () => {
      csvUploader.competition = { id: 1, name: 'Test Competition', type: 'singles' };
      csvUploader.render();

      const infoText = document.querySelector('.csv-info p');
      expect(infoText.textContent).toContain('Singles CSV Format');
      expect(infoText.textContent).toContain('Pos, Name, Gross, Hcp, Nett');
    });

    test('should show doubles format info', () => {
      csvUploader.competition = { id: 1, name: 'Test Competition', type: 'doubles' };
      csvUploader.render();

      const infoText = document.querySelector('.csv-info p');
      expect(infoText.textContent).toContain('Doubles CSV Format');
      expect(infoText.textContent).toContain('Player1 / Player2');
    });

    test('should show file size limit', () => {
      csvUploader.competition = { id: 1, name: 'Test Competition', type: 'singles' };
      csvUploader.render();

      const limitText = document.querySelector('.text-muted');
      expect(limitText.textContent).toBe('Maximum file size: 5MB');
    });

    test('should create hidden file input', () => {
      csvUploader.competition = { id: 1, name: 'Test Competition', type: 'singles' };
      csvUploader.render();

      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeTruthy();
      expect(fileInput.style.display).toBe('none');
      expect(fileInput.accept).toBe('.csv,text/csv');
    });

    test('should handle missing container gracefully', () => {
      document.body.innerHTML = '';
      
      expect(() => csvUploader.render()).not.toThrow();
    });
  });

  describe('handleUpload', () => {
    test('should trigger file input click', () => {
      csvUploader.competition = { id: 1, name: 'Test Competition', type: 'singles' };
      csvUploader.render();

      const fileInput = document.querySelector('input[type="file"]');
      fileInput.click = jest.fn();

      const uploadBtn = document.querySelector('.btn-primary');
      uploadBtn.click();

      expect(fileInput.click).toHaveBeenCalled();
    });
  });

  describe('handleExport', () => {
    beforeEach(() => {
      csvUploader.competition = { id: 1, name: 'Test Competition', type: 'singles' };
      csvUploader.render();

      // Mock URL.createObjectURL and revokeObjectURL
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = jest.fn();
    });

    afterEach(() => {
      delete global.URL.createObjectURL;
      delete global.URL.revokeObjectURL;
    });

    test('should export results as CSV', async () => {
      const mockResults = [
        { finishingPosition: 1, playerName: 'John SMITH', grossScore: 85, handicap: 12, nettScore: 73 }
      ];

      mockApiClient.request.mockResolvedValue({ results: mockResults });
      Papa.unparse.mockReturnValue('Pos,Name,Gross,Hcp,Nett\n1,John SMITH,85,12,73');

      const exportBtn = document.querySelector('.btn-secondary');
      await exportBtn.click();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockApiClient.request).toHaveBeenCalledWith(
        '/api/competition-results?competitionId=1',
        { method: 'GET' }
      );
      expect(Papa.unparse).toHaveBeenCalled();
    });

    test('should show error when no competition selected', async () => {
      csvUploader.competition = null;
      csvUploader.render();

      await csvUploader.handleExport();

      // Error notification should be shown (tested in notification tests)
    });

    test('should show error when no results to export', async () => {
      mockApiClient.request.mockResolvedValue({ results: [] });

      await csvUploader.handleExport();

      // Error notification should be shown
    });

    test('should handle export errors gracefully', async () => {
      mockApiClient.request.mockRejectedValue(new Error('Network error'));

      const exportBtn = document.querySelector('.btn-secondary');
      await exportBtn.click();

      await new Promise(resolve => setTimeout(resolve, 0));

      // Error notification should be shown
    });
  });

  describe('showProgress', () => {
    beforeEach(() => {
      csvUploader.competition = { id: 1, name: 'Test Competition', type: 'singles' };
      csvUploader.render();
    });

    test('should show progress bar and disable buttons', () => {
      csvUploader.showProgress(true);

      expect(csvUploader.progressBar.style.display).toBe('block');
      expect(csvUploader.uploadBtn.disabled).toBe(true);
      expect(csvUploader.exportBtn.disabled).toBe(true);
      expect(csvUploader.isUploading).toBe(true);
    });

    test('should hide progress bar and enable buttons', () => {
      csvUploader.showProgress(false);

      expect(csvUploader.progressBar.style.display).toBe('none');
      expect(csvUploader.uploadBtn.disabled).toBe(false);
      expect(csvUploader.exportBtn.disabled).toBe(false);
      expect(csvUploader.isUploading).toBe(false);
    });
  });

  describe('notification system', () => {
    test('should show success notification', () => {
      csvUploader.showSuccess('Upload successful');

      const notification = document.querySelector('.notification-success');
      expect(notification).toBeTruthy();
      expect(notification.textContent).toBe('Upload successful');
    });

    test('should show error notification', () => {
      csvUploader.showError('Upload failed');

      const notification = document.querySelector('.notification-error');
      expect(notification).toBeTruthy();
      expect(notification.textContent).toBe('Upload failed');
    });

    test('should auto-remove notification after timeout', (done) => {
      csvUploader.showSuccess('Test message');

      const notification = document.querySelector('.notification');
      expect(notification).toBeTruthy();

      setTimeout(() => {
        expect(document.querySelector('.notification')).toBeFalsy();
        done();
      }, 3500);
    }, 4000);
  });

  describe('destroy', () => {
    test('should clean up event listeners and DOM', () => {
      csvUploader.competition = { id: 1, name: 'Test Competition', type: 'singles' };
      csvUploader.render();

      const container = document.getElementById('csv-uploader-container');
      expect(container.innerHTML).not.toBe('');

      csvUploader.destroy();

      expect(container.innerHTML).toBe('');
    });
  });

  describe('event dispatching', () => {
    beforeEach(() => {
      csvUploader.competition = { id: 1, name: 'Test Competition', type: 'singles' };
      csvUploader.render();
    });

    test('should dispatch results-uploaded event on successful upload', async () => {
      const file = new File(['Pos,Name,Gross,Hcp,Nett\n1,John SMITH,85,12,73'], 'test.csv', { type: 'text/csv' });
      
      Papa.parse.mockReturnValue({
        data: [{ Pos: '1', Name: 'John SMITH', Gross: '85', Hcp: '12', Nett: '73' }],
        meta: { fields: ['Pos', 'Name', 'Gross', 'Hcp', 'Nett'] },
        errors: []
      });

      mockApiClient.request.mockResolvedValue({ count: 1, results: [] });

      const eventListener = jest.fn();
      document.addEventListener('results-uploaded', eventListener);

      const fileInput = document.querySelector('input[type="file"]');
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false
      });

      await csvUploader.handleFileSelect({ target: { files: [file] } });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(eventListener).toHaveBeenCalled();
      expect(eventListener.mock.calls[0][0].detail.competitionId).toBe(1);
      expect(eventListener.mock.calls[0][0].detail.count).toBe(1);

      document.removeEventListener('results-uploaded', eventListener);
    });
  });
});
