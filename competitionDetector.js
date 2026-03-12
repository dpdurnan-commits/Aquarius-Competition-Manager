/**
 * Competition Detector Module
 * Detects new competition names from transaction records that don't exist in the database
 */

/**
 * @typedef {Object} EnhancedRecord
 * @property {string} date - Transaction date
 * @property {string} time - Transaction time
 * @property {string} till - Till identifier
 * @property {string} type - Transaction type (Sale/Refund/Topup)
 * @property {string} member - Member field
 * @property {string} player - Extracted player name
 * @property {string} competition - Extracted competition name
 * @property {string} total - Total value
 * @property {number} sourceRowIndex - Original row position in CSV
 * @property {boolean} isComplete - True if all required data present
 */

export class CompetitionDetector {
  /**
   * Create a CompetitionDetector instance
   * @param {Object} apiClient - API client for making requests
   */
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Extract unique competition names from Sale/Refund records
   * @param {EnhancedRecord[]} records - Transaction records with extracted fields
   * @returns {string[]} - Array of unique competition names
   */
  extractCompetitionNames(records) {
    // Filter for Sale and Refund records with non-empty competition fields
    const validTypes = ['Sale', 'Refund'];
    const competitionNames = new Set();

    for (const record of records) {
      // Check if record type is Sale or Refund
      if (!validTypes.includes(record.type)) {
        continue;
      }

      // Check if competition field is non-empty
      const competition = record.competition;
      if (competition && competition.trim() !== '') {
        competitionNames.add(competition.trim());
      }
    }

    return Array.from(competitionNames);
  }

  /**
   * Detect new competition names from enhanced records
   * @param {EnhancedRecord[]} records - Transaction records with extracted fields
   * @returns {Promise<string[]>} - Array of new competition names
   */
  async detectNewCompetitions(records) {
    // Extract unique competition names from records
    const extractedNames = this.extractCompetitionNames(records);

    // If no competition names found, return empty array
    if (extractedNames.length === 0) {
      return [];
    }

    // Query API for existing competitions
    const existingCompetitions = await this.apiClient.getAllCompetitions();

    // Create a set of existing competition names for fast lookup
    const existingNames = new Set(
      existingCompetitions.map(comp => comp.name.trim())
    );

    // Filter out existing competitions
    const newCompetitionNames = extractedNames.filter(
      name => !existingNames.has(name)
    );

    return newCompetitionNames;
  }
}
