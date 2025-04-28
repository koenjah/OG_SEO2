import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// DomDetailer API key
const apiKey = process.env.DOMDETAILER_API_KEY;

// Function to clean domain format
function cleanDomain(domain) {
  return domain.replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase();
}

/**
 * Get domain metrics from DomDetailer API
 * @param {string} domain - The domain to analyze
 * @param {string} outputDir - Directory to save output files
 * @returns {Object} Domain metrics data
 */
export async function getDomainMetrics(domain, outputDir) {
  try {
    const cleanedDomain = cleanDomain(domain);
    console.log(`Getting domain metrics for ${cleanedDomain}...`);
    
    // Make API request to DomDetailer
    const response = await axios.get(
      `http://domdetailer.com/api/checkDomain.php`,
      {
        params: {
          app: 'MyApp',
          apikey: apiKey,
          domain: cleanedDomain,
          majesticChoice: 'root'
        }
      }
    );
    
    // Save raw response
    fs.writeFileSync(
      path.join(outputDir, 'domain_metrics_raw.json'),
      JSON.stringify(response.data, null, 2)
    );
    
    // Process the data
    const metricsData = {
      domain: cleanedDomain,
      mozDomainAuthority: 0,
      mozPageAuthority: 0,
      majesticTrustFlow: 0,
      majesticCitationFlow: 0,
      majesticTrustRatio: 0,
      backlinks: 0,
      referringDomains: 0
    };
    
    if (response.data) {
      // Extract Moz metrics
      if (response.data.mozDA !== undefined) {
        metricsData.mozDomainAuthority = Math.round(response.data.mozDA) || 0;
        metricsData.mozPageAuthority = Math.round(response.data.mozPA) || 0;
      }
      
      // Extract Majestic metrics
      if (response.data.majesticTF !== undefined) {
        metricsData.majesticTrustFlow = Math.round(response.data.majesticTF) || 0;
        metricsData.majesticCitationFlow = Math.round(response.data.majesticCF) || 0;
        
        // Calculate trust ratio
        if (metricsData.majesticCitationFlow > 0) {
          metricsData.majesticTrustRatio = metricsData.majesticTrustFlow / metricsData.majesticCitationFlow;
        }
        
        metricsData.backlinks = response.data.majesticEBL || 0;
        metricsData.referringDomains = response.data.majesticRD || 0;
      }
    }
    
    // Save processed data
    fs.writeFileSync(
      path.join(outputDir, 'domain_metrics.json'),
      JSON.stringify(metricsData, null, 2)
    );
    
    return metricsData;
  } catch (error) {
    console.error('Error getting domain metrics:', error.message);
    
    // Return default values if API fails
    const defaultMetrics = {
      domain: cleanDomain(domain),
      mozDomainAuthority: 0,
      mozPageAuthority: 0,
      majesticTrustFlow: 0,
      majesticCitationFlow: 0,
      majesticTrustRatio: 0,
      backlinks: 0,
      referringDomains: 0,
      error: error.message
    };
    
    // Save default data
    fs.writeFileSync(
      path.join(outputDir, 'domain_metrics.json'),
      JSON.stringify(defaultMetrics, null, 2)
    );
    
    return defaultMetrics;
  }
}
