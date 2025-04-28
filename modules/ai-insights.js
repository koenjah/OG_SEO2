import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// OpenRouter API key
const apiKey = process.env.OPENROUTER_API_KEY;

/**
 * Generate AI insights for the SEO report
 * @param {Object} reportData - The complete report data
 * @param {string} outputDir - Directory to save output files
 * @returns {Object} AI insights for each section
 */
export async function generateInsights(reportData, outputDir) {
  try {
    console.log('Generating AI insights...');
    
    // Initialize insights object
    const insights = {
      trafficTrend: '',
      keywords: '',
      domainAuthority: '',
      performance: ''
    };
    
    // Generate traffic trend insight
    insights.trafficTrend = await generateTrafficTrendInsight(reportData.sections.trafficHistory);
    
    // Generate keywords insight
    insights.keywords = await generateKeywordsInsight(reportData.sections.rankedKeywords);
    
    // Generate domain authority insight
    insights.domainAuthority = await generateDomainAuthorityInsight(reportData.sections.domainMetrics);
    
    // Generate performance insight
    insights.performance = await generatePerformanceInsight(reportData.sections.lighthouse);
    
    // Save insights
    fs.writeFileSync(
      path.join(outputDir, 'ai_insights.json'),
      JSON.stringify(insights, null, 2)
    );
    
    return insights;
  } catch (error) {
    console.error('Error generating AI insights:', error.message);
    
    // Return empty insights if API fails
    return {
      trafficTrend: 'Unable to generate traffic trend insight.',
      keywords: 'Unable to generate keywords insight.',
      domainAuthority: 'Unable to generate domain authority insight.',
      performance: 'Unable to generate performance insight.',
      error: error.message
    };
  }
}

/**
 * Generate insight for traffic trend section
 * @param {Object} trafficData - Traffic history data
 * @returns {string} AI-generated insight
 */
async function generateTrafficTrendInsight(trafficData) {
  const prompt = `
    Heey, kun je mij helpen bij uitleg  geven over de zoekvolume trend van de website: ${trafficData.domain}? 
    Hier zijn de traffic gegevens van de afgelopen 12 maanden:
    - Hoogste traffic: ${trafficData.highestTraffic} bezoekers in ${trafficData.highestMonth}
    - Laagste traffic: ${trafficData.lowestTraffic} bezoekers in ${trafficData.lowestMonth}
    - Gemiddelde traffic: ${trafficData.averageTraffic} bezoekers per maand.

    Let op dat bij alle bovenstaande data, het komma en punt gebruik wordt gebruikt zoals gebruikelijk in usa. terwijl dit nl methode moet zijn. benoem dit niet in het antwoord maar ga wel zo om met de cijfers..(check dit voorbeeld: geen echte data!!: 1.989,239 bezoekers zijn er dus eigenlijk 1,989.239 maar mag je afronden op 1,989 ) 

    Probeer uit te leggen wat de data betekent voor de website maar wel extreem geschikt voor een b1 intellect niveau. Wees eerlijk maar constructief. Als de traffic lager is geworden, benoem dit als een probleem dat aandacht nodig heeft.
    Schrijf in het b1 Nederlands extreem geschikt voor een b1 intellect niveau, gebruik wel moderne woorden, max 55 woorden output, geef alleen de output verder niks.  geef ook geen generieke tips. Geen lijstjes.
  `;
  
  return await callOpenRouterAPI(prompt);
}

/**
 * Generate insight for keywords section
 * @param {Object} keywordsData - Ranked keywords data
 * @returns {string} AI-generated insight
 */
async function generateKeywordsInsight(keywordsData) {
  // Format top keywords by traffic with position and traffic data
  const formattedKeywords = keywordsData.keywordsByTraffic
    ? keywordsData.keywordsByTraffic.map(kw => 
        `${kw.keyword} (positie: ${kw.position}, traffic: ${kw.estimatedTraffic})`
      ).join('\n')
    : 'Geen zoekwoord data beschikbaar.';

  const prompt = `
    Je bent een SEO expert die een rapport analyseert over de website ${keywordsData.domain}.
    

    
    <top30_zoektermen>
${formattedKeywords}
    </top30_zoektermen>
    
    Geef een korte, krachtige uitleg van wat deze data een beetje betekend op een b1 intellect veilgige manier. benoem exacte posities en pijnpunten, gebruik geen opmaak. noem het niet letterlijk pijnpunten maar gebruik het om ze te motiveren onze expertise te vertrouwen zonder dit zo letterlijk te benoemen.
    Wees eerlijk maar constructief. Als er weinig keywords zijn of de posities zijn laag, benoem dit als een probleem dat aandacht nodig heeft.
    Schrijf in het b1 Nederlands extreem geschikt voor een b1 intellect niveau, gebruik wel moderne woorden, max 55 woorden output, geef alleen de output verder niks.  geef ook geen generieke tips.
  `;
  
  return await callOpenRouterAPI(prompt);
}

/**
 * Generate insight for domain authority section
 * @param {Object} metricsData - Domain metrics data
 * @returns {string} AI-generated insight
 */
async function generateDomainAuthorityInsight(metricsData) {
  const prompt = `
    Je bent een SEO expert die een rapport analyseert over de website ${metricsData.domain}.
    
    Hier zijn de domain authority gegevens:
    - Moz Domain Authority: ${metricsData.mozDomainAuthority}
    - Majestic Trust Flow: ${metricsData.majesticTrustFlow}
    - Majestic Citation Flow: ${metricsData.majesticCitationFlow}
    - Trust Ratio: ${metricsData.majesticTrustRatio.toFixed(2)}

    
    Geef een korte, krachtige analyse (maximaal 3 zinnen) van deze domain authority metrics. Geen lijstjes en geen opmaak!
    Wees eerlijk maar constructief. Als de scores laag zijn, geef aan dat dit verbeterd kan worden.
    Schrijf in het b1 Nederlands extreem geschikt voor een b1 intellect niveau, gebruik wel moderne woorden, max 55 woorden output, geef alleen de output verder niks.  geef ook geen generieke tips.
  `;
  
  return await callOpenRouterAPI(prompt);
}

/**
 * Generate insight for performance section
 * @param {Object} lighthouseData - Lighthouse performance data
 * @returns {string} AI-generated insight
 */
async function generatePerformanceInsight(lighthouseData) {
  const prompt = `
    Je bent een SEO expert die een rapport analyseert over de website ${lighthouseData.domain}.
    
    Hier zijn de website performance gegevens (Lighthouse scores):
    - Performance score: ${lighthouseData.performanceScore}/100
    - Accessibility score: ${lighthouseData.accessibilityScore}/100
    - Best Practices score: ${lighthouseData.bestPracticesScore}/100
    - SEO score: ${lighthouseData.seoScore}/100
    - PWA score: ${lighthouseData.pwaScore}/100
    - First Contentful Paint: ${lighthouseData.firstContentfulPaint}
    - Largest Contentful Paint: ${lighthouseData.largestContentfulPaint}
    - Time to Interactive: ${lighthouseData.timeToInteractive}
    
    Geef een korte, krachtige analyse (maximaal 3 zinnen) van deze performance metrics.
    Focus vooral op de mobile performance score en hoe dit de gebruikerservaring beïnvloedt. 
    Wees eerlijk maar constructief. Als de scores laag zijn, geef aan dat dit verbeterd kan worden. Geen lijstjes en geen opmaak!
    Schrijf in het b1 Nederlands extreem geschikt voor een b1 intellect niveau, gebruik wel moderne woorden, max 55 woorden output, geef alleen de output verder niks.  geef ook geen generieke tips.
  `;
  
  return await callOpenRouterAPI(prompt);
}

/**
 * Call OpenRouter API to generate text
 * @param {string} prompt - The prompt to send to the API
 * @returns {string} Generated text
 */
async function callOpenRouterAPI(prompt) {
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/chatgpt-4o-latest',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error calling OpenRouter API:', error.message);
    return 'Geen analyse beschikbaar.';
  }
}
