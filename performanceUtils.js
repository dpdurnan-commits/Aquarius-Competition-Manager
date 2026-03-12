/**
 * Performance Utilities
 * Provides debouncing, throttling, and lazy loading utilities for frontend performance optimization
 * 
 * **Validates: Requirements 13.1, 13.2, 13.3, 13.4**
 */

/**
 * Debounce function - delays execution until after wait time has elapsed since last call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function - ensures function is called at most once per wait period
 * @param {Function} func - Function to throttle
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Throttled function
 */
export function throttle(func, wait = 300) {
  let inThrottle;
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, wait);
    }
  };
}

/**
 * Lazy load component - delays loading until element is visible
 * @param {HTMLElement} element - Element to observe
 * @param {Function} loadCallback - Callback to execute when element is visible
 * @param {Object} options - IntersectionObserver options
 */
export function lazyLoad(element, loadCallback, options = {}) {
  const defaultOptions = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1
  };
  
  const observerOptions = { ...defaultOptions, ...options };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadCallback();
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  observer.observe(element);
  
  return observer;
}

/**
 * Show loading indicator
 * @param {HTMLElement} container - Container element
 * @param {string} message - Loading message
 * @returns {HTMLElement} - Loading indicator element
 */
export function showLoadingIndicator(container, message = 'Loading...') {
  const loader = document.createElement('div');
  loader.className = 'loading-indicator';
  loader.innerHTML = `
    <div class="spinner"></div>
    <div class="loading-message">${message}</div>
  `;
  
  container.appendChild(loader);
  return loader;
}

/**
 * Hide loading indicator
 * @param {HTMLElement} loader - Loading indicator element
 */
export function hideLoadingIndicator(loader) {
  if (loader && loader.parentNode) {
    loader.parentNode.removeChild(loader);
  }
}

/**
 * Measure performance of a function
 * @param {string} label - Performance label
 * @param {Function} func - Function to measure
 * @returns {Promise<any>} - Function result
 */
export async function measurePerformance(label, func) {
  const startTime = performance.now();
  
  try {
    const result = await func();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
    
    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.error(`[Performance] ${label} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
}

/**
 * Batch DOM updates to minimize reflows
 * @param {Function} updateFunc - Function that performs DOM updates
 */
export function batchDOMUpdates(updateFunc) {
  requestAnimationFrame(() => {
    updateFunc();
  });
}

/**
 * Virtual scroll helper - renders only visible items
 * @param {Array} items - All items
 * @param {number} containerHeight - Container height in pixels
 * @param {number} itemHeight - Item height in pixels
 * @param {number} scrollTop - Current scroll position
 * @returns {Object} - Visible items and offsets
 */
export function getVisibleItems(items, containerHeight, itemHeight, scrollTop) {
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.ceil((scrollTop + containerHeight) / itemHeight);
  
  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;
  
  return {
    visibleItems,
    offsetY,
    startIndex,
    endIndex
  };
}

/**
 * Cache manager for API responses
 */
export class CacheManager {
  constructor(maxAge = 60000) { // Default 1 minute
    this.cache = new Map();
    this.maxAge = maxAge;
  }
  
  /**
   * Get cached value
   * @param {string} key - Cache key
   * @returns {any} - Cached value or null
   */
  get(key) {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }
    
    const now = Date.now();
    if (now - cached.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.value;
  }
  
  /**
   * Set cached value
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   */
  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }
  
  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
  }
  
  /**
   * Remove specific key
   * @param {string} key - Cache key
   */
  remove(key) {
    this.cache.delete(key);
  }
}
