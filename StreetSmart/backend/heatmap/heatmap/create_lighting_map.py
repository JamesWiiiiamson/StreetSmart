import pandas as pd
import folium
import numpy as np
from datetime import datetime, timedelta

# First, load the crime data to get the exact boundaries
print("Loading crime data to determine boundaries...")
df_crime = pd.read_csv('Major_Crime_Indicators_Open_Data.csv')
df_crime = df_crime.dropna(subset=['LAT_WGS84', 'LONG_WGS84', 'OCC_DATE'])

# Convert date column to datetime
df_crime['OCC_DATE'] = pd.to_datetime(df_crime['OCC_DATE'], errors='coerce')
df_crime = df_crime.dropna(subset=['OCC_DATE'])

# Filter for recent data (same as crime map)
days_back = 365
cutoff_date = datetime.now() - timedelta(days=days_back)
df_crime = df_crime[df_crime['OCC_DATE'] >= cutoff_date]

# Keep only valid Toronto coordinates
df_crime = df_crime[(df_crime['LAT_WGS84'] > 43.5) & (df_crime['LAT_WGS84'] < 44.0)]
df_crime = df_crime[(df_crime['LONG_WGS84'] > -79.7) & (df_crime['LONG_WGS84'] < -79.0)]

print(f"Crime data has {len(df_crime)} incidents")

# Define grid using EXACT same parameters as crime map
grid_size = 0.005
lat_min, lat_max = 43.58, 43.85
lon_min, lon_max = -79.64, -79.12

lat_bins = np.arange(lat_min, lat_max, grid_size)
lon_bins = np.arange(lon_min, lon_max, grid_size)

# Assign crime data to grid cells to find which cells have data
df_crime['lat_bin'] = pd.cut(df_crime['LAT_WGS84'], bins=lat_bins, labels=False)
df_crime['lon_bin'] = pd.cut(df_crime['LONG_WGS84'], bins=lon_bins, labels=False)

# Remove any rows with NaN bins (outside grid boundaries)
df_crime = df_crime.dropna(subset=['lat_bin', 'lon_bin'])

# Get all grid cells that have at least one crime (i.e., are on land)
valid_cells = df_crime[['lat_bin', 'lon_bin']].drop_duplicates()
valid_cells_set = set(zip(valid_cells['lat_bin'].astype(int), valid_cells['lon_bin'].astype(int)))

print(f"Found {len(valid_cells_set)} valid grid cells with crime data")

# Generate synthetic streetlight data ONLY for valid cells
print("Generating synthetic streetlight data for valid areas...")
np.random.seed(42)

streetlights = []

for (lat_bin_idx, lon_bin_idx) in valid_cells_set:
    lat_center = lat_bins[lat_bin_idx] + grid_size/2
    lon_center = lon_bins[lon_bin_idx] + grid_size/2
    
    # Determine area type and base light count
    is_downtown = (43.63 <= lat_center <= 43.67 and -79.40 <= lon_center <= -79.36)
    is_midtown = (43.67 <= lat_center <= 43.72 and -79.42 <= lon_center <= -79.38)
    is_north_york = (43.74 <= lat_center <= 43.78 and -79.45 <= lon_center <= -79.38)
    is_scarborough = (43.70 <= lat_center <= 43.78 and -79.30 <= lon_center <= -79.20)
    
    # Waterfront parks (near shore but not in water)
    is_waterfront = 43.62 <= lat_center <= 43.64 and -79.40 <= lon_center <= -79.36
    
    # Generate light count based on area
    if is_waterfront:
        num_lights = np.random.randint(8, 20)  # Parks/waterfront
    elif is_downtown:
        num_lights = np.random.randint(45, 85)  # Dense downtown
    elif is_midtown or is_north_york:
        num_lights = np.random.randint(25, 50)  # Medium density
    elif is_scarborough:
        num_lights = np.random.randint(18, 40)  # Suburban
    else:
        num_lights = np.random.randint(15, 35)  # Residential
    
    # Add some randomness
    num_lights = int(num_lights * np.random.uniform(0.8, 1.2))
    
    streetlights.append({
        'lat_bin': lat_bin_idx,
        'lon_bin': lon_bin_idx,
        'light_count': num_lights,
        'lat': lat_center,
        'lon': lon_center
    })

df_lights = pd.DataFrame(streetlights)

print(f"Generated {len(df_lights)} grid blocks with lighting data")
print(f"Total simulated streetlights: {df_lights['light_count'].sum()}")

# Calculate percentiles for color distribution
percentiles = np.percentile(df_lights['light_count'], [10, 20, 30, 40, 50, 60, 70, 80, 90, 100])
print(f"\nLighting distribution:")
print(f"10th percentile: {percentiles[0]:.0f} lights")
print(f"50th percentile (median): {percentiles[4]:.0f} lights")
print(f"90th percentile: {percentiles[8]:.0f} lights")
print(f"Max lights in a block: {percentiles[9]:.0f}")

# Create map
toronto_map = folium.Map(
    location=[43.65, -79.38],
    zoom_start=12,
    tiles='OpenStreetMap'
)

