import { CSVParserService } from './csvParser.service';
import { CSVFormatterService } from './csvFormatter.service';

describe('CSVParserService', () => {
  let parserService: CSVParserService;

  beforeEach(() => {
    parserService = new CSVParserService();
  });

  describe('parseSinglesCSV', () => {
    it('should parse valid singles CSV', async () => {
      const csv = `Pos,Name,Gross,Hcp,Nett
1,John SMITH,85,12,73
2,Jane DOE,88,15,73`;

      const result = await parserService.parseSinglesCSV(csv);

      expect(result.valid).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.data[0]).toMatchObject({
        finishingPosition: 1,
        playerName: 'John SMITH',
        grossScore: 85,
        handicap: 12,
        nettScore: 73,
      });
    });

    it('should skip empty name rows', async () => {
      const csv = `Pos,Name,Gross,Hcp,Nett
1,John SMITH,85,12,73
2,,88,15,73
3,Jane DOE,90,16,74`;

      const result = await parserService.parseSinglesCSV(csv);

      expect(result.valid).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].playerName).toBe('John SMITH');
      expect(result.data[1].playerName).toBe('Jane DOE');
    });

    it('should skip division header rows', async () => {
      const csv = `Pos,Name,Gross,Hcp,Nett
1,John SMITH,85,12,73
,Division 1,,,
2,Jane DOE,88,15,73`;

      const result = await parserService.parseSinglesCSV(csv);

      expect(result.valid).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].playerName).toBe('John SMITH');
      expect(result.data[1].playerName).toBe('Jane DOE');
    });

    it('should trim whitespace from all fields', async () => {
      const csv = `Pos,Name,Gross,Hcp,Nett
 1 , John SMITH , 85 , 12 , 73 `;

      const result = await parserService.parseSinglesCSV(csv);

      expect(result.valid).toBe(true);
      expect(result.data[0]).toMatchObject({
        finishingPosition: 1,
        playerName: 'John SMITH',
        grossScore: 85,
        handicap: 12,
        nettScore: 73,
      });
    });

    it('should return error for missing required columns', async () => {
      const csv = `Pos,Name,Gross
1,John SMITH,85`;

      const result = await parserService.parseSinglesCSV(csv);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Missing required columns');
    });

    it('should return error for invalid position', async () => {
      const csv = `Pos,Name,Gross,Hcp,Nett
abc,John SMITH,85,12,73`;

      const result = await parserService.parseSinglesCSV(csv);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('Pos');
    });

    it('should include row and field info in error messages', async () => {
      const csv = `Pos,Name,Gross,Hcp,Nett
1,John SMITH,85,12,73
invalid,Jane DOE,88,15,73
3,Bob JONES,abc,10,def`;

      const result = await parserService.parseSinglesCSV(csv);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Check that errors include row numbers
      const posError = result.errors.find(e => e.field === 'Pos');
      expect(posError).toBeDefined();
      expect(posError?.row).toBe(3); // Row 3 (header is row 1, first data row is 2)
      expect(posError?.message).toContain('invalid');
      
      // Check that errors include field names
      const grossError = result.errors.find(e => e.field === 'Gross');
      expect(grossError).toBeDefined();
      expect(grossError?.row).toBe(4); // Row 4
      expect(grossError?.field).toBe('Gross');
      expect(grossError?.message).toContain('abc');
    });
  });

  describe('parseDoublesCSV', () => {
    it('should parse valid doubles CSV', async () => {
      const csv = `Pos,Name,Nett
1,John SMITH / Jane DOE,73
2,Bob JONES / Alice BROWN,74`;

      const result = await parserService.parseDoublesCSV(csv);

      expect(result.valid).toBe(true);
      expect(result.data).toHaveLength(4); // 2 rows * 2 players each
      expect(result.errors).toHaveLength(0);
      expect(result.data[0]).toMatchObject({
        finishingPosition: 1,
        playerName: 'John SMITH',
        nettScore: 73,
      });
      expect(result.data[1]).toMatchObject({
        finishingPosition: 1,
        playerName: 'Jane DOE',
        nettScore: 73,
      });
    });

    it('should trim whitespace from split names', async () => {
      const csv = `Pos,Name,Nett
1, John SMITH  /  Jane DOE ,73`;

      const result = await parserService.parseDoublesCSV(csv);

      expect(result.valid).toBe(true);
      expect(result.data[0].playerName).toBe('John SMITH');
      expect(result.data[1].playerName).toBe('Jane DOE');
    });

    it('should return error if Name does not contain "/"', async () => {
      const csv = `Pos,Name,Nett
1,John SMITH,73`;

      const result = await parserService.parseDoublesCSV(csv);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('must contain "/" separator');
    });

    it('should skip empty name rows', async () => {
      const csv = `Pos,Name,Nett
1,John SMITH / Jane DOE,73
2,,74
3,Bob JONES / Alice BROWN,75`;

      const result = await parserService.parseDoublesCSV(csv);

      expect(result.valid).toBe(true);
      expect(result.data).toHaveLength(4);
    });

    it('should skip division header rows', async () => {
      const csv = `Pos,Name,Nett
1,John SMITH / Jane DOE,73
,Division 1,
2,Bob JONES / Alice BROWN,74`;

      const result = await parserService.parseDoublesCSV(csv);

      expect(result.valid).toBe(true);
      expect(result.data).toHaveLength(4);
    });

    it('should return error for missing required columns', async () => {
      const csv = `Pos,Name
1,John SMITH / Jane DOE`;

      const result = await parserService.parseDoublesCSV(csv);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Missing required columns');
      expect(result.errors[0].message).toContain('Nett');
    });

    it('should include row and field info in error messages', async () => {
      const csv = `Pos,Name,Nett
1,John SMITH / Jane DOE,73
invalid,Bob JONES / Alice BROWN,74
3,Charlie BROWN,75`;

      const result = await parserService.parseDoublesCSV(csv);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Check error for invalid position includes row number
      const posError = result.errors.find(e => e.field === 'Pos');
      expect(posError).toBeDefined();
      expect(posError?.row).toBe(3); // Row 3 (header is row 1, first data row is 2)
      
      // Check error for missing "/" includes row number and field
      const nameError = result.errors.find(e => e.field === 'Name' && e.message.includes('separator'));
      expect(nameError).toBeDefined();
      expect(nameError?.row).toBe(4); // Row 4
      expect(nameError?.field).toBe('Name');
      expect(nameError?.message).toContain('Charlie BROWN');
    });
  });
});

