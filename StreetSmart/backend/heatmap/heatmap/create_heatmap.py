import pandas as pd
import folium
from folium.plugins import HeatMap

# Read the crime data
print("Loading data...")
df = pd.read_csv('Major_Crime_Indicators_Open_Data.csv')

# Remove rows with missing coordinates
df = df.dropna(subset=['LAT_WGS84', 'LONG_WGS84'])

# Keep only valid Toronto coordinates
df = df[(df['LAT_WGS84'] > 43.5) & (df['LAT_WGS84'] < 44.0)]
df = df[(df['LONG_WGS84'] > -79.7) & (df['LONG_WGS84'] < -79.0)]

print(f"Loaded {len(df)} crime incidents")

# Create base map centered on Toronto
toronto_map = folium.Map(
    location=[43.65, -79.38], 
    zoom_start=11,
    tiles='OpenStreetMap'
)

# Prepare heat map data
heat_data = [[row['LAT_WGS84'], row['LONG_WGS84']] for index, row in df.iterrows()]

# Add heat map layer
HeatMap(
    heat_data, 
    radius=15, 
    blur=25, 
    max_zoom=13,
    min_opacity=0.3
).add_to(toronto_map)

# Save the map
toronto_map.save('toronto_crime_heatmap.html')

print("Heat map created! Open 'toronto_crime_heatmap.html' in your browser.")