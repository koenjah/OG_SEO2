import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// DataForSEO API credentials
const username = process.env.DATAFORSEO_LOGIN;
const password = process.env.DATAFORSEO_PASSWORD;

// Function to clean domain format
function cleanDomain(domain) {
  return domain.replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase();
}

/**
 * Get competitors for a domain
 * @param {string} domain - The domain to analyze
 * @param {string} outputDir - Directory to save output files
 * @returns {Object} Competitors data
 */
export async function getCompetitors(domain, outputDir) {
  try {
    const cleanedDomain = cleanDomain(domain);
    console.log(`Getting competitors for ${cleanedDomain}...`);
    
    // Make API request to DataForSEO
    const response = await axios.post(
      'https://api.dataforseo.com/v3/dataforseo_labs/google/competitors_domain/live',
      [{
        target: cleanedDomain,
        language_name: "Dutch",
        location_name: "Netherlands",
        limit: 20
      }],
      {
        auth: {
          username: username,
          password: password
        }
      }
    );
    
    // Save raw response
    fs.writeFileSync(
      path.join(outputDir, 'competitors_raw.json'),
      JSON.stringify(response.data, null, 2)
    );
    
    // Process the data
    const competitorsData = {
      domain: cleanedDomain,
      competitors: []
    };
    
    if (response.data?.tasks?.[0]?.result?.[0]?.items) {
      const items = response.data.tasks[0].result[0].items;
      
      // Get target domain metrics for relative comparison
      const targetMetrics = {
        keywordCount: 0,
        traffic: 0,
        trafficCost: 0
      };
      
      // Find target domain in the results to get its metrics
      const targetItem = items.find(item => cleanDomain(item.domain) === cleanedDomain);
      if (targetItem) {
        targetMetrics.keywordCount = targetItem.metrics.organic.count || 0;
        targetMetrics.traffic = targetItem.metrics.organic.etv || 0;
        targetMetrics.trafficCost = targetItem.metrics.organic.etv_cost || 0;
      }
      
      // Process competitors
      competitorsData.competitors = items
        // Filter out the target domain itself
        .filter(item => cleanDomain(item.domain) !== cleanedDomain)
        // Filter out competitors with significantly more keywords (5x) than the target
        // This helps exclude very large sites like wikipedia, etc.
        .filter(item => {
          if (targetMetrics.keywordCount === 0) return true;
          return (item.metrics.organic.count || 0) <= targetMetrics.keywordCount * 5;
        })
        // Map to our data structure
        .map(item => ({
          domain: cleanDomain(item.domain),
          keywordCount: item.metrics.organic.count || 0,
          traffic: item.metrics.organic.etv || 0,
          trafficCost: item.metrics.organic.etv_cost || 0,
          averagePosition: item.metrics.organic.pos_average || 0,
          top10Percentage: ((item.metrics.organic.pos_1_3 || 0) + (item.metrics.organic.pos_4_10 || 0)) / 
                          (item.metrics.organic.count || 1) * 100,
          keywordOverlap: item.competitor_metrics?.organic?.intersections || 0,
          keywordGap: (item.metrics.organic.count || 0) - (item.competitor_metrics?.organic?.intersections || 0),
          relevanceScore: calculateRelevanceScore(item, targetMetrics)
        }))
        // Sort by relevance score
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        // Take top 10
        .slice(0, 10);
    }
    
    // Save processed data
    fs.writeFileSync(
      path.join(outputDir, 'competitors.json'),
      JSON.stringify(competitorsData, null, 2)
    );
    
    return competitorsData;
  } catch (error) {
    console.error('Error getting competitors:', error.message);
    
    // Return empty data if API fails
    const emptyData = {
      domain: cleanDomain(domain),
      competitors: [],
      error: error.message
    };
    
    // Save empty data
    fs.writeFileSync(
      path.join(outputDir, 'competitors.json'),
      JSON.stringify(emptyData, null, 2)
    );
    
    return emptyData;
  }
}

/**
 * Calculate relevance score for a competitor
 * Higher score = more relevant competitor
 * @param {Object} competitor - Competitor data from API
 * @param {Object} targetMetrics - Target domain metrics
 * @returns {number} Relevance score (0-100)
 */
function calculateRelevanceScore(competitor, targetMetrics) {
  // If target metrics are all zero, we can't calculate relative scores
  if (targetMetrics.keywordCount === 0 && targetMetrics.traffic === 0 && targetMetrics.trafficCost === 0) {
    return 50; // Default middle score
  }
  
  // Calculate relative metrics (how close competitor is to target)
  const keywordRatio = targetMetrics.keywordCount === 0 ? 1 : 
    Math.min(competitor.metrics.organic.count / targetMetrics.keywordCount, 
             targetMetrics.keywordCount / competitor.metrics.organic.count);
  
  const trafficRatio = targetMetrics.traffic === 0 ? 1 : 
    Math.min(competitor.metrics.organic.etv / targetMetrics.traffic, 
             targetMetrics.traffic / competitor.metrics.organic.etv);
  
  const costRatio = targetMetrics.trafficCost === 0 ? 1 : 
    Math.min(competitor.metrics.organic.etv_cost / targetMetrics.trafficCost, 
             targetMetrics.trafficCost / competitor.metrics.organic.etv_cost);
  
  // Calculate overlap percentage
  const overlapPercentage = competitor.metrics.organic.count === 0 ? 0 :
    (competitor.competitor_metrics?.organic?.intersections || 0) / competitor.metrics.organic.count;
  
  // Weight factors
  const keywordWeight = 0.25;
  const trafficWeight = 0.25;
  const costWeight = 0.2;
  const overlapWeight = 0.3;
  
  // Calculate final score (0-100)
  const score = (
    (keywordRatio * keywordWeight) +
    (trafficRatio * trafficWeight) +
    (costRatio * costWeight) +
    (overlapPercentage * overlapWeight)
  ) * 100;
  
  return Math.round(score);
}