describe('CSVFormatterService', () => {
  let formatterService: CSVFormatterService;

  beforeEach(() => {
    formatterService = new CSVFormatterService();
  });

  describe('formatSinglesResults', () => {
    it('should format singles results to CSV', () => {
      const results = [
        {
          id: 1,
          competitionId: 1,
          finishingPosition: 1,
          playerName: 'John SMITH',
          grossScore: 85,
          handicap: 12,
          nettScore: 73,
          entryPaid: true,
          swindleMoneyPaid: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          competitionId: 1,
          finishingPosition: 2,
          playerName: 'Jane DOE',
          grossScore: 88,
          handicap: 15,
          nettScore: 73,
          entryPaid: true,
          swindleMoneyPaid: 30,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const csv = formatterService.formatSinglesResults(results);

      expect(csv).toContain('Pos,Name,Gross,Hcp,Nett');
      expect(csv).toContain('1,John SMITH,85,12,73');
      expect(csv).toContain('2,Jane DOE,88,15,73');
    });
  });

  describe('formatDoublesResults', () => {
    it('should format doubles results to CSV with combined names', () => {
      const results = [
        {
          id: 1,
          competitionId: 1,
          finishingPosition: 1,
          playerName: 'John SMITH',
          grossScore: null,
          handicap: null,
          nettScore: 73,
          entryPaid: true,
          swindleMoneyPaid: 25,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          competitionId: 1,
          finishingPosition: 1,
          playerName: 'Jane DOE',
          grossScore: null,
          handicap: null,
          nettScore: 73,
          entryPaid: true,
          swindleMoneyPaid: 25,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const csv = formatterService.formatDoublesResults(results);

      expect(csv).toContain('Pos,Name,Nett');
      expect(csv).toContain('1,John SMITH / Jane DOE,73');
    });
  });
});
