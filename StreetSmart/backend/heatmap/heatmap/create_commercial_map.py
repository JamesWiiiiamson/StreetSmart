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

# Filter for recent data
days_back = 365
cutoff_date = datetime.now() - timedelta(days=days_back)
df_crime = df_crime[df_crime['OCC_DATE'] >= cutoff_date]

# Keep only valid Toronto coordinates
df_crime = df_crime[(df_crime['LAT_WGS84'] > 43.5) & (df_crime['LAT_WGS84'] < 44.0)]
df_crime = df_crime[(df_crime['LONG_WGS84'] > -79.7) & (df_crime['LONG_WGS84'] < -79.0)]

print(f"Crime data has {len(df_crime)} incidents")

# Define grid using same parameters
grid_size = 0.005
lat_min, lat_max = 43.58, 43.85
lon_min, lon_max = -79.64, -79.12

lat_bins = np.arange(lat_min, lat_max, grid_size)
lon_bins = np.arange(lon_min, lon_max, grid_size)

# Assign crime data to grid cells
df_crime['lat_bin'] = pd.cut(df_crime['LAT_WGS84'], bins=lat_bins, labels=False)
df_crime['lon_bin'] = pd.cut(df_crime['LONG_WGS84'], bins=lon_bins, labels=False)
df_crime = df_crime.dropna(subset=['lat_bin', 'lon_bin'])

# Get valid cells
valid_cells = df_crime[['lat_bin', 'lon_bin']].drop_duplicates()
valid_cells_set = set(zip(valid_cells['lat_bin'].astype(int), valid_cells['lon_bin'].astype(int)))

print(f"Found {len(valid_cells_set)} valid grid cells")

# Define safety values for different business types
SAFETY_VALUES = {
    '24_7_pharmacy': 10,
    'bank_atm': 6,
    'gas_station': 5,
    'grocery_store': 4,
    'restaurant_takeout': 3,
    'gym_late': 4,
    'convenience_store': 2,
    'coffee_shop': 3
}

# Generate synthetic commercial activity data
print("Generating commercial activity data...")
np.random.seed(42)

commercial_data = []

for (lat_bin_idx, lon_bin_idx) in valid_cells_set:
    lat_center = lat_bins[lat_bin_idx] + grid_size/2
    lon_center = lon_bins[lon_bin_idx] + grid_size/2
    
    # Determine area characteristics
    is_downtown = (43.63 <= lat_center <= 43.67 and -79.40 <= lon_center <= -79.36)
    is_financial = (43.645 <= lat_center <= 43.655 and -79.385 <= lon_center <= -79.375)
    is_midtown = (43.67 <= lat_center <= 43.72 and -79.42 <= lon_center <= -79.38)
    is_north_york = (43.74 <= lat_center <= 43.78 and -79.45 <= lon_center <= -79.38)
    is_scarborough = (43.70 <= lat_center <= 43.78 and -79.30 <= lon_center <= -79.20)
    is_etobicoke = (43.62 <= lat_center <= 43.70 and -79.60 <= lon_center <= -79.50)
    is_residential = not (is_downtown or is_midtown or is_north_york or is_financial)
    
    # Generate business counts based on area type
    businesses = {}
    
    if is_financial:
        # Financial district - lots of banks/ATMs, restaurants
        businesses['bank_atm'] = np.random.randint(4, 8)
        businesses['restaurant_takeout'] = np.random.randint(6, 12)
        businesses['coffee_shop'] = np.random.randint(5, 10)
        businesses['convenience_store'] = np.random.randint(2, 4)
        businesses['24_7_pharmacy'] = np.random.randint(0, 2)
        businesses['gas_station'] = 0
        businesses['grocery_store'] = np.random.randint(1, 3)
        businesses['gym_late'] = np.random.randint(1, 3)
        
    elif is_downtown:
        # Downtown - high commercial activity
        businesses['bank_atm'] = np.random.randint(2, 5)
        businesses['restaurant_takeout'] = np.random.randint(4, 9)
        businesses['coffee_shop'] = np.random.randint(3, 7)
        businesses['convenience_store'] = np.random.randint(1, 4)
        businesses['24_7_pharmacy'] = np.random.randint(0, 2)
        businesses['gas_station'] = np.random.randint(0, 1)
        businesses['grocery_store'] = np.random.randint(1, 3)
        businesses['gym_late'] = np.random.randint(1, 3)
        
    elif is_midtown or is_north_york:
        # Urban centers - moderate activity
        businesses['bank_atm'] = np.random.randint(1, 3)
        businesses['restaurant_takeout'] = np.random.randint(2, 6)
        businesses['coffee_shop'] = np.random.randint(1, 4)
        businesses['convenience_store'] = np.random.randint(1, 3)
        businesses['24_7_pharmacy'] = np.random.randint(0, 1)
        businesses['gas_station'] = np.random.randint(0, 2)
        businesses['grocery_store'] = np.random.randint(0, 2)
        businesses['gym_late'] = np.random.randint(0, 2)
        
    elif is_scarborough or is_etobicoke:
        # Suburban areas - car-oriented
        businesses['bank_atm'] = np.random.randint(0, 2)
        businesses['restaurant_takeout'] = np.random.randint(1, 4)
        businesses['coffee_shop'] = np.random.randint(0, 2)
        businesses['convenience_store'] = np.random.randint(1, 2)
        businesses['24_7_pharmacy'] = np.random.randint(0, 1)
        businesses['gas_station'] = np.random.randint(1, 3)
        businesses['grocery_store'] = np.random.randint(0, 2)
        businesses['gym_late'] = np.random.randint(0, 1)
        
    else:
        # Residential areas - minimal commercial
        businesses['bank_atm'] = np.random.randint(0, 1)
        businesses['restaurant_takeout'] = np.random.randint(0, 3)
        businesses['coffee_shop'] = np.random.randint(0, 2)
        businesses['convenience_store'] = np.random.randint(0, 2)
        businesses['24_7_pharmacy'] = np.random.randint(0, 1)
        businesses['gas_station'] = np.random.randint(0, 1)
        businesses['grocery_store'] = np.random.randint(0, 1)
        businesses['gym_late'] = np.random.randint(0, 1)
    
    # Calculate total safety index
    safety_score = sum(businesses[btype] * SAFETY_VALUES[btype] for btype in businesses)
    total_businesses = sum(businesses.values())
    
    commercial_data.append({
        'lat_bin': lat_bin_idx,
        'lon_bin': lon_bin_idx,
        'safety_score': safety_score,
        'total_businesses': total_businesses,
        'lat': lat_center,
        'lon': lon_center,
        **businesses  # Include individual business counts
    })

