import pandas as pd
import folium
import numpy as np
from datetime import datetime, timedelta

# Read crime data
print("Loading crime data...")
df = pd.read_csv('Major_Crime_Indicators_Open_Data.csv')
df = df.dropna(subset=['LAT_WGS84', 'LONG_WGS84', 'OCC_DATE'])

# Convert date column to datetime
df['OCC_DATE'] = pd.to_datetime(df['OCC_DATE'], errors='coerce')
df = df.dropna(subset=['OCC_DATE'])

# Filter for recent data
days_back = 365  # Change this number!
cutoff_date = datetime.now() - timedelta(days=days_back)
df = df[df['OCC_DATE'] >= cutoff_date]

# Keep only valid Toronto coordinates
df = df[(df['LAT_WGS84'] > 43.5) & (df['LAT_WGS84'] < 44.0)]
df = df[(df['LONG_WGS84'] > -79.7) & (df['LONG_WGS84'] < -79.0)]

print(f"Loaded {len(df)} crime incidents from the last {days_back} days")
print(f"Date range: {df['OCC_DATE'].min()} to {df['OCC_DATE'].max()}")

# Define grid size
grid_size = 0.005

# Create grid boundaries
lat_min, lat_max = 43.58, 43.85
lon_min, lon_max = -79.64, -79.12

lat_bins = np.arange(lat_min, lat_max, grid_size)
lon_bins = np.arange(lon_min, lon_max, grid_size)

# Assign each crime to a grid cell
df['lat_bin'] = pd.cut(df['LAT_WGS84'], bins=lat_bins, labels=False)
df['lon_bin'] = pd.cut(df['LONG_WGS84'], bins=lon_bins, labels=False)

# Count crimes per grid cell
grid_counts = df.groupby(['lat_bin', 'lon_bin']).size().reset_index(name='crime_count')

print(f"Created {len(grid_counts)} grid blocks with crimes")

# Calculate percentiles for better color distribution
percentiles = np.percentile(grid_counts['crime_count'], [10, 20, 30, 40, 50, 60, 70, 80, 90, 100])
print(f"\nCrime count distribution:")
print(f"10th percentile: {percentiles[0]:.0f}")
print(f"50th percentile (median): {percentiles[4]:.0f}")
print(f"90th percentile: {percentiles[8]:.0f}")
print(f"Max crimes in a block: {percentiles[9]:.0f}")

# Create map
toronto_map = folium.Map(
    location=[43.65, -79.38], 
    zoom_start=12,
    tiles='OpenStreetMap'
)

# Define colors based on percentiles (not linear)
def get_color_percentile(count, percentiles):
    """Returns color based on percentile ranking"""
    if count <= percentiles[0]:
        return '#FFFFCC', 0.4  # Very light yellow (bottom 10%)
    elif count <= percentiles[1]:
        return '#FFFF99', 0.45  # Light yellow (10-20%)
    elif count <= percentiles[2]:
        return '#FFFF66', 0.5  # Yellow (20-30%)
    elif count <= percentiles[3]:
        return '#FFED4E', 0.55  # Yellow-orange (30-40%)
    elif count <= percentiles[4]:
        return '#FFDB4D', 0.6  # Light orange (40-50%)
    elif count <= percentiles[5]:
        return '#FFC04D', 0.65  # Orange (50-60%)
    elif count <= percentiles[6]:
        return '#FF9933', 0.7  # Dark orange (60-70%)
    elif count <= percentiles[7]:
        return '#FF6B1A', 0.75  # Orange-red (70-80%)
    elif count <= percentiles[8]:
        return '#FF3300', 0.8  # Red (80-90%)
    else:
        return '#CC0000', 0.85  # Dark red (top 10%)

# Add colored rectangles for each grid cell
for _, row in grid_counts.iterrows():
    lat_start = lat_bins[int(row['lat_bin'])]
    lat_end = lat_bins[int(row['lat_bin']) + 1]
    lon_start = lon_bins[int(row['lon_bin'])]
    lon_end = lon_bins[int(row['lon_bin']) + 1]
    
    color, opacity = get_color_percentile(row['crime_count'], percentiles)
    
    # Calculate which percentile this falls into
    percentile_rank = np.searchsorted(percentiles, row['crime_count']) * 10
    
    # Add rectangle to map
    folium.Rectangle(
        bounds=[[lat_start, lon_start], [lat_end, lon_end]],
        color='gray',
        weight=0.3,
        fill=True,
        fill_color=color,
        fill_opacity=opacity,
        popup=f"<b>Crimes:</b> {int(row['crime_count'])}<br><b>Percentile:</b> {percentile_rank}th"
    ).add_to(toronto_map)

# Add enhanced legend
legend_html = f'''
<div style="position: fixed; 
            bottom: 50px; right: 50px; width: 200px; height: auto; 
            background-color: white; border:2px solid grey; z-index:9999; 
            font-size:12px; padding: 10px; border-radius: 5px;">
<p style="margin: 0 0 10px 0; font-weight: bold; font-size: 14px;">Crime Density (Percentile)</p>
<p style="margin: 3px 0;"><span style="background-color: #FFFFCC; padding: 3px 15px; border: 1px solid #ccc;">▬</span> 0-10% (≤{percentiles[0]:.0f})</p>
<p style="margin: 3px 0;"><span style="background-color: #FFFF99; padding: 3px 15px; border: 1px solid #ccc;">▬</span> 10-20% (≤{percentiles[1]:.0f})</p>
<p style="margin: 3px 0;"><span style="background-color: #FFFF66; padding: 3px 15px; border: 1px solid #ccc;">▬</span> 20-30% (≤{percentiles[2]:.0f})</p>
<p style="margin: 3px 0;"><span style="background-color: #FFED4E; padding: 3px 15px; border: 1px solid #ccc;">▬</span> 30-40% (≤{percentiles[3]:.0f})</p>
<p style="margin: 3px 0;"><span style="background-color: #FFDB4D; padding: 3px 15px; border: 1px solid #ccc;">▬</span> 40-50% (≤{percentiles[4]:.0f})</p>
<p style="margin: 3px 0;"><span style="background-color: #FFC04D; padding: 3px 15px; border: 1px solid #ccc;">▬</span> 50-60% (≤{percentiles[5]:.0f})</p>
<p style="margin: 3px 0;"><span style="background-color: #FF9933; padding: 3px 15px; border: 1px solid #ccc;">▬</span> 60-70% (≤{percentiles[6]:.0f})</p>
<p style="margin: 3px 0;"><span style="background-color: #FF6B1A; padding: 3px 15px; border: 1px solid #ccc;">▬</span> 70-80% (≤{percentiles[7]:.0f})</p>
<p style="margin: 3px 0;"><span style="background-color: #FF3300; padding: 3px 15px; border: 1px solid #ccc;">▬</span> 80-90% (≤{percentiles[8]:.0f})</p>
<p style="margin: 3px 0;"><span style="background-color: #CC0000; padding: 3px 15px; border: 1px solid #ccc;">▬</span> 90-100% (≤{percentiles[9]:.0f})</p>
<p style="margin: 10px 0 0 0; font-size: 11px; color: #666;">Last {days_back} days</p>
</div>
'''
toronto_map.get_root().html.add_child(folium.Element(legend_html))

# Add title
title_html = f'''
<div style="position: fixed; 
            top: 10px; left: 50px; width: 400px; height: auto; 
            background-color: white; border:2px solid grey; z-index:9999; 
            font-size:16px; padding: 10px; border-radius: 5px;">
<p style="margin: 0; font-weight: bold;">Toronto Crime Heat Map</p>
<p style="margin: 5px 0 0 0; font-size: 12px;">Data from last {days_back} days ({len(df)} incidents)</p>
</div>
'''
toronto_map.get_root().html.add_child(folium.Element(title_html))

toronto_map.save('toronto_crime_grid.html')

print("\n✓ Grid map created! Open 'toronto_crime_grid.html' in your browser.")
print(f"✓ Colors now based on percentiles for better distribution")