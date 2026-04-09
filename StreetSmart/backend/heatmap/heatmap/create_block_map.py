import pandas as pd
import folium
import geopandas as gpd

# Read crime data
print("Loading crime data...")
df = pd.read_csv('Major_Crime_Indicators_Open_Data.csv')
df = df.dropna(subset=['LAT_WGS84', 'LONG_WGS84', 'HOOD_158'])

print(f"Loaded {len(df)} crime incidents")

# Read neighbourhood boundaries
print("Loading neighbourhood boundaries...")
neighbourhoods = gpd.read_file('Neighbourhoods - 4326.geojson')

# Count crimes per neighbourhood
crime_counts = df['HOOD_158'].value_counts().reset_index()
crime_counts.columns = ['HOOD_158', 'crime_count']

# Merge with neighbourhood data
neighbourhoods = neighbourhoods.merge(
    crime_counts, 
    left_on='AREA_SHORT_CODE', 
    right_on='HOOD_158', 
    how='left'
)
neighbourhoods['crime_count'] = neighbourhoods['crime_count'].fillna(0)

print(f"Crime counts calculated for {len(neighbourhoods)} neighbourhoods")

# Create map centered on Toronto
toronto_map = folium.Map(
    location=[43.65, -79.38], 
    zoom_start=11,
    tiles='OpenStreetMap'
)

# Add choropleth (colored blocks)
folium.Choropleth(
    geo_data=neighbourhoods,
    name='Crime Density',
    data=neighbourhoods,
    columns=['AREA_SHORT_CODE', 'crime_count'],
    key_on='feature.properties.AREA_SHORT_CODE',
    fill_color='YlOrRd',  # Yellow to Orange to Red
    fill_opacity=0.7,
    line_opacity=0.5,
    legend_name='Total Crime Incidents by Neighbourhood',
    nan_fill_color='lightgray'
).add_to(toronto_map)

# Add neighbourhood names and crime counts on hover
folium.GeoJson(
    neighbourhoods,
    style_function=lambda x: {
        'fillColor': 'transparent',
        'color': 'transparent',
        'weight': 0
    },
    tooltip=folium.GeoJsonTooltip(
        fields=['AREA_NAME', 'crime_count'],
        aliases=['Neighbourhood:', 'Total Crimes:'],
        localize=True
    )
).add_to(toronto_map)

# Save the map
toronto_map.save('toronto_crime_by_block.html')

print("Block map created! Open 'toronto_crime_by_block.html' in your browser.")
print("Dark red = highest crime, light yellow = lowest crime")