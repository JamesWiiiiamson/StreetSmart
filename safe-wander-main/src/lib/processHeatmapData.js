/**
 * Script to process crime CSV data into grid-based heatmap JSON
 * Run with: node src/lib/processHeatmapData.js
 * 
 * This replicates the logic from create_grid_map.py
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration matching create_grid_map.py
const GRID_SIZE = 0.005;
const LAT_MIN = 43.58;
const LAT_MAX = 43.85;
const LON_MIN = -79.64;
const LON_MAX = -79.12;
const DAYS_BACK = 365;

// Color mapping (exact from create_grid_map.py)
function getColorPercentile(count, percentiles) {
  if (count <= percentiles[0]) return { color: '#FFFFCC', opacity: 0.4 }; // 0-10%
  if (count <= percentiles[1]) return { color: '#FFFF99', opacity: 0.45 }; // 10-20%
  if (count <= percentiles[2]) return { color: '#FFFF66', opacity: 0.5 }; // 20-30%
  if (count <= percentiles[3]) return { color: '#FFED4E', opacity: 0.55 }; // 30-40%
  if (count <= percentiles[4]) return { color: '#FFDB4D', opacity: 0.6 }; // 40-50%
  if (count <= percentiles[5]) return { color: '#FFC04D', opacity: 0.65 }; // 50-60%
  if (count <= percentiles[6]) return { color: '#FF9933', opacity: 0.7 }; // 60-70%
  if (count <= percentiles[7]) return { color: '#FF6B1A', opacity: 0.75 }; // 70-80%
  if (count <= percentiles[8]) return { color: '#FF3300', opacity: 0.8 }; // 80-90%
  return { color: '#CC0000', opacity: 0.85 }; // 90-100%
}

// Simple CSV parser that handles quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function processCSV(csvPath) {
  console.log('Reading CSV file...');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = parseCSVLine(lines[0]);
  
  // Find column indices
  const latIdx = headers.indexOf('LAT_WGS84');
  const lngIdx = headers.indexOf('LONG_WGS84');
  const dateIdx = headers.indexOf('OCC_DATE');
  
  if (latIdx === -1 || lngIdx === -1 || dateIdx === -1) {
    throw new Error('Required columns not found in CSV');
  }
  
  // Filter and process data
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DAYS_BACK);
  
  const crimes = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = parseCSVLine(lines[i]);
    if (values.length <= Math.max(latIdx, lngIdx, dateIdx)) continue;
    
    const lat = parseFloat(values[latIdx]);
    const lng = parseFloat(values[lngIdx]);
    const dateStr = values[dateIdx];
    
    // Filter valid coordinates
    if (isNaN(lat) || isNaN(lng)) continue;
    if (lat < 43.5 || lat > 44.0) continue;
    if (lng < -79.7 || lng > -79.0) continue;
    
    // Try to parse date and filter (simplified - accepts all if parsing fails)
    try {
      const crimeDate = new Date(dateStr);
      if (!isNaN(crimeDate.getTime()) && crimeDate < cutoffDate) {
        continue; // Skip old crimes
      }
    } catch (e) {
      // If date parsing fails, include the crime (better to have more data)
    }
    
    crimes.push({ lat, lng });
  }
  
  console.log(`Loaded ${crimes.length} crime incidents`);
  
  // Create grid bins
  const latBins = [];
  const lngBins = [];
  
  for (let lat = LAT_MIN; lat < LAT_MAX; lat += GRID_SIZE) {
    latBins.push(lat);
  }
  for (let lng = LON_MIN; lng < LON_MAX; lng += GRID_SIZE) {
    lngBins.push(lng);
  }
  
  // Count crimes per grid cell
  const cellCounts = new Map();
  
  crimes.forEach(crime => {
    const latBin = Math.floor((crime.lat - LAT_MIN) / GRID_SIZE);
    const lngBin = Math.floor((crime.lng - LON_MIN) / GRID_SIZE);
    const key = `${latBin}_${lngBin}`;
    cellCounts.set(key, (cellCounts.get(key) || 0) + 1);
  });
  
  console.log(`Created ${cellCounts.size} grid blocks with crimes`);
  
  // Calculate percentiles
  const counts = Array.from(cellCounts.values()).sort((a, b) => a - b);
  const percentiles = [
    counts[Math.floor(counts.length * 0.1)] || 0,
    counts[Math.floor(counts.length * 0.2)] || 0,
    counts[Math.floor(counts.length * 0.3)] || 0,
    counts[Math.floor(counts.length * 0.4)] || 0,
    counts[Math.floor(counts.length * 0.5)] || 0,
    counts[Math.floor(counts.length * 0.6)] || 0,
    counts[Math.floor(counts.length * 0.7)] || 0,
    counts[Math.floor(counts.length * 0.8)] || 0,
    counts[Math.floor(counts.length * 0.9)] || 0,
    counts[counts.length - 1] || 0,
  ];
  
  console.log('Percentiles:', percentiles);
  
  // Create grid cells
  const cells = [];
  
  cellCounts.forEach((count, key) => {
    const [latBin, lngBin] = key.split('_').map(Number);
    const latStart = LAT_MIN + latBin * GRID_SIZE;
    const latEnd = latStart + GRID_SIZE;
    const lngStart = LON_MIN + lngBin * GRID_SIZE;
    const lngEnd = lngStart + GRID_SIZE;
    
    // Calculate percentile rank
    let percentile = 0;
    for (let i = 0; i < percentiles.length; i++) {
      if (count <= percentiles[i]) {
        percentile = (i + 1) * 10;
        break;
      }
    }
    if (percentile === 0) percentile = 100;
    
    const { color, opacity } = getColorPercentile(count, percentiles);
    
    cells.push({
      latMin: latStart,
      latMax: latEnd,
      lngMin: lngStart,
      lngMax: lngEnd,
      crimeCount: count,
      percentile,
      color,
      opacity,
    });
  });
  
  return {
    gridSize: GRID_SIZE,
    cells,
    bounds: { latMin: LAT_MIN, latMax: LAT_MAX, lngMin: LON_MIN, lngMax: LON_MAX },
    percentiles,
    totalCrimes: crimes.length,
  };
}

// Main execution
const csvPath = path.join(__dirname, '../../../../heatmap/heatmap/Major_Crime_Indicators_Open_Data.csv');
const outputPath = path.join(__dirname, '../../public/data/heatmap-grid.json');

try {
  const heatmapData = processCSV(csvPath);
  fs.writeFileSync(outputPath, JSON.stringify(heatmapData, null, 2));
  console.log(`\n✓ Heatmap data saved to ${outputPath}`);
  console.log(`✓ Total cells: ${heatmapData.cells.length}`);
} catch (error) {
  console.error('Error processing CSV:', error);
  process.exit(1);
}

export { processCSV, getColorPercentile };

