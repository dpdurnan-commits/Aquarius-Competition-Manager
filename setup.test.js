/**
 * Setup verification tests
 * Ensures testing framework and dependencies are properly configured
 */

import { describe, test, expect } from '@jest/globals';
import fc from 'fast-check';

describe('Testing Framework Setup', () => {
  test('Jest is working correctly', () => {
    expect(true).toBe(true);
  });

  test('fast-check is available', () => {
    expect(fc).toBeDefined();
    expect(typeof fc.assert).toBe('function');
    expect(typeof fc.property).toBe('function');
  });

  test('fast-check can run a simple property test', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return n + 0 === n;
      }),
      { numRuns: 100 }
    );
  });
});

describe('Browser APIs (jsdom)', () => {
  test('document is available', () => {
    expect(document).toBeDefined();
  });

  test('can create DOM elements', () => {
    const div = document.createElement('div');
    expect(div).toBeDefined();
    expect(div.tagName).toBe('DIV');
  });

  test('FileReader is available', () => {
    expect(FileReader).toBeDefined();
  });

  test('Blob is available', () => {
    expect(Blob).toBeDefined();
  });
});
