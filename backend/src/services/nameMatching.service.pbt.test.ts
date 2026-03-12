import * as fc from 'fast-check';
import { NameMatchingService } from './nameMatching.service';
import { DatabaseService } from './database.service';

describe('NameMatchingService - Property-Based Tests', () => {
  let nameMatchingService: NameMatchingService;
  let mockDb: DatabaseService;

  beforeEach(() => {
    // Create a mock database service
    mockDb = {
      query: jest.fn(),
    } as any;

    nameMatchingService = new NameMatchingService(mockDb);
  });

  describe('Property 29: Name Matching Case Insensitivity', () => {
    /**
     * Feature: competition-results-management
     * Property 29: Name Matching Case Insensitivity
     * 
     * **Validates: Requirements 9.3**
     * 
     * For any two player names N1 and N2, the name matching function SHALL return 
     * the same result for match(N1, N2) and match(N2, N1), and case differences 
     * alone SHALL NOT affect matching.
     * 
     * This property ensures that:
     * 1. Name matching is commutative: match(N1, N2) = match(N2, N1)
     * 2. Case differences do not affect matching results
     * 3. The matching function is consistent and reliable
     */
    it('should return the same result for match(N1, N2) and match(N2, N1)', async () => {
      // Arbitrary for generating player names
      const playerNameArbitrary = fc.tuple(
        fc.string({ minLength: 1, maxLength: 20 })
          .map(s => s.replace(/[",\n\r]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'First'),
        fc.string({ minLength: 1, maxLength: 20 })
          .map(s => s.replace(/[",\n\r]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'Last')
      ).map(([first, last]) => `${first} ${last}`);

      // Generate pairs of names to test commutativity
      const namePairArbitrary = fc.tuple(playerNameArbitrary, playerNameArbitrary);

      await fc.assert(
        fc.asyncProperty(namePairArbitrary, async ([name1, name2]) => {
          // Test commutativity: match(N1, N2) should equal match(N2, N1)
          const match1to2 = nameMatchingService.matchesVariation(name1, name2);
          const match2to1 = nameMatchingService.matchesVariation(name2, name1);

          // The matching should be commutative
          expect(match1to2).toBe(match2to1);
        }),
        { numRuns: 100 } // Minimum 100 iterations as per requirement
      );
    });

    it('should not be affected by case differences', async () => {
      // Arbitrary for generating player names
      const playerNameArbitrary = fc.tuple(
        fc.string({ minLength: 1, maxLength: 20 })
          .map(s => s.replace(/[",\n\r]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'First'),
        fc.string({ minLength: 1, maxLength: 20 })
          .map(s => s.replace(/[",\n\r]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'Last')
      ).map(([first, last]) => `${first} ${last}`);

      // Generate different case variations of the same name
      const caseVariationsArbitrary = playerNameArbitrary.chain(name => {
        return fc.tuple(
          fc.constant(name),
          fc.constant(name.toLowerCase()),
          fc.constant(name.toUpperCase()),
          fc.constant(name.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' '))
        );
      });

      await fc.assert(
        fc.asyncProperty(caseVariationsArbitrary, async ([original, lower, upper, title]) => {
          // All case variations should match each other
          expect(nameMatchingService.matchesVariation(original, lower)).toBe(true);
          expect(nameMatchingService.matchesVariation(original, upper)).toBe(true);
          expect(nameMatchingService.matchesVariation(original, title)).toBe(true);
          expect(nameMatchingService.matchesVariation(lower, upper)).toBe(true);
          expect(nameMatchingService.matchesVariation(lower, title)).toBe(true);
          expect(nameMatchingService.matchesVariation(upper, title)).toBe(true);
        }),
        { numRuns: 100 } // Minimum 100 iterations as per requirement
      );
    });

    it('should normalize names consistently regardless of case', async () => {
      // Arbitrary for generating player names with various case patterns
      const nameWithCaseVariationsArbitrary = fc.tuple(
        fc.string({ minLength: 1, maxLength: 20 })
          .map(s => s.replace(/[",\n\r]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'First'),
        fc.string({ minLength: 1, maxLength: 20 })
          .map(s => s.replace(/[",\n\r]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'Last')
      ).map(([first, last]) => `${first} ${last}`);

      await fc.assert(
        fc.asyncProperty(nameWithCaseVariationsArbitrary, async (name) => {
          // Normalize the name in different cases
          const normalizedOriginal = nameMatchingService.normalizeName(name);
          const normalizedLower = nameMatchingService.normalizeName(name.toLowerCase());
          const normalizedUpper = nameMatchingService.normalizeName(name.toUpperCase());

          // All normalized versions should be identical
          expect(normalizedOriginal).toBe(normalizedUpper);
          expect(normalizedLower).toBe(normalizedUpper);
          expect(normalizedOriginal).toBe(normalizedLower);

          // Normalized name should be uppercase
          expect(normalizedOriginal).toBe(normalizedOriginal.toUpperCase());
        }),
        { numRuns: 100 } // Minimum 100 iterations as per requirement
      );
    });

    it('should handle mixed case in initial + surname matching', async () => {
      // Generate pairs where initial matches first letter of full name
      const matchingPairArbitrary = fc.tuple(
        fc.constantFrom('Alice', 'Bob', 'Charlie', 'David', 'Emma', 'Frank', 'Grace', 'Henry'),
        fc.string({ minLength: 1, maxLength: 20 })
          .map(s => s.replace(/[",\n\r]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'SURNAME')
      ).map(([first, surname]) => {
        const initial = first.charAt(0);
        const fullName = `${first} ${surname}`;
        const initialName = `${initial}. ${surname}`;
        return { fullName, initialName };
      });

      await fc.assert(
        fc.asyncProperty(matchingPairArbitrary, async ({ fullName, initialName }) => {
          // Test with various case combinations
          const variations = [
            { full: fullName, initial: initialName },
            { full: fullName.toLowerCase(), initial: initialName.toLowerCase() },
            { full: fullName.toUpperCase(), initial: initialName.toUpperCase() },
            { full: fullName.toLowerCase(), initial: initialName.toUpperCase() },
            { full: fullName.toUpperCase(), initial: initialName.toLowerCase() },
          ];

          variations.forEach(({ full, initial }) => {
            // Initial + surname should match full name regardless of case
            const matches = nameMatchingService.matchesVariation(full, initial);
            expect(matches).toBe(true);

            // Should be commutative
            const matchesReverse = nameMatchingService.matchesVariation(initial, full);
            expect(matchesReverse).toBe(true);
            expect(matches).toBe(matchesReverse);
          });
        }),
        { numRuns: 100 } // Minimum 100 iterations as per requirement
      );
    });

    it('should handle whitespace variations consistently', async () => {
      // Arbitrary for generating names with various whitespace patterns
      const nameWithWhitespaceArbitrary = fc.tuple(
        fc.string({ minLength: 1, maxLength: 20 })
          .map(s => s.replace(/[",\n\r]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'First'),
        fc.string({ minLength: 1, maxLength: 20 })
          .map(s => s.replace(/[",\n\r]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'Last'),
        fc.integer({ min: 1, max: 5 }) // number of spaces between names
      ).map(([first, last, spaces]) => {
        const spacer = ' '.repeat(spaces);
        return {
          original: `${first} ${last}`,
          withExtraSpaces: `${first}${spacer}${last}`,
          withLeadingSpace: ` ${first} ${last}`,
          withTrailingSpace: `${first} ${last} `,
          withBothSpaces: ` ${first} ${last} `,
        };
      });

      await fc.assert(
        fc.asyncProperty(nameWithWhitespaceArbitrary, async (variations) => {
          // All variations should match each other after normalization
          const names = Object.values(variations);
          
          for (let i = 0; i < names.length; i++) {
            for (let j = i + 1; j < names.length; j++) {
              const match = nameMatchingService.matchesVariation(names[i], names[j]);
              expect(match).toBe(true);
            }
          }

          // All normalized versions should be identical
          const normalized = names.map(name => nameMatchingService.normalizeName(name));
          const firstNormalized = normalized[0];
          normalized.forEach(norm => {
            expect(norm).toBe(firstNormalized);
          });
        }),
        { numRuns: 100 } // Minimum 100 iterations as per requirement
      );
    });

    it('should maintain case insensitivity with special characters', async () => {
      // Arbitrary for generating names with hyphens and apostrophes
      const nameWithSpecialCharsArbitrary = fc.tuple(
        fc.string({ minLength: 1, maxLength: 15 })
          .map(s => s.replace(/[",\n\r]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'First'),
        fc.string({ minLength: 1, maxLength: 15 })
          .map(s => s.replace(/[",\n\r]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'Last'),
        fc.constantFrom('-', "'", '')
      ).map(([first, last, separator]) => {
        if (separator) {
          return `${first}${separator}${last}`;
        }
        return `${first} ${last}`;
      });

      await fc.assert(
        fc.asyncProperty(nameWithSpecialCharsArbitrary, async (name) => {
          // Test case insensitivity with special characters
          const lower = name.toLowerCase();
          const upper = name.toUpperCase();
          const mixed = name.split('').map((char, i) => 
            i % 2 === 0 ? char.toLowerCase() : char.toUpperCase()
          ).join('');

          // All case variations should match
          expect(nameMatchingService.matchesVariation(name, lower)).toBe(true);
          expect(nameMatchingService.matchesVariation(name, upper)).toBe(true);
          expect(nameMatchingService.matchesVariation(name, mixed)).toBe(true);
          expect(nameMatchingService.matchesVariation(lower, upper)).toBe(true);
          expect(nameMatchingService.matchesVariation(lower, mixed)).toBe(true);
          expect(nameMatchingService.matchesVariation(upper, mixed)).toBe(true);
        }),
        { numRuns: 100 } // Minimum 100 iterations as per requirement
      );
    });
  });

  describe('Property 32: Name Normalization Matching', () => {
    /**
     * Feature: competition-results-management
     * Property 32: Name Normalization Matching
     * 
     * **Validates: Requirements 9.8**
     * 
     * For any player names that normalize to the same value (e.g., "A. REID" and 
     * "Alastair REID"), the name matching function SHALL consider them as matches.
     * 
     * This property ensures that:
     * 1. Initial + surname variations match full name + surname
     * 2. "A. REID" matches "Alastair REID"
     * 3. The matching works regardless of case
     * 4. The matching is bidirectional
     */
    it('should match initial + surname with full name + surname', async () => {
      // Arbitrary for generating matching name pairs (initial vs full name)
      const matchingNamePairArbitrary = fc.tuple(
        fc.constantFrom('Alastair', 'Bob', 'Charlie', 'David', 'Emma', 'Frank', 'Grace', 'Henry'),
        fc.string({ minLength: 1, maxLength: 20 })
          .map(s => s.replace(/[",\n\r]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'SURNAME')
      ).map(([firstName, surname]) => {
        const initial = firstName.charAt(0);
        const fullName = `${firstName} ${surname}`;
        const initialName = `${initial}. ${surname}`;
        return { fullName, initialName, firstName, surname };
      });

      await fc.assert(
        fc.asyncProperty(matchingNamePairArbitrary, async ({ fullName, initialName }) => {
          // Initial + surname should match full name + surname
          const matches = nameMatchingService.matchesVariation(fullName, initialName);
          expect(matches).toBe(true);

          // Should be bidirectional
          const matchesReverse = nameMatchingService.matchesVariation(initialName, fullName);
          expect(matchesReverse).toBe(true);
        }),
        { numRuns: 100 } // Minimum 100 iterations as per requirement
      );
    });

    it('should specifically match "A. REID" with "Alastair REID"', async () => {
      // Test the specific example from requirements
      const matches1 = nameMatchingService.matchesVariation('A. REID', 'Alastair REID');
      expect(matches1).toBe(true);

      const matches2 = nameMatchingService.matchesVariation('Alastair REID', 'A. REID');
      expect(matches2).toBe(true);

      // Test with different cases
      const matches3 = nameMatchingService.matchesVariation('a. reid', 'ALASTAIR REID');
      expect(matches3).toBe(true);

      const matches4 = nameMatchingService.matchesVariation('A. Reid', 'alastair reid');
      expect(matches4).toBe(true);
    });

    it('should match initial variations with case insensitivity', async () => {
      // Arbitrary for generating name pairs with various case combinations
      const caseVariationArbitrary = fc.tuple(
        fc.constantFrom('Alice', 'Bob', 'Charlie', 'David', 'Emma', 'Frank', 'Grace', 'Henry'),
        fc.string({ minLength: 1, maxLength: 20 })
          .map(s => s.replace(/[",\n\r]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'SURNAME')
      ).chain(([firstName, surname]) => {
        const initial = firstName.charAt(0);
        const fullName = `${firstName} ${surname}`;
        const initialName = `${initial}. ${surname}`;
        
        // Generate different case variations
        return fc.tuple(
          fc.constantFrom(
            fullName,
            fullName.toLowerCase(),
            fullName.toUpperCase(),
            fullName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
          ),
          fc.constantFrom(
            initialName,
            initialName.toLowerCase(),
            initialName.toUpperCase(),
            initialName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
          )
        );
      });

      await fc.assert(
        fc.asyncProperty(caseVariationArbitrary, async ([fullName, initialName]) => {
          // Should match regardless of case
          const matches = nameMatchingService.matchesVariation(fullName, initialName);
          expect(matches).toBe(true);

          // Should be bidirectional
          const matchesReverse = nameMatchingService.matchesVariation(initialName, fullName);
          expect(matchesReverse).toBe(true);
        }),
        { numRuns: 100 } // Minimum 100 iterations as per requirement
      );
    });

    it('should not match when initials do not correspond', async () => {
      // Arbitrary for generating non-matching name pairs
      const nonMatchingPairArbitrary = fc.tuple(
        fc.constantFrom('Alice', 'Bob', 'Charlie', 'David', 'Emma', 'Frank', 'Grace', 'Henry'),
        fc.constantFrom('Alice', 'Bob', 'Charlie', 'David', 'Emma', 'Frank', 'Grace', 'Henry'),
        fc.string({ minLength: 1, maxLength: 20 })
          .map(s => s.replace(/[",\n\r]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'SURNAME')
      )
        .filter(([name1, name2]) => name1.charAt(0) !== name2.charAt(0)) // Different initials
        .map(([name1, name2, surname]) => {
          const initial1 = name1.charAt(0);
          const fullName = `${name2} ${surname}`;
          const initialName = `${initial1}. ${surname}`;
          return { fullName, initialName };
        });

      await fc.assert(
        fc.asyncProperty(nonMatchingPairArbitrary, async ({ fullName, initialName }) => {
          // Should NOT match when initials don't correspond
          const matches = nameMatchingService.matchesVariation(fullName, initialName);
          expect(matches).toBe(false);

          // Should be bidirectional (both should be false)
          const matchesReverse = nameMatchingService.matchesVariation(initialName, fullName);
          expect(matchesReverse).toBe(false);
        }),
        { numRuns: 100 } // Minimum 100 iterations as per requirement
      );
    });

    it('should not match when surnames differ', async () => {
      // Arbitrary for generating pairs with same initial but different surnames
      const differentSurnameArbitrary = fc.tuple(
        fc.constantFrom('Alice', 'Bob', 'Charlie', 'David', 'Emma', 'Frank', 'Grace', 'Henry'),
        fc.string({ minLength: 1, maxLength: 20 })
          .map(s => s.replace(/[",\n\r]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'SURNAME1'),
        fc.string({ minLength: 1, maxLength: 20 })
          .map(s => s.replace(/[",\n\r]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'SURNAME2')
      )
        .filter(([_, surname1, surname2]) => surname1.toUpperCase() !== surname2.toUpperCase())
        .map(([firstName, surname1, surname2]) => {
          const initial = firstName.charAt(0);
          const fullName = `${firstName} ${surname1}`;
          const initialName = `${initial}. ${surname2}`;
          return { fullName, initialName };
        });

      await fc.assert(
        fc.asyncProperty(differentSurnameArbitrary, async ({ fullName, initialName }) => {
          // Should NOT match when surnames differ
          const matches = nameMatchingService.matchesVariation(fullName, initialName);
          expect(matches).toBe(false);

          // Should be bidirectional (both should be false)
          const matchesReverse = nameMatchingService.matchesVariation(initialName, fullName);
          expect(matchesReverse).toBe(false);
        }),
        { numRuns: 100 } // Minimum 100 iterations as per requirement
      );
    });

    it('should handle whitespace variations in initial + surname matching', async () => {
      // Arbitrary for generating name pairs with various whitespace patterns
      const whitespaceVariationArbitrary = fc.tuple(
        fc.constantFrom('Alice', 'Bob', 'Charlie', 'David', 'Emma', 'Frank', 'Grace', 'Henry'),
        fc.string({ minLength: 1, maxLength: 20 })
          .map(s => s.replace(/[",\n\r]/g, ''))
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() || 'SURNAME'),
        fc.integer({ min: 1, max: 5 }) // number of spaces
      ).map(([firstName, surname, spaces]) => {
        const initial = firstName.charAt(0);
        const spacer = ' '.repeat(spaces);
        
        return {
          fullName: `${firstName}${spacer}${surname}`,
          initialName: `${initial}.${spacer}${surname}`,
          fullNameWithLeading: ` ${firstName} ${surname}`,
          initialNameWithTrailing: `${initial}. ${surname} `,
        };
      });

      await fc.assert(
        fc.asyncProperty(whitespaceVariationArbitrary, async (variations) => {
          // All variations should match after normalization
          expect(nameMatchingService.matchesVariation(variations.fullName, variations.initialName)).toBe(true);
          expect(nameMatchingService.matchesVariation(variations.fullNameWithLeading, variations.initialName)).toBe(true);
          expect(nameMatchingService.matchesVariation(variations.fullName, variations.initialNameWithTrailing)).toBe(true);
          expect(nameMatchingService.matchesVariation(variations.fullNameWithLeading, variations.initialNameWithTrailing)).toBe(true);
        }),
        { numRuns: 100 } // Minimum 100 iterations as per requirement
      );
    });
  });
});
