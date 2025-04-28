/**
 * Handlebars helper functions
 */

import { marked } from 'marked';
import Handlebars from 'handlebars';

export const helpers = {
  // Format date
  formatDate: function(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },
  
  // Format number with thousand separators in Dutch style (no decimals)
  formatNumber: function(number) {
    if (number === undefined || number === null || isNaN(number)) return '0';
    
    // Convert to number if it's a string
    if (typeof number === 'string') {
      number = parseFloat(number.replace(',', '.'));
    }
    
    // Ensure the number is properly rounded and formatted with Dutch locale
    // Dutch uses dot as thousand separator and comma as decimal separator
    return Math.round(number).toLocaleString('nl-NL', {
      maximumFractionDigits: 0,
      useGrouping: true
    });
  },
  
  // Format decimal number in Dutch style (2 decimal places)
  formatDecimal: function(number) {
    if (number === undefined || number === null || isNaN(number)) return '0,00';
    
    // Convert to number if it's a string
    if (typeof number === 'string') {
      number = parseFloat(number.replace(',', '.'));
    }
    
    // Format with Dutch locale (2 decimal places)
    return number.toLocaleString('nl-NL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    });
  },
  
  // Format percentage in Dutch style (1 decimal place)
  formatPercent: function(number) {
    if (number === undefined || number === null || isNaN(number)) return '0,0%';
    
    // Convert to number if it's a string
    if (typeof number === 'string') {
      number = parseFloat(number.replace(',', '.'));
    }
    
    // Format with Dutch locale (1 decimal place)
    return number.toLocaleString('nl-NL', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
  },
  
  // Multiply a value by another (used for percentage conversions)
  multiply: function(value, multiplier) {
    if (typeof value !== 'number' || typeof multiplier !== 'number') return 0;
    return value * multiplier;
  },
  
  // Get CSS class for score
  getScoreClass: function(score) {
    if (score === null || score === undefined) return '';
    
    score = parseInt(score, 10);
    
    if (score >= 90) return 'bg-success';
    if (score >= 70) return 'bg-warning';
    return 'bg-danger';
  },
  
  
  // Get brand-specific class for authority metrics
  getAuthorityClass: function(metricType) {
    switch(metricType) {
      case 'moz-da': return 'moz-domain-authority';
      case 'moz-pa': return 'moz-page-authority';
      case 'majestic-tf': return 'majestic-trust-flow';
      case 'majestic-cf': return 'majestic-citation-flow';
      default: return '';
    }
  },

  // Convert object to JSON string for use in JavaScript
  json: function(context) {
    return JSON.stringify(context);
  },
  
  // Render markdown content as HTML
  markdown: function(content) {
    if (!content) return '';
    return new Handlebars.SafeString(marked.parse(content));
  },
  
  // Get CSS class for lighthouse metrics based on their values
  getMetricClass: function(metricValue) {
    if (!metricValue) return '';
    
    // Extract numeric value from string (e.g., "7.9 s" -> 7.9)
    const extractValue = (str) => {
      const match = String(str).match(/(\d+\.?\d*)/);
      return match ? parseFloat(match[1]) : 0;
    };
    
    const value = extractValue(metricValue);
    
    // Different metrics have different thresholds
    if (metricValue.includes('FCP') || metricValue.includes('Paint')) {
      // First Contentful Paint thresholds
      if (value <= 2) return 'text-success';
      if (value <= 4) return 'text-warning';
      return 'text-danger';
    } else if (metricValue.includes('LCP') || metricValue.includes('Largest')) {
      // Largest Contentful Paint thresholds
      if (value <= 2.5) return 'text-success';
      if (value <= 4) return 'text-warning';
      return 'text-danger';
    } else if (metricValue.includes('CLS') || metricValue.includes('Layout')) {
      // Cumulative Layout Shift thresholds
      if (value <= 0.1) return 'text-success';
      if (value <= 0.25) return 'text-warning';
      return 'text-danger';
    } else if (metricValue.includes('TBT') || metricValue.includes('Blocking')) {
      // Total Blocking Time thresholds (in ms)
      if (value <= 200) return 'text-success';
      if (value <= 600) return 'text-warning';
      return 'text-danger';
    } else if (metricValue.includes('TTI') || metricValue.includes('Interactive')) {
      // Time to Interactive thresholds
      if (value <= 3.8) return 'text-success';
      if (value <= 7.3) return 'text-warning';
      return 'text-danger';
    } else if (metricValue.includes('Speed') || metricValue.includes('Index')) {
      // Speed Index thresholds
      if (value <= 3.4) return 'text-success';
      if (value <= 5.8) return 'text-warning';
      return 'text-danger';
    }
    
    // Default case
    if (value <= 3) return 'text-success';
    if (value <= 6) return 'text-warning';
    return 'text-danger';
  }
};
