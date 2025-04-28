import dotenv from 'dotenv';
dotenv.config();
import { fetchAllLighthouseMetrics } from './fetch-all-lighthouse-metrics.js';

async function main() {
  const domain = process.argv[2];
  if (!domain) {
    console.error('Usage: node test-lighthouse.js <domain>');
    process.exit(1);
  }

  try {
    console.log(`Testing Lighthouse metrics for domain: ${domain}`);
    const metrics = await fetchAllLighthouseMetrics(domain);
    console.log('Mobile metrics:', metrics.mobile);
    console.log('Desktop metrics:', metrics.desktop);
    console.log('Average scores:', metrics.averageScores);
  } catch (error) {
    console.error('Error during Lighthouse test:', error.message);
    process.exit(1);
  }
}

main();
