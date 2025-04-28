
// Function to normalize numbers and round them
export function normalizeNumber(number, decimals = 2) {
  if (typeof number !== 'number') {
    number = parseFloat(number) || 0;
  }
  return Number(number.toFixed(decimals));
}

// Function to calculate estimated traffic
export function calculateEstimatedTraffic(position, searchVolume) {
  const ctrRates = {
    1: 0.3, 2: 0.15, 3: 0.1,
    4: 0.07, 5: 0.05,
    6: 0.03, 7: 0.02,
    8: 0.02, 9: 0.01, 10: 0.01
  };
  
  const ctr = ctrRates[position] || 0.01;
  return Math.round(searchVolume * ctr);
}
