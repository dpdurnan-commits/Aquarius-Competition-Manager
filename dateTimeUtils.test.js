/**
 * Unit tests for Date/Time Utility Functions
 */

import { describe, it, expect } from '@jest/globals';
import { parseDateTime, formatDateTime, compareDateTimes } from './dateTimeUtils.js';

describe('dateTimeUtils', () => {
  describe('parseDateTime', () => {
    it('should parse DD/MM/YYYY date format with HH:MM:SS time', () => {
      const timestamp = parseDateTime('15/03/2024', '14:30:45');
      const date = new Date(timestamp);
      
      expect(date.getDate()).toBe(15);
      expect(date.getMonth()).toBe(2); // March is month 2 (0-indexed)
      expect(date.getFullYear()).toBe(2024);
      expect(date.getHours()).toBe(14);
      expect(date.getMinutes()).toBe(30);
      expect(date.getSeconds()).toBe(45);
    });

    it('should parse DD/MM/YYYY date format with HH:MM time', () => {
      const timestamp = parseDateTime('01/01/2024', '09:15');
      const date = new Date(timestamp);
      
      expect(date.getDate()).toBe(1);
      expect(date.getMonth()).toBe(0); // January
      expect(date.getFullYear()).toBe(2024);
      expect(date.getHours()).toBe(9);
      expect(date.getMinutes()).toBe(15);
      expect(date.getSeconds()).toBe(0);
    });

    it('should parse YYYY-MM-DD date format', () => {
      const timestamp = parseDateTime('2024-03-15', '14:30:45');
      const date = new Date(timestamp);
      
      expect(date.getDate()).toBe(15);
      expect(date.getMonth()).toBe(2);
      expect(date.getFullYear()).toBe(2024);
    });

    it('should parse DD-MM-YYYY date format', () => {
      const timestamp = parseDateTime('15-03-2024', '14:30:45');
      const date = new Date(timestamp);
      
      expect(date.getDate()).toBe(15);
      expect(date.getMonth()).toBe(2);
      expect(date.getFullYear()).toBe(2024);
    });

    it('should throw error for invalid date format', () => {
      expect(() => parseDateTime('invalid', '14:30:45')).toThrow('Invalid date format');
    });

    it('should throw error for invalid time format', () => {
      expect(() => parseDateTime('15/03/2024', 'invalid')).toThrow('Invalid time format');
    });

    it('should throw error for missing date', () => {
      expect(() => parseDateTime('', '14:30:45')).toThrow('Date and time are required');
    });

    it('should throw error for missing time', () => {
      expect(() => parseDateTime('15/03/2024', '')).toThrow('Date and time are required');
    });

    it('should handle single-digit hours and minutes', () => {
      const timestamp = parseDateTime('15/03/2024', '9:5:3');
      const date = new Date(timestamp);
      
      expect(date.getHours()).toBe(9);
      expect(date.getMinutes()).toBe(5);
      expect(date.getSeconds()).toBe(3);
    });
  });

  describe('formatDateTime', () => {
    it('should format timestamp as DD/MM/YYYY HH:MM:SS', () => {
      const date = new Date(2024, 2, 15, 14, 30, 45); // March 15, 2024 14:30:45
      const formatted = formatDateTime(date.getTime());
      
      expect(formatted).toBe('15/03/2024 14:30:45');
    });

    it('should pad single-digit values with zeros', () => {
      const date = new Date(2024, 0, 5, 9, 5, 3); // January 5, 2024 09:05:03
      const formatted = formatDateTime(date.getTime());
      
      expect(formatted).toBe('05/01/2024 09:05:03');
    });
  });

  describe('compareDateTimes', () => {
    it('should return negative when first date/time is earlier', () => {
      const result = compareDateTimes('15/03/2024', '10:00:00', '15/03/2024', '11:00:00');
      expect(result).toBeLessThan(0);
    });

    it('should return positive when first date/time is later', () => {
      const result = compareDateTimes('16/03/2024', '10:00:00', '15/03/2024', '10:00:00');
      expect(result).toBeGreaterThan(0);
    });

    it('should return zero when date/times are equal', () => {
      const result = compareDateTimes('15/03/2024', '10:00:00', '15/03/2024', '10:00:00');
      expect(result).toBe(0);
    });

    it('should throw error for invalid date formats', () => {
      expect(() => compareDateTimes('invalid', '10:00:00', '15/03/2024', '10:00:00'))
        .toThrow('Failed to compare date/times');
    });
  });
});
