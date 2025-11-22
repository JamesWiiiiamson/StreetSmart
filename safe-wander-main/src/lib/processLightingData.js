/**
 * Script to process lighting CSV data into grid-based heatmap JSON
 * Run with: node src/lib/processLightingData.js
 * 
 * This replicates the logic from create_lighting_map.py
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration matching create_lighting_map.py
const GRID_SIZE = 0.005;
const LAT_MIN = 43.58;
const LAT_MAX = 43.85;
const LON_MIN = -79.64;
const LON_MAX = -79.12;

// Color mapping (exact from create_lighting_map.py)
function getLightingColor(count, percentiles) {
  if (count <= percentiles[0]) return { color: '#1a1a2e', opacity: 0.7 }; // Very dark (poorly lit)
  if (count <= percentiles[1]) return { color: '#16213e', opacity: 0.7 }; // Dark blue
  if (count <= percentiles[2]) return { color: '#0f3460', opacity: 0.65 }; // Dark blue
  if (count <= percentiles[3]) return { color: '#533483', opacity: 0.65 }; // Purple
  if (count <= percentiles[4]) return { color: '#7c3aed', opacity: 0.6 }; // Light purple
  if (count <= percentiles[5]) return { color: '#3b82f6', opacity: 0.6 }; // Blue
  if (count <= percentiles[6]) return { color: '#0ea5e9', opacity: 0.55 }; // Light blue
  if (count <= percentiles[7]) return { color: '#06b6d4', opacity: 0.55 }; // Cyan
  if (count <= percentiles[8]) return { color: '#14b8a6', opacity: 0.5 }; // Teal
  return { color: '#10b981', opacity: 0.5 }; // Green (well-lit)
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
  console.log('Reading lighting CSV file...');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = parseCSVLine(lines[0]);
  
  // Find column indices
  const latBinIdx = headers.indexOf('lat_bin');
  const lonBinIdx = headers.indexOf('lon_bin');
  const lightCountIdx = headers.indexOf('light_count');
  
  if (latBinIdx === -1 || lonBinIdx === -1 || lightCountIdx === -1) {
    throw new Error('Required columns not found in CSV');
  }
  
  // Process lighting data
  const lightingData = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = parseCSVLine(lines[i]);
    if (values.length <= Math.max(latBinIdx, lonBinIdx, lightCountIdx)) continue;
    
    const latBin = parseInt(values[latBinIdx]);
    const lonBin = parseInt(values[lonBinIdx]);
    const lightCount = parseInt(values[lightCountIdx]);
    
    if (isNaN(latBin) || isNaN(lonBin) || isNaN(lightCount)) continue;
    
    lightingData.push({
      latBin,
      lonBin,
      lightCount,
    });
  }
  
  console.log(`Loaded ${lightingData.length} grid blocks with lighting data`);
  
  // Calculate percentiles
  const counts = lightingData.map(d => d.lightCount).sort((a, b) => a - b);
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
  
  lightingData.forEach((data) => {
    const latStart = LAT_MIN + data.latBin * GRID_SIZE;
    const latEnd = latStart + GRID_SIZE;
    const lngStart = LON_MIN + data.lonBin * GRID_SIZE;
    const lngEnd = lngStart + GRID_SIZE;
    
    // Calculate percentile rank
    let percentile = 0;
    for (let i = 0; i < percentiles.length; i++) {
      if (data.lightCount <= percentiles[i]) {
        percentile = (i + 1) * 10;
        break;
      }
    }
    if (percentile === 0) percentile = 100;
    
    const { color, opacity } = getLightingColor(data.lightCount, percentiles);
    
    // Calculate lighting score (inverse of crime - higher is better)
    const lightingScore = 100 - (percentile * 0.9); // Scale to 10-100
    
    cells.push({
      latMin: latStart,
      latMax: latEnd,
      lngMin: lngStart,
      lngMax: lngEnd,
      lightCount: data.lightCount,
      percentile,
      color,
      opacity,
      lightingScore,
    });
  });
  
  const totalLights = lightingData.reduce((sum, d) => sum + d.lightCount, 0);
  
  return {
    gridSize: GRID_SIZE,
    cells,
    bounds: { latMin: LAT_MIN, latMax: LAT_MAX, lngMin: LON_MIN, lngMax: LON_MAX },
    percentiles,
    totalLights,
  };
}

// Main execution
const csvPath = path.join(__dirname, '../../../../heatmap/heatmap/synthetic_streetlight_data.csv');
const outputPath = path.join(__dirname, '../../public/data/lighting-grid.json');

try {
  const lightingData = processCSV(csvPath);
  fs.writeFileSync(outputPath, JSON.stringify(lightingData, null, 2));
  console.log(`\n✓ Lighting data saved to ${outputPath}`);
  console.log(`✓ Total cells: ${lightingData.cells.length}`);
  console.log(`✓ Total lights: ${lightingData.totalLights}`);
} catch (error) {
  console.error('Error processing CSV:', error);
  process.exit(1);
}

export { processCSV, getLightingColor };