df_commercial = pd.DataFrame(commercial_data)

print(f"Generated {len(df_commercial)} grid blocks with commercial data")
print(f"Average safety score: {df_commercial['safety_score'].mean():.1f}")
print(f"Max safety score: {df_commercial['safety_score'].max()}")
print(f"Min safety score: {df_commercial['safety_score'].min()}")

# Calculate percentiles
percentiles = np.percentile(df_commercial['safety_score'], [10, 20, 30, 40, 50, 60, 70, 80, 90, 100])
print(f"\nSafety score distribution:")
print(f"10th percentile: {percentiles[0]:.0f}")
print(f"50th percentile (median): {percentiles[4]:.0f}")
print(f"90th percentile: {percentiles[8]:.0f}")

# Create map
toronto_map = folium.Map(
    location=[43.65, -79.38],
    zoom_start=12,
    tiles='OpenStreetMap'
)

# Define colors - GREEN for high safety, RED for low safety
def get_safety_color(score, percentiles):
    """Returns color based on safety score - green = safer"""
    if score <= percentiles[0]:
        return '#8B0000', 0.7  # Dark red (very unsafe)
    elif score <= percentiles[1]:
        return '#B22222', 0.7  # Red
    elif score <= percentiles[2]:
        return '#DC143C', 0.65  # Crimson
    elif score <= percentiles[3]:
        return '#FF4500', 0.65  # Orange red
    elif score <= percentiles[4]:
        return '#FF6347', 0.6  # Tomato
    elif score <= percentiles[5]:
        return '#FFA500', 0.6  # Orange
    elif score <= percentiles[6]:
        return '#FFD700', 0.55  # Gold
    elif score <= percentiles[7]:
        return '#ADFF2F', 0.55  # Yellow green
    elif score <= percentiles[8]:
        return '#7FFF00', 0.5  # Chartreuse
    else:
        return '#228B22', 0.5  # Forest green (very safe)

# Add colored rectangles
for _, row in df_commercial.iterrows():
    lat_start = lat_bins[int(row['lat_bin'])]
    lat_end = lat_bins[int(row['lat_bin']) + 1]
    lon_start = lon_bins[int(row['lon_bin'])]
    lon_end = lon_bins[int(row['lon_bin']) + 1]
    
    color, opacity = get_safety_color(row['safety_score'], percentiles)
    percentile_rank = np.searchsorted(percentiles, row['safety_score']) * 10
    
    # Create detailed popup
    popup_html = f"""
    <div style="width: 250px;">
        <b>Commercial Safety Index: {int(row['safety_score'])}</b><br>
        <b>Percentile:</b> {percentile_rank}th<br>
        <b>Total Businesses:</b> {int(row['total_businesses'])}<br>
        <hr style="margin: 5px 0;">
        <small>
        24/7 Pharmacies: {int(row['24_7_pharmacy'])}<br>
        Banks/ATMs: {int(row['bank_atm'])}<br>
        Gas Stations: {int(row['gas_station'])}<br>
        Grocery Stores: {int(row['grocery_store'])}<br>
        Restaurants: {int(row['restaurant_takeout'])}<br>
        Coffee Shops: {int(row['coffee_shop'])}<br>
        Late Gyms: {int(row['gym_late'])}<br>
        Convenience: {int(row['convenience_store'])}
        </small>
    </div>
    """
    
    folium.Rectangle(
        bounds=[[lat_start, lon_start], [lat_end, lon_end]],
        color='gray',
        weight=0.3,
        fill=True,
        fill_color=color,
        fill_opacity=opacity,
        popup=folium.Popup(popup_html, max_width=300)
    ).add_to(toronto_map)

