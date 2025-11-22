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
  isOpen?: boolean; // Whether the place is currently open
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

  // Types of places to search for - these are safe places users might need
  const placeTypes = [
    'pharmacy',
    'gas_station',
    'restaurant',
    'grocery_or_supermarket',
    'subway_station',
    'gym',
    'police',
    'hospital',
    'convenience_store',
  ];

  const allPlaces: SafePlace[] = [];
  const promises: Promise<void>[] = [];

  // Search for each type of place
  placeTypes.forEach((type) => {
    const promise = new Promise<void>((resolve) => {
      // When using rankBy: DISTANCE, you cannot use radius parameter
      // We'll use rankBy: DISTANCE to get closest places, then filter by radius
      const request: google.maps.places.PlaceSearchRequest = {
        location: new google.maps.LatLng(userLat, userLng),
        type: type as google.maps.places.PlaceType,
        rankBy: google.maps.places.RankBy.DISTANCE,
      };

      placesService.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          results.forEach((place, index) => {
            if (place.geometry?.location) {
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              const distanceMeters = calculateDistance(userLat, userLng, lat, lng);

              // Filter by radius (since we can't use radius with rankBy: DISTANCE)
              if (distanceMeters <= radius) {
                // Get basic opening hours info (may not be available in nearbySearch)
                const open24h = isOpen24h(place);
                // Try to get open_now from nearbySearch if available, but we'll fetch details later
                const isOpenFromNearby = place.opening_hours?.open_now;
                
                allPlaces.push({
                  id: place.place_id || `place-${type}-${index}`,
                  name: place.name || 'Unknown Place',
                  type: mapPlaceType(place.types || []),
                  lat,
                  lng,
                  open24h,
                  // Only set isOpen if we have it from nearbySearch, otherwise will get from Place Details
                  isOpen: isOpenFromNearby !== undefined ? isOpenFromNearby : (open24h ? true : undefined),
                  distance: formatDistance(distanceMeters),
                  distanceMeters,
                  placeId: place.place_id,
                  address: place.vicinity || place.formatted_address,
                });
              }
            }
          });
        } else if (status !== google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          // Log errors but don't fail the entire request
          console.warn(`Places API error for type ${type}:`, status);
        }
        resolve();
      });
    });

    promises.push(promise);
  });

  await Promise.all(promises);

  // Remove duplicates by place_id
  const uniquePlaces = Array.from(
    new Map(allPlaces.map(place => [place.placeId || place.id, place])).values()
  );

  // Fetch detailed information including opening hours for each place
  const placesWithDetails: SafePlace[] = [];
  const detailPromises = uniquePlaces.slice(0, 15).map((place) => {
    return new Promise<void>((resolve) => {
      if (!place.placeId) {
        // If no place_id, use the place as-is
        placesWithDetails.push(place);
        resolve();
        return;
      }

      // Use Place Details API to get opening hours
      const detailsRequest: google.maps.places.PlaceDetailsRequest = {
        placeId: place.placeId,
        fields: ['opening_hours', 'name', 'types'],
      };

      placesService.getDetails(detailsRequest, (placeDetails, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && placeDetails) {
          // Get opening hours from place details
          const openingHours = placeDetails.opening_hours;
          const isOpen = openingHours?.open_now ?? null;
          const open24h = isOpen24h(placeDetails) || place.open24h;
          
          // Determine if place is open
          let finalIsOpen: boolean | undefined;
          if (isOpen !== null) {
            finalIsOpen = isOpen;
          } else if (open24h) {
            finalIsOpen = true; // 24/7 places are always open
          } else {
            finalIsOpen = undefined; // Unknown status
          }
          
          placesWithDetails.push({
            ...place,
            isOpen: finalIsOpen,
            open24h: open24h,
          });
        } else {
          // If details fetch fails, use the place as-is but try to infer from initial data
          if (place.isOpen === undefined && place.open24h) {
            place.isOpen = true; // If 24/7, assume open
          }
          placesWithDetails.push(place);
        }
        resolve();
      });
    });
  });

  await Promise.all(detailPromises);

  // Sort: open places first, then by distance
  return placesWithDetails
    .sort((a, b) => {
      // Prioritize open places (true > false > undefined)
      const aOpen = a.isOpen === true ? 2 : (a.isOpen === false ? 0 : 1);
      const bOpen = b.isOpen === true ? 2 : (b.isOpen === false ? 0 : 1);
      
      if (aOpen !== bOpen) {
        return bOpen - aOpen; // Open places first
      }
      
      // If both have same open status, sort by distance
      return a.distanceMeters - b.distanceMeters;
    });
}

