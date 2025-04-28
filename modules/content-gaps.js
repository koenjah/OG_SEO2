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
 * Analyze content gaps between target domain and competitors
 * @param {string} domain - The target domain
 * @param {Array<string>} competitors - List of competitor domains
 * @param {string} outputDir - Directory to save output files
 * @returns {Object} Content gaps data
 */
export async function analyzeContentGaps(domain, competitors, outputDir) {
  try {
    const cleanedDomain = cleanDomain(domain);
    console.log(`Analyzing content gaps for ${cleanedDomain}...`);
    
    // Initialize content gaps data
    const contentGapsData = {
      domain: cleanedDomain,
      competitors: competitors.map(c => cleanDomain(c)),
      totalGaps: 0,
      gapsByCompetitor: {},
      topGaps: []
    };
    
    // Check for cached results first
    const cacheFile = path.join(outputDir, 'content_gaps.json');
    if (fs.existsSync(cacheFile)) {
      const cacheStats = fs.statSync(cacheFile);
      const cacheAge = (new Date() - cacheStats.mtime) / (1000 * 60 * 60); // Age in hours
      
      // If cache is less than 24 hours old, use it
      if (cacheAge < 24) {
        console.log('Using cached content gaps data (less than 24 hours old)');
        return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      }
    }
    
    // Process each competitor
    for (const competitor of competitors) {
      const cleanedCompetitor = cleanDomain(competitor);
      console.log(`Analyzing content gaps with competitor: ${cleanedCompetitor}`);
      
      try {
        // Make API request to DataForSEO
        const response = await axios.post(
          'https://api.dataforseo.com/v3/dataforseo_labs/google/domain_intersection/live',
          [{
            target1: cleanedCompetitor,
            target2: cleanedDomain,
            language_name: "Dutch",
            location_name: "Netherlands",
            intersections: false, // false = keywords competitor ranks for but target doesn't
            limit: 50, // Reduced from 1000 to 50 to save API costs
            filters: [
              ["target1_metrics.search_volume", ">=", 50], // Only keywords with decent search volume
              ["target1_metrics.position", "<=", 20]       // Only keywords where competitor ranks well
            ]
          }],
          {
            auth: {
              username: username,
              password: password
            }
          }
        );
        
        // Save raw response for this competitor
        fs.writeFileSync(
          path.join(outputDir, `content_gaps_${cleanedCompetitor}_raw.json`),
          JSON.stringify(response.data, null, 2)
        );
        
        // Process the gaps
        if (response.data?.tasks?.[0]?.result?.[0]?.items) {
          const items = response.data.tasks[0].result[0].items;
          
          // Store gaps for this competitor
          contentGapsData.gapsByCompetitor[cleanedCompetitor] = {
            count: items.length,
            keywords: items.map(item => ({
              keyword: item.keyword,
              searchVolume: item.target1_metrics.search_volume || 0,
              keywordDifficulty: item.target1_metrics.keyword_difficulty || 0,
              competitorPosition: item.target1_metrics.position || 0,
              cpc: item.target1_metrics.cpc || 0,
              intent: item.target1_metrics.keyword_intent || 'unknown'
            }))
          };
          
          // Add to total gaps count
          contentGapsData.totalGaps += items.length;
          
          // Add to top gaps list (will be sorted and filtered later)
          contentGapsData.topGaps.push(...items.map(item => ({
            keyword: item.keyword,
            searchVolume: item.target1_metrics.search_volume || 0,
            keywordDifficulty: item.target1_metrics.keyword_difficulty || 0,
            competitorPosition: item.target1_metrics.position || 0,
            competitor: cleanedCompetitor,
            cpc: item.target1_metrics.cpc || 0,
            intent: item.target1_metrics.keyword_intent || 'unknown'
          })));
        }
        
        // Add a delay to avoid hitting API rate limits
        await new Promise(resolve => setTimeout(resolve, 500)); // Increased from 300ms to 500ms
        
      } catch (error) {
        console.error(`Error analyzing content gaps with competitor ${cleanedCompetitor}:`, error.message);
        
        // Check if we hit API usage limit
        if (error.response?.status === 402) {
          console.error('API usage limit reached. Skipping remaining competitors.');
          
          // Store error for this competitor
          contentGapsData.gapsByCompetitor[cleanedCompetitor] = {
            count: 0,
            keywords: [],
            error: 'API usage limit reached'
          };
          
          // Break the loop to stop processing more competitors
          break;
        } else {
          // Try fallback to keyword_ideas API if domain_intersection fails
          try {
            console.log(`Trying fallback method for ${cleanedCompetitor}...`);
            
            // Get keywords for competitor using keyword_ideas
            const fallbackResponse = await axios.post(
              'https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_ideas/live',
              [{
                keywords: [cleanedCompetitor], // Use competitor domain as seed keyword
                language_name: "Dutch",
                location_name: "Netherlands",
                limit: 50
              }],
              {
                auth: {
                  username: username,
                  password: password
                }
              }
            );
            
            // Save fallback response
            fs.writeFileSync(
              path.join(outputDir, `content_gaps_fallback_${cleanedCompetitor}_raw.json`),
              JSON.stringify(fallbackResponse.data, null, 2)
            );
            
            // Process fallback results
            if (fallbackResponse.data?.tasks?.[0]?.result?.[0]?.items) {
              const fallbackItems = fallbackResponse.data.tasks[0].result[0].items;
              
              // Store gaps for this competitor
              contentGapsData.gapsByCompetitor[cleanedCompetitor] = {
                count: fallbackItems.length,
                keywords: fallbackItems.map(item => ({
                  keyword: item.keyword,
                  searchVolume: item.search_volume || 0,
                  keywordDifficulty: item.keyword_difficulty || 0,
                  competitorPosition: 0, // Not available in fallback
                  cpc: item.cpc || 0,
                  intent: item.keyword_intent || 'unknown'
                })),
                note: 'Using fallback method (keyword ideas)'
              };
              
              // Add to total gaps count
              contentGapsData.totalGaps += fallbackItems.length;
              
              // Add to top gaps list
              contentGapsData.topGaps.push(...fallbackItems.map(item => ({
                keyword: item.keyword,
                searchVolume: item.search_volume || 0,
                keywordDifficulty: item.keyword_difficulty || 0,
                competitorPosition: 0, // Not available in fallback
                competitor: cleanedCompetitor,
                cpc: item.cpc || 0,
                intent: item.keyword_intent || 'unknown',
                note: 'Fallback method'
              })));
            }
          } catch (fallbackError) {
            // Store error for this competitor
            contentGapsData.gapsByCompetitor[cleanedCompetitor] = {
              count: 0,
              keywords: [],
              error: error.message,
              fallbackError: fallbackError.message
            };
          }
        }
      }
    }
    
    // Sort and filter top gaps
    contentGapsData.topGaps = contentGapsData.topGaps
      // Remove duplicates (same keyword from different competitors)
      .filter((gap, index, self) => 
        index === self.findIndex(g => g.keyword === gap.keyword)
      )
      // Sort by search volume (highest first)
      .sort((a, b) => b.searchVolume - a.searchVolume)
      // Take top 50
      .slice(0, 50);
    
    // Save processed data
    fs.writeFileSync(
      path.join(outputDir, 'content_gaps.json'),
      JSON.stringify(contentGapsData, null, 2)
    );
    
    return contentGapsData;
  } catch (error) {
    console.error('Error analyzing content gaps:', error.message);
    
    // Return empty data if API fails
    const emptyData = {
      domain: cleanDomain(domain),
      competitors: competitors.map(c => cleanDomain(c)),
      totalGaps: 0,
      gapsByCompetitor: {},
      topGaps: [],
      error: error.message
    };
    
    // Save empty data
    fs.writeFileSync(
      path.join(outputDir, 'content_gaps.json'),
      JSON.stringify(emptyData, null, 2)
    );
    
    return emptyData;
  }
}
