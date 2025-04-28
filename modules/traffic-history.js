import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { normalizeNumber } from '../utils/number-formatter.js';

// Load environment variables
dotenv.config();

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DataForSEO API credentials - use VITE_ prefixed variables for compatibility with original scripts
const username = process.env.VITE_DATAFORSEO_LOGIN || process.env.DATAFORSEO_LOGIN;
const password = process.env.VITE_DATAFORSEO_PASSWORD || process.env.DATAFORSEO_PASSWORD;

// Function to clean domain format
function cleanDomain(domain) {
  return domain.replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase();
}

/**
 * Analyze traffic history for a domain
 * @param {string} domain - The domain to analyze
 * @param {string} outputDir - Directory to save output files
 * @returns {Object} Traffic history data
 */
export async function analyzeTrafficHistory(domain, outputDir) {
  try {
    const cleanedDomain = cleanDomain(domain);
    console.log(`Analyzing traffic history for ${cleanedDomain}...`);
    
    // Get current date and date 12 months ago
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Check for cached results first
    const cacheFile = path.join(outputDir, 'traffic_history.json');
    if (fs.existsSync(cacheFile)) {
      const cacheStats = fs.statSync(cacheFile);
      const cacheAge = (new Date() - cacheStats.mtime) / (1000 * 60 * 60); // Age in hours
      
      // If cache is less than 24 hours old, use it
      if (cacheAge < 24) {
        console.log('Using cached traffic history data (less than 24 hours old)');
        return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      }
    }
    
    // Make API request to DataForSEO
    const response = await axios.post(
      'https://api.dataforseo.com/v3/dataforseo_labs/google/historical_bulk_traffic_estimation/live',
      [{
        targets: [cleanedDomain],
        location_name: "Netherlands",
        language_name: "Dutch",
        date_from: startDateStr,
        date_to: endDateStr, // Add end date to limit data to exactly 12 months
        item_types: ["organic", "paid", "featured_snippet", "local_pack"]
      }],
      {
        auth: {
          username: username,
          password: password
        }
      }
    );
    
    // Save raw response for debugging
    fs.writeFileSync(
      path.join(outputDir, 'traffic_history_raw.json'),
      JSON.stringify(response.data, null, 2)
    );
    
    // Check both global and task-specific status codes
    if (response.data.status_code !== 20000) {
      throw new Error(`API Error: ${response.data.status_message}`);
    }
    
    const task = response.data.tasks[0];
    if (!task || task.status_code !== 20000) {
      throw new Error(`Task Error: ${task?.status_message || 'Unknown task error'}`);
    }
    
    // Process the data
    if (!task.result || !task.result[0]?.items) {
      throw new Error('No data found in API response');
    }
    
    const items = task.result[0].items;
    const targetData = items.find(item => item.target === cleanedDomain);
    
    if (!targetData || !targetData.metrics) {
      throw new Error(`No data found for domain: ${cleanedDomain}`);
    }
    
    // Extract monthly traffic data
    const monthlyData = {
      organic: targetData.metrics.organic || [],
      paid: targetData.metrics.paid || [],
      featured_snippet: targetData.metrics.featured_snippet || [],
      local_pack: targetData.metrics.local_pack || []
    };
    
    // Process data for the report
    const months = [];
    const organicTraffic = [];
    const paidTraffic = [];
    
    // First, ensure the data is sorted by date (newest first, which is how the API returns it)
    const sortedOrganic = [...monthlyData.organic].sort((a, b) => {
      return new Date(`${b.year}-${b.month}-01`) - new Date(`${a.year}-${a.month}-01`);
    });
    
    const sortedPaid = [...monthlyData.paid].sort((a, b) => {
      return new Date(`${b.year}-${b.month}-01`) - new Date(`${a.year}-${a.month}-01`);
    });
    
    // Then reverse the arrays to get oldest first (left to right)
    const oldestFirstOrganic = [...sortedOrganic].reverse();
    const oldestFirstPaid = [...sortedPaid].reverse();
    
    // Extract data for charts - oldest first (left to right)
    oldestFirstOrganic.forEach(item => {
      const monthName = new Date(`${item.year}-${item.month}-01`).toLocaleDateString('nl-NL', { month: 'short', year: '2-digit' });
      months.push(monthName);
      organicTraffic.push(normalizeNumber(item.etv, 0));
    });
    
    oldestFirstPaid.forEach((item, index) => {
      paidTraffic[index] = normalizeNumber(item.etv, 0);
    });
    
    // Calculate statistics
    const organicTotal = organicTraffic.reduce((sum, val) => sum + val, 0);
    const organicAvg = organicTraffic.length ? organicTotal / organicTraffic.length : 0;
    
    // Find highest and lowest traffic months
    let highestTraffic = 0;
    let highestMonth = '';
    let lowestTraffic = Infinity;
    let lowestMonth = '';
    
    oldestFirstOrganic.forEach(item => {
      const monthName = new Date(`${item.year}-${item.month}-01`).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
      const traffic = normalizeNumber(item.etv, 0);
      
      if (traffic > highestTraffic) {
        highestTraffic = traffic;
        highestMonth = monthName;
      }
      if (traffic < lowestTraffic && traffic > 0) { // Avoid zero values for lowest if possible
        lowestTraffic = traffic;
        lowestMonth = monthName;
      }
    });
    
    // If lowestTraffic is still Infinity, set it to 0
    if (lowestTraffic === Infinity) {
      lowestTraffic = 0;
      lowestMonth = oldestFirstOrganic.length > 0 ? 
        new Date(`${oldestFirstOrganic[0].year}-${oldestFirstOrganic[0].month}-01`).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' }) : 
        'N/A';
    }
    
    // Prepare report data
    const trafficData = {
      domain: cleanedDomain,
      months: months,
      organicTraffic: organicTraffic,
      paidTraffic: paidTraffic,
      averageTraffic: normalizeNumber(organicAvg, 0),
      highestTraffic: normalizeNumber(highestTraffic, 0),
      highestMonth,
      lowestTraffic: normalizeNumber(lowestTraffic, 0),
      lowestMonth,
      rawData: monthlyData
    };
    
    // Save processed data
    fs.writeFileSync(
      path.join(outputDir, 'traffic_history.json'),
      JSON.stringify(trafficData, null, 2)
    );
    
    return trafficData;
    
  } catch (error) {
    console.error('Error analyzing traffic history:', error.message);
    
    // Create fallback data if API fails
    const fallbackData = {
      domain: cleanDomain(domain),
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      organicTraffic: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      paidTraffic: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      averageTraffic: 0,
      highestTraffic: 0,
      highestMonth: 'N/A',
      lowestTraffic: 0,
      lowestMonth: 'N/A',
      error: error.message
    };
    
    // Save error information
    fs.writeFileSync(
      path.join(outputDir, 'traffic_history_error.json'),
      JSON.stringify({ error: error.message, timestamp: new Date().toISOString() }, null, 2)
    );
    
    return fallbackData;
  }
}