# Add legend
legend_html = f'''
<div style="position: fixed; 
            bottom: 50px; right: 50px; width: 240px; height: auto; 
            background-color: white; border:2px solid grey; z-index:9999; 
            font-size:12px; padding: 10px; border-radius: 5px;">
<p style="margin: 0 0 10px 0; font-weight: bold; font-size: 14px;">Commercial Safety Index</p>
<p style="margin: 3px 0;"><span style="background-color: #228B22; padding: 3px 15px; border: 1px solid #ccc;">▬</span> Very High (≥{percentiles[9]:.0f})</p>
<p style="margin: 3px 0;"><span style="background-color: #7FFF00; padding: 3px 15px; border: 1px solid #ccc;">▬</span> High ({percentiles[8]:.0f})</p>
<p style="margin: 3px 0;"><span style="background-color: #ADFF2F; padding: 3px 15px; border: 1px solid #ccc;">▬</span> Above Avg ({percentiles[7]:.0f})</p>
<p style="margin: 3px 0;"><span style="background-color: #FFD700; padding: 3px 15px; border: 1px solid #ccc;">▬</span> Good ({percentiles[6]:.0f})</p>
<p style="margin: 3px 0;"><span style="background-color: #FFA500; padding: 3px 15px; border: 1px solid #ccc;">▬</span> Average ({percentiles[5]:.0f})</p>
<p style="margin: 3px 0;"><span style="background-color: #FF6347; padding: 3px 15px; border: 1px solid #ccc;">▬</span> Below Avg ({percentiles[4]:.0f})</p>
<p style="margin: 3px 0;"><span style="background-color: #FF4500; padding: 3px 15px; border: 1px solid #ccc;">▬</span> Fair ({percentiles[3]:.0f})</p>
<p style="margin: 3px 0;"><span style="background-color: #DC143C; padding: 3px 15px; border: 1px solid #ccc;">▬</span> Poor ({percentiles[2]:.0f})</p>
<p style="margin: 3px 0;"><span style="background-color: #B22222; padding: 3px 15px; border: 1px solid #ccc;">▬</span> Very Poor ({percentiles[1]:.0f})</p>
<p style="margin: 3px 0;"><span style="background-color: #8B0000; padding: 3px 15px; border: 1px solid #ccc;">▬</span> Minimal ({percentiles[0]:.0f})</p>
<p style="margin: 10px 0 5px 0; font-size: 10px; color: #666;"><b>Safety Values:</b></p>
<p style="margin: 2px 0; font-size: 10px;">24/7 Pharmacy: +10</p>
<p style="margin: 2px 0; font-size: 10px;">Bank/ATM: +6</p>
<p style="margin: 2px 0; font-size: 10px;">Gas Station: +5</p>
<p style="margin: 2px 0; font-size: 10px;">Grocery: +4</p>
<p style="margin: 2px 0; font-size: 10px;">Late Gym: +4</p>
</div>
'''
toronto_map.get_root().html.add_child(folium.Element(legend_html))

# Add title
title_html = '''
<div style="position: fixed; 
            top: 10px; left: 50px; width: 450px; height: auto; 
            background-color: white; border:2px solid grey; z-index:9999; 
            font-size:16px; padding: 10px; border-radius: 5px;">
<p style="margin: 0; font-weight: bold;">Toronto Commercial Activity & Safety Index</p>
<p style="margin: 5px 0 0 0; font-size: 12px;">Based on nearby businesses and late-night activity</p>
<p style="margin: 5px 0 0 0; font-size: 11px; color: #666;">Green = high commercial safety, Red = low activity</p>
</div>
'''
toronto_map.get_root().html.add_child(folium.Element(title_html))

# Save map
toronto_map.save('toronto_commercial_safety_map.html')

# Save data
df_commercial.to_csv('commercial_safety_data.csv', index=False)

print("\n✓ Commercial safety map created! Open 'toronto_commercial_safety_map.html'")
print("✓ Green = high commercial activity & safety")
print("✓ Red = low commercial activity")
print("✓ Click any block to see business breakdown")
print("✓ Data saved to 'commercial_safety_data.csv'")

