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
  openingHours?: string[]; // Array of formatted opening hours (e.g., ["Monday: 9:00 AM – 5:00 PM", ...])
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
 * Check if a place is open 24/7 based on opening hours data
 */
function isOpen24h(place: google.maps.places.PlaceResult): boolean {
  const name = place.name?.toLowerCase() || '';
  const types = place.types || [];
  
  // Check if opening hours indicate 24/7 operation
  if (place.opening_hours?.periods) {
    const periods = place.opening_hours.periods;
    // If all days have the same open/close time and it spans 24 hours, it's 24/7
    if (periods.length === 7) {
      const allSame = periods.every(period => {
        if (!period.open || !period.close) return false;
        const openTime = period.open.time;
        const closeTime = period.close.time;
        // Check if open time is 0000 and close time is 2359 (or next day)
        return openTime === '0000' && (closeTime === '2359' || closeTime === '0000');
      });
      if (allSame) return true;
    }
  }
  
  // Heuristic checks
  if (types.includes('gas_station')) return true;
  if (types.includes('pharmacy') && name.includes('shoppers')) return true;
  if (name.includes('24') || name.includes('24/7')) return true;
  
  return false;
}

/**
 * Calculate hours until close from opening hours data
 * Returns undefined if cannot be calculated
 */
function calculateHoursUntilClose(openingHours: google.maps.places.PlaceOpeningHours | undefined): number | undefined {
  if (!openingHours || !openingHours.periods || !openingHours.open_now) {
    return undefined;
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentTime = now.getHours() * 100 + now.getMinutes(); // HHMM format

  // Find today's period
  const todayPeriod = openingHours.periods.find(period => {
    if (!period.open) return false;
    // Google uses 0 = Sunday, same as JavaScript Date.getDay()
    return period.open.day === currentDay;
  });

  if (!todayPeriod) {
    return undefined;
  }

  // If no close time, it might be open 24 hours or closes next day
  if (!todayPeriod.close) {
    // Check if there's a close time for tomorrow (indicates it closes after midnight)
    const nextDay = (currentDay + 1) % 7;
    const nextDayPeriod = openingHours.periods.find(period => {
      if (!period.open) return false;
      return period.open.day === nextDay;
    });
    
    if (nextDayPeriod && nextDayPeriod.close) {
      const nextCloseTime = parseInt(nextDayPeriod.close.time, 10);
      // Calculate hours until close tomorrow
      const hoursUntilMidnight = (24 * 100 - currentTime) / 100;
      const hoursAfterMidnight = nextCloseTime / 100;
      return Math.round((hoursUntilMidnight + hoursAfterMidnight) * 10) / 10;
    }
    // No close time found, might be 24/7 or unknown
    return undefined;
  }

  const closeTime = parseInt(todayPeriod.close.time, 10);
  
  // If close time is before current time, check if it closes tomorrow
  if (closeTime < currentTime) {
    // Check next day's period
    const nextDay = (currentDay + 1) % 7;
    const nextDayPeriod = openingHours.periods.find(period => {
      if (!period.open) return false;
      return period.open.day === nextDay;
    });
    
    if (nextDayPeriod && nextDayPeriod.close) {
      const nextCloseTime = parseInt(nextDayPeriod.close.time, 10);
      // Calculate hours until close tomorrow
      const hoursUntilMidnight = (24 * 100 - currentTime) / 100;
      const hoursAfterMidnight = nextCloseTime / 100;
      return Math.round((hoursUntilMidnight + hoursAfterMidnight) * 10) / 10;
    }
    // If no next day close time, the place might have closed for today
    // but we know it's open_now, so it might close tomorrow
    return undefined;
  }

  // Calculate hours until close today
  const hoursUntilClose = (closeTime - currentTime) / 100;
  return Math.round(hoursUntilClose * 10) / 10;
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
                
                // Only add places that are open or might be open (don't add if we know they're closed)
                // We'll filter more precisely after getting Place Details
                if (isOpenFromNearby !== false) {
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

      // Use Place Details API to get opening hours and business status
      const detailsRequest: google.maps.places.PlaceDetailsRequest = {
        placeId: place.placeId,
        fields: ['opening_hours', 'name', 'types', 'business_status'],
      };

      placesService.getDetails(detailsRequest, (placeDetails, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && placeDetails) {
          // Check if permanently closed
          if (placeDetails.business_status === 'CLOSED_PERMANENTLY') {
            placesWithDetails.push({
              ...place,
              isOpen: false,
              open24h: false,
            });
            resolve();
            return;
          }

          // Get opening hours from place details
          const openingHours = placeDetails.opening_hours;
          const isOpen = openingHours?.open_now ?? null;
          const open24h = isOpen24h(placeDetails) || place.open24h;
          
          // Extract weekday_text for opening hours display
          const openingHoursText = openingHours?.weekday_text || [];
          
          // Calculate hours until close if place is open
          let hoursUntilClose: number | undefined = undefined;
          if (isOpen === true && !open24h) {
            hoursUntilClose = calculateHoursUntilClose(openingHours);
          }
          
          // Determine if place is open
          let finalIsOpen: boolean | undefined;
          if (isOpen !== null) {
            finalIsOpen = isOpen;
          } else if (open24h) {
            finalIsOpen = true; // 24/7 places are always open
          } else {
            finalIsOpen = undefined; // Unknown status
          }
          
          // Only add places that are currently open
          if (finalIsOpen === true) {
            placesWithDetails.push({
              ...place,
              isOpen: finalIsOpen,
              open24h: open24h,
              hoursUntilClose: hoursUntilClose,
              openingHours: openingHoursText,
            });
          }
        } else {
          // If details fetch fails, only add if we can confirm it's open
          // (e.g., 24/7 places or places marked as open from nearby search)
          if (place.isOpen === true || (place.isOpen === undefined && place.open24h)) {
            if (place.isOpen === undefined && place.open24h) {
              place.isOpen = true; // If 24/7, assume open
            }
            placesWithDetails.push(place);
          }
        }
        resolve();
      });
    });
  });

  await Promise.all(detailPromises);

  // Filter to only include places that are currently open
  const openPlaces = placesWithDetails.filter(place => place.isOpen === true);

  // Sort by distance (all are open, so no need to prioritize by open status)
  return openPlaces.sort((a, b) => a.distanceMeters - b.distanceMeters);
}

