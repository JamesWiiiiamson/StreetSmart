/**
 * Fetches nearby safe places using Google Places API
 */

export interface SafePlace {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  open24h: boolean;
  hoursUntilClose?: number;
  distance: string;
  distanceMeters: number;
  placeId?: string;
  address?: string;
}

/**
 * Calculate distance between two points in meters
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Format distance as a human-readable string
 */
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Map Google Places type to our internal type
 */
function mapPlaceType(types: string[]): string {
  if (types.includes('pharmacy')) return 'pharmacy';
  if (types.includes('gas_station')) return 'gas_station';
  if (types.includes('restaurant') || types.includes('cafe') || types.includes('food')) return 'restaurant';
  if (types.includes('supermarket') || types.includes('grocery_or_supermarket')) return 'grocery';
  if (types.includes('subway_station') || types.includes('transit_station')) return 'subway';
  if (types.includes('gym') || types.includes('health')) return 'gym';
  return 'other';
}

/**
 * Check if a place is open 24/7 (heuristic based on name and type)
 */
function isOpen24h(place: google.maps.places.PlaceResult): boolean {
  const name = place.name?.toLowerCase() || '';
  const types = place.types || [];
  
  // Gas stations and pharmacies are often 24/7
  if (types.includes('gas_station')) return true;
  if (types.includes('pharmacy') && name.includes('shoppers')) return true;
  
  // Check opening hours if available
  if (place.opening_hours?.open_now !== undefined) {
    // If it's open now and has 24/7 in the name, likely 24/7
    if (name.includes('24') || name.includes('24/7')) return true;
  }
  
  return false;
}

/**
 * Fetch nearby safe places using Google Places Nearby Search
 */
export async function fetchNearbyPlaces(
  userLat: number,
  userLng: number,
  radius: number = 2000,
  map?: google.maps.Map | null
): Promise<SafePlace[]> {
  if (!window.google || !window.google.maps || !window.google.maps.places) {
    throw new Error('Google Maps API not loaded');
  }

  // Use map if available, otherwise create a dummy div
  const placesService = new google.maps.places.PlacesService(
    map || document.createElement('div')
  );

  // Types of places to search for
  const placeTypes = [
    'pharmacy',
    'gas_station',
    'restaurant',
    'grocery_or_supermarket',
    'subway_station',
    'gym',
  ];

  const allPlaces: SafePlace[] = [];
  const promises: Promise<void>[] = [];

  // Search for each type of place
  placeTypes.forEach((type) => {
    const promise = new Promise<void>((resolve) => {
      const request: google.maps.places.PlaceSearchRequest = {
        location: new google.maps.LatLng(userLat, userLng),
        radius,
        type: type as google.maps.places.PlaceType,
        rankBy: google.maps.places.RankBy.DISTANCE,
      };

      placesService.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          results.slice(0, 3).forEach((place, index) => {
            if (place.geometry?.location) {
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              const distanceMeters = calculateDistance(userLat, userLng, lat, lng);

              allPlaces.push({
                id: place.place_id || `place-${type}-${index}`,
                name: place.name || 'Unknown Place',
                type: mapPlaceType(place.types || []),
                lat,
                lng,
                open24h: isOpen24h(place),
                distance: formatDistance(distanceMeters),
                distanceMeters,
                placeId: place.place_id,
                address: place.vicinity || place.formatted_address,
              });
            }
          });
        }
        resolve();
      });
    });

    promises.push(promise);
  });

  await Promise.all(promises);

  // Sort by distance and return top 10
  return allPlaces
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 10);
}

