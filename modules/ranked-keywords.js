import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { normalizeNumber, calculateEstimatedTraffic } from '../utils/number-formatter.js';

// Load environment variables
dotenv.config();

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DataForSEO API credentials
const username = process.env.DATAFORSEO_LOGIN;
const password = process.env.DATAFORSEO_PASSWORD;

// Debug credentials (without exposing full value)
console.log('DataForSEO credentials check:');
console.log('Login present:', !!username);
console.log('Password present:', !!password);

// Function to clean domain format
function cleanDomain(domain) {
  return domain.replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase();
}

/**
 * Get ranked keywords for a domain
 * @param {string} domain - The domain to analyze
 * @param {string} outputDir - Directory to save output files
 * @returns {Object} Ranked keywords data
 */
export async function getRankedKeywords(domain, outputDir) {
  try {
    const cleanedDomain = cleanDomain(domain);
    console.log(`Getting ranked keywords for ${cleanedDomain}...`);
    
    // Initialize default keywords data structure
    const keywordsData = {
      domain: cleanedDomain,
      totalKeywords: 0,
      topKeywords: [],
      keywordsByPosition: {
        top3: 0,
        top10: 0,
        top20: 0,
        top50: 0,
        top100: 0
      },
      totalSearchVolume: 0,
      averagePosition: 0,
      totalEstimatedTraffic: 0,
      apiStatus: 'success'
    };
    
    // Check if we have cached data
    const cachedFile = path.join(outputDir, 'ranked_keywords.json');
    const rawCachedFile = path.join(outputDir, 'ranked_keywords_raw.json');
    
    if (fs.existsSync(cachedFile)) {
      console.log('Using cached ranked keywords data...');
      try {
        const cachedData = JSON.parse(fs.readFileSync(cachedFile, 'utf8'));
        return cachedData;
      } catch (cacheError) {
        console.error('Error reading cached data:', cacheError.message);
        // Continue with API request if cache is invalid
      }
    }
    
    // Try to make API request to DataForSEO
    let response;
    try {
      response = await axios.post(
        'https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live',
        [{
          target: cleanedDomain,
          language_name: "Dutch",
          location_name: "Netherlands",
          limit: 100
        }],
        {
          auth: {
            username: username,
            password: password
          },
          timeout: 30000 // 30 second timeout
        }
      );
      
      // Save raw response regardless of content
      fs.writeFileSync(
        rawCachedFile,
        JSON.stringify(response.data, null, 2)
      );
      
    } catch (apiError) {
      console.error('API request error:', apiError.message);
      
      // Check if we have a previous raw response to use
      if (fs.existsSync(rawCachedFile)) {
        console.log('Using previously cached raw response...');
        try {
          response = { data: JSON.parse(fs.readFileSync(rawCachedFile, 'utf8')) };
        } catch (rawCacheError) {
          console.error('Error reading raw cached data:', rawCacheError.message);
          // Set API status to error
          keywordsData.apiStatus = 'error';
          keywordsData.apiErrorMessage = apiError.message;
          keywordsData.keywords = []; // Ensure keywords property exists even when there's an error
          
          // Save the error state
          fs.writeFileSync(
            cachedFile,
            JSON.stringify(keywordsData, null, 2)
          );
          
          return keywordsData;
        }
      } else {
        // No cached data available, return error state
        keywordsData.apiStatus = 'error';
        keywordsData.apiErrorMessage = apiError.message;
        keywordsData.keywords = []; // Ensure keywords property exists even when there's an error
        
        // Save the error state
        fs.writeFileSync(
          cachedFile,
          JSON.stringify(keywordsData, null, 2)
        );
        
        return keywordsData;
      }
    }
    
    // Check for API error in the response
    if (response.data?.status_code !== 20000 || 
        !response.data?.tasks || 
        !response.data.tasks[0] || 
        response.data.tasks[0].status_code !== 20000) {
      const errorMessage = response.data?.tasks?.[0]?.status_message || 'Unknown API error';
      console.error('API returned error:', errorMessage);
      
      keywordsData.apiStatus = 'error';
      keywordsData.apiErrorMessage = errorMessage;
      keywordsData.keywords = []; // Ensure keywords property exists even when there's an error
      
      // Save the error state
      fs.writeFileSync(
        cachedFile,
        JSON.stringify(keywordsData, null, 2)
      );
      
      return keywordsData;
    }
    
    // Process the data if available
    const result = response.data.tasks[0].result?.[0];
    if (result && result.items && result.items.length > 0) {
      const items = result.items;
      
      // Process items to extract the required properties
      const keywords = items.map(item => {
        const keyword = item.keyword_data?.keyword || '';
        const position = normalizeNumber(item.ranked_serp_element?.serp_item?.rank_absolute, 0);
        const searchVolume = normalizeNumber(item.keyword_data?.keyword_info?.search_volume, 0);
        const cpc = normalizeNumber(item.keyword_data?.keyword_info?.cpc, 0);
        const competition = normalizeNumber(item.keyword_data?.keyword_info?.competition, 0);
        const url = item.ranked_serp_element?.serp_item?.url || '';
        
        // Calculate estimated traffic based on position and search volume
        const estimatedTraffic = calculateEstimatedTraffic(searchVolume, position);
        
        // Determine search intent based on keyword
        let intent = 'informational';
        if (keyword.includes('buy') || keyword.includes('price') || keyword.includes('cost') || 
            keyword.includes('kopen') || keyword.includes('prijs') || keyword.includes('kosten')) {
          intent = 'transactional';
        } else if (keyword.includes('vs') || keyword.includes('compare') || keyword.includes('best') || 
                  keyword.includes('vergelijken') || keyword.includes('beste')) {
          intent = 'commercial';
        } else if (keyword.includes('how') || keyword.includes('what') || keyword.includes('why') || 
                  keyword.includes('hoe') || keyword.includes('wat') || keyword.includes('waarom')) {
          intent = 'informational';
        }
        
        return {
          keyword,
          position,
          searchVolume,
          cpc,
          competition,
          estimatedTraffic,
          url,
          intent
        };
      });
      
      keywordsData.totalKeywords = keywords.length;
      
      // Calculate position distribution
      keywords.forEach(item => {
        if (item.position <= 3) keywordsData.keywordsByPosition.top3++;
        if (item.position <= 10) keywordsData.keywordsByPosition.top10++;
        if (item.position <= 20) keywordsData.keywordsByPosition.top20++;
        if (item.position <= 50) keywordsData.keywordsByPosition.top50++;
        if (item.position <= 100) keywordsData.keywordsByPosition.top100++;
        
        keywordsData.totalSearchVolume += item.searchVolume || 0;
        keywordsData.averagePosition += item.position || 0;
        
        keywordsData.totalEstimatedTraffic += item.estimatedTraffic;
      });
      
      // Calculate average position
      if (keywordsData.totalKeywords > 0) {
        keywordsData.averagePosition = keywordsData.averagePosition / keywordsData.totalKeywords;
      }
      
      // Get top keywords by search volume
      keywordsData.topKeywords = keywords
        .sort((a, b) => (b.searchVolume || 0) - (a.searchVolume || 0))
        .slice(0, 20)
        .map(item => ({
          keyword: item.keyword,
          position: item.position,
          searchVolume: item.searchVolume,
          cpc: item.cpc,
          competition: item.competition,
          estimatedTraffic: item.estimatedTraffic,
          url: item.url,
          intent: item.intent
        }));
        
      // Add keywords property with snake_case property names for the template
      keywordsData.keywords = keywordsData.topKeywords.map(item => ({
        keyword: item.keyword,
        position: item.position,
        search_volume: normalizeNumber(item.searchVolume),
        estimated_traffic: normalizeNumber(item.estimatedTraffic),
        cpc: normalizeNumber(item.cpc)
      }));
      
      // Sort keywords by estimated traffic for AI insights
      keywordsData.keywordsByTraffic = [...keywordsData.topKeywords]
        .sort((a, b) => (b.estimatedTraffic || 0) - (a.estimatedTraffic || 0))
        .slice(0, 30)
        .map(item => ({
          keyword: item.keyword,
          position: item.position,
          estimatedTraffic: Math.round(item.estimatedTraffic || 0)
        }));
    } else {
      // API returned a result but no items
      console.log('API returned no items for the domain.');
      keywordsData.apiStatus = 'no_data';
      keywordsData.apiMessage = 'No keyword data found for this domain.';
      keywordsData.keywords = []; // Ensure keywords property exists even when no data
    }
    
    // Save processed data
    fs.writeFileSync(
      cachedFile,
      JSON.stringify(keywordsData, null, 2)
    );
    
    return keywordsData;
  } catch (error) {
    console.error('Error getting ranked keywords:', error.message);
    
    // Return a basic error structure
    const errorData = {
      domain: cleanDomain(domain),
      totalKeywords: 0,
      topKeywords: [],
      keywordsByPosition: {
        top3: 0, top10: 0, top20: 0, top50: 0, top100: 0
      },
      totalSearchVolume: 0,
      averagePosition: 0,
      totalEstimatedTraffic: 0,
      apiStatus: 'error',
      apiErrorMessage: error.message,
      keywords: [] // Ensure keywords property exists in error state
    };
    
    // Try to save the error state
    try {
      fs.writeFileSync(
        path.join(outputDir, 'ranked_keywords.json'),
        JSON.stringify(errorData, null, 2)
      );
    } catch (fsError) {
      console.error('Error saving error state:', fsError.message);
    }
    
    return errorData;
  }
}
