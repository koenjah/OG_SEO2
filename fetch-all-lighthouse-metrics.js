import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export async function fetchAllLighthouseMetrics(domain, isMobile = true) {
  try {
    const API_KEY = process.env.PAGESPEED_API_KEY;
    const url = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://${domain}&key=${API_KEY}&category=performance&category=accessibility&category=best-practices&category=seo`;
    
    const mobileMetrics = await fetchMetrics(url + '&strategy=mobile');
    const desktopMetrics = await fetchMetrics(url + '&strategy=desktop');
    
    return {
      mobile: mobileMetrics,
      desktop: desktopMetrics,
      averageScores: {
        performance: (mobileMetrics.performanceScore + desktopMetrics.performanceScore) / 2,
        accessibility: (mobileMetrics.accessibilityScore + desktopMetrics.accessibilityScore) / 2,
        bestPractices: (mobileMetrics.bestPracticesScore + desktopMetrics.bestPracticesScore) / 2,
        seo: (mobileMetrics.seoScore + desktopMetrics.seoScore) / 2
      }
    };
  } catch (error) {
    console.error('Error fetching Lighthouse metrics:', error);
    throw error;
  }
}

async function fetchMetrics(url) {
  try {
    const response = await axios.get(url);
    const data = response.data;
    
    return {
      performanceScore: Math.round(data.lighthouseResult.categories.performance.score * 100),
      accessibilityScore: Math.round(data.lighthouseResult.categories.accessibility.score * 100),
      bestPracticesScore: Math.round(data.lighthouseResult.categories['best-practices'].score * 100),
      seoScore: Math.round(data.lighthouseResult.categories.seo.score * 100),
      firstContentfulPaint: data.lighthouseResult.audits['first-contentful-paint'].displayValue,
      speedIndex: data.lighthouseResult.audits['speed-index'].displayValue,
      largestContentfulPaint: data.lighthouseResult.audits['largest-contentful-paint'].displayValue,
      timeToInteractive: data.lighthouseResult.audits['interactive'].displayValue,
      totalBlockingTime: data.lighthouseResult.audits['total-blocking-time'].displayValue,
      cumulativeLayoutShift: data.lighthouseResult.audits['cumulative-layout-shift'].displayValue
    };
  } catch (error) {
    console.error('Error fetching metrics:', error);
    throw error;
  }
}