# Define colors - GREEN/BLUE for well-lit, DARK PURPLE/BLACK for poorly lit
def get_lighting_color(count, percentiles):
    """Returns color based on lighting density - darker = less light"""
    if count <= percentiles[0]:
        return '#1a1a2e', 0.7  # Very dark (poorly lit)
    elif count <= percentiles[1]:
        return '#16213e', 0.7  # Dark blue
    elif count <= percentiles[2]:
        return '#0f3460', 0.65  # Dark blue
    elif count <= percentiles[3]:
        return '#533483', 0.65  # Purple
    elif count <= percentiles[4]:
        return '#7c3aed', 0.6  # Light purple
    elif count <= percentiles[5]:
        return '#3b82f6', 0.6  # Blue
    elif count <= percentiles[6]:
        return '#0ea5e9', 0.55  # Light blue
    elif count <= percentiles[7]:
        return '#06b6d4', 0.55  # Cyan
    elif count <= percentiles[8]:
        return '#14b8a6', 0.5  # Teal
    else:
        return '#10b981', 0.5  # Green (well-lit)

# Add colored rectangles for each grid cell
for _, row in df_lights.iterrows():
    lat_start = lat_bins[int(row['lat_bin'])]
    lat_end = lat_bins[int(row['lat_bin']) + 1]
    lon_start = lon_bins[int(row['lon_bin'])]
    lon_end = lon_bins[int(row['lon_bin']) + 1]
    
    color, opacity = get_lighting_color(row['light_count'], percentiles)
    
    # Calculate percentile
    percentile_rank = np.searchsorted(percentiles, row['light_count']) * 10
    
    # Add rectangle to map
    folium.Rectangle(
        bounds=[[lat_start, lon_start], [lat_end, lon_end]],
        color='gray',
        weight=0.3,
        fill=True,
        fill_color=color,
        fill_opacity=opacity,
        popup=f"<b>Streetlights:</b> {int(row['light_count'])}<br><b>Percentile:</b> {percentile_rank}th"
    ).add_to(toronto_map)

# Add legend
legend_html = f'''
<div style="position: fixed; 
            bottom: 50px; right: 50px; width: 220px; height: auto; 
            background-color: white; border:2px solid grey; z-index:9999; 
            font-size:12px; padding: 10px; border-radius: 5px;">
<p style="margin: 0 0 10px 0; font-weight: bold; font-size: 14px;">Lighting Density</p>
<p style="margin: 3px 0;"><span style="background-color: #10b981; padding: 3px 15px; border: 1px solid #ccc;">▬</span> Excellent (≥{percentiles[9]:.0f})</p>
<p style="margin: 3px 0;"><span style="background-color: #14b8a6; padding: 3px 15px; border: 1px solid #ccc;">▬</span> Very Good ({percentiles[8]:.0f})</p>
<p style="margin: 3px 0;"><span style="background-color: #06b6d4; padding: 3px 15px; border: 1px solid #ccc;">▬</span> Good ({percentiles[7]:.0f})</p>
<p style="margin: 3px 0;"><span style="background-color: #0ea5e9; padding: 3px 15px; border: 1px solid #ccc;">▬</span> Above Avg ({percentiles[6]:.0f})</p>
<p style="margin: 3px 0;"><span style="background-color: #3b82f6; padding: 3px 15px; border: 1px solid #ccc;">▬</span> Average ({percentiles[5]:.0f})</p>
<p style="margin: 3px 0;"><span style="background-color: #7c3aed; padding: 3px 15px; border: 1px solid #ccc;">▬</span> Below Avg ({percentiles[4]:.0f})</p>
<p style="margin: 3px 0;"><span style="background-color: #533483; padding: 3px 15px; border: 1px solid #ccc;">▬</span> Fair ({percentiles[3]:.0f})</p>
<p style="margin: 3px 0;"><span style="background-color: #0f3460; padding: 3px 15px; border: 1px solid #ccc;">▬</span> Poor ({percentiles[2]:.0f})</p>
<p style="margin: 3px 0;"><span style="background-color: #16213e; padding: 3px 15px; border: 1px solid #ccc;">▬</span> Very Poor ({percentiles[1]:.0f})</p>
<p style="margin: 3px 0;"><span style="background-color: #1a1a2e; padding: 3px 15px; border: 1px solid #ccc;">▬</span> Minimal ({percentiles[0]:.0f})</p>
<p style="margin: 10px 0 0 0; font-size: 11px; color: #666;">Simulated data</p>
</div>
'''
toronto_map.get_root().html.add_child(folium.Element(legend_html))

# Add title
title_html = f'''
<div style="position: fixed; 
            top: 10px; left: 50px; width: 400px; height: auto; 
            background-color: white; border:2px solid grey; z-index:9999; 
            font-size:16px; padding: 10px; border-radius: 5px;">
<p style="margin: 0; font-weight: bold;">Toronto Street Lighting Density Map</p>
<p style="margin: 5px 0 0 0; font-size: 12px;">Simulated data ({df_lights['light_count'].sum()} total lights)</p>
<p style="margin: 5px 0 0 0; font-size: 11px; color: #666;">Green = well-lit, Dark = poorly lit</p>
</div>
'''
toronto_map.get_root().html.add_child(folium.Element(title_html))

# Save map
toronto_map.save('toronto_lighting_map.html')

# Also save the data for later comparison
df_lights.to_csv('synthetic_streetlight_data.csv', index=False)

print("\n✓ Lighting map created! Open 'toronto_lighting_map.html' in your browser.")
print("✓ Green areas = well-lit, Dark areas = poorly lit")
print("✓ Uses EXACT same boundaries as crime data")
print("✓ Data saved to 'synthetic_streetlight_data.csv'")