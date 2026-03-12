/**
 * Field Extractor Module
 * Extracts Player and Competition information from Member field
 */

/**
 * @typedef {Object} EnhancedRecord
 * @property {string} date - Column A - original value
 * @property {string} time - Column B - original value
 * @property {string} till - Column C - original value
 * @property {string} type - Column D - original value (Topup/Sale/Refund)
 * @property {string} member - Column E - cleared if extraction occurs
 * @property {string} player - Extracted from Member field
 * @property {string} competition - Extracted from Member field
 * @property {string} total - Column J - from row+2
 * @property {number} sourceRowIndex - Original row position in CSV
 * @property {boolean} isComplete - True if all required data present
 */

/**
 * Field Extractor class
 * Extracts Player and Competition information from the Member field
 */
export class FieldExtractor {
  /**
   * Extract Player and Competition fields from a TransformedRecord
   * @param {Object} record - The transformed record to extract fields from
   * @returns {EnhancedRecord} - Record with extracted Player and Competition fields
   */
  extract(record) {
    // Handle null or undefined record
    if (!record) {
      return {
        ...record,
        player: '',
        competition: '',
        member: ''
      };
    }

    const memberValue = record.member;
    
    // Handle null or undefined member field
    if (memberValue === null || memberValue === undefined) {
      return {
        ...record,
        member: '',
        player: '',
        competition: ''
      };
    }

    // Check if both delimiters are present
    const hasAmpersand = memberValue.includes(' &');
    const hasColon = memberValue.includes(':');
    
    if (hasAmpersand && hasColon) {
      // Format: "Player & Competition: Entry"
      // Find positions
      const ampersandPos = memberValue.indexOf(' &');
      const colonPos = memberValue.indexOf(':');
      
      let player = '';
      let competition = '';
      
      // Extract player (before " &")
      if (ampersandPos >= 0) {
        player = memberValue.substring(0, ampersandPos).trim();
      }
      
      // Extract competition (after "& " and before ":")
      if (ampersandPos >= 0 && colonPos > ampersandPos) {
        const startPos = ampersandPos + 2; // Skip " &"
        competition = memberValue.substring(startPos, colonPos).trim();
      }
      
      // Return record with extracted fields and cleared member
      return {
        ...record,
        member: '',
        player: player,
        competition: competition
      };
    } else if (hasAmpersand) {
      // Format: "Player & Competition" (without colon)
      const ampersandPos = memberValue.indexOf(' &');
      
      let player = '';
      let competition = '';
      
      // Extract player (before " &")
      if (ampersandPos >= 0) {
        player = memberValue.substring(0, ampersandPos).trim();
      }
      
      // Extract competition (after "& ")
      if (ampersandPos >= 0) {
        const startPos = ampersandPos + 2; // Skip " &"
        competition = memberValue.substring(startPos).trim();
      }
      
      // Return record with extracted fields and cleared member
      return {
        ...record,
        member: '',
        player: player,
        competition: competition
      };
    } else {
      // Keep member as-is, set others to empty
      return {
        ...record,
        member: memberValue,
        player: '',
        competition: ''
      };
    }
  }
}
