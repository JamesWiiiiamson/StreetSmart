import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { processCrimeDataToGrid, HeatmapData, findSafeWaypoints, getRouteSafetyScore, processLightingDataToGrid, LightingHeatmapData, compareRoutes, RouteComparison, scoreRoute } from '@/lib/heatmapUtils';

// Helper function to get marker icon (custom image or default symbol)
const getMarkerIcon = (type: 'image' | 'symbol', imagePath?: string, symbolConfig?: google.maps.Symbol) => {
  if (type === 'image' && imagePath) {
    return {
      url: imagePath,
      scaledSize: new google.maps.Size(32, 32),
      anchor: new google.maps.Point(16, 32), // Anchor at bottom center for pin-style markers
    };
  }
  return symbolConfig;
};

interface MapProps {
  onMapLoad?: (map: google.maps.Map) => void;
  crimeData?: any[];
  lightingData?: any[];
  communityReports?: any[];
  activeLayers: {
    businesses: boolean;
    userReports: boolean;
    heatmap: boolean;
    lightingHeatmap: boolean;
  };
  onMapClick?: (lat: number, lng: number) => void;
  routeOrigin?: { lat: number; lng: number; address: string } | null;
  routeDestination?: { lat: number; lng: number; address: string } | null;
  userLocation?: { lat: number; lng: number } | null;
  isReportMode?: boolean;
  pendingReportType?: string | null;
  onRoutesCalculated?: (comparison: RouteComparison) => void;
  selectedRouteType?: 'shortest' | 'safest' | 'balanced' | null;
}

const Map = ({ onMapLoad, crimeData = [], lightingData = [], communityReports = [], activeLayers, onMapClick, routeOrigin, routeDestination, userLocation, isReportMode = false, pendingReportType = null, onRoutesCalculated, selectedRouteType = null }: MapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const routePolylinesRef = useRef<google.maps.Polyline[]>([]);
  const userLocationMarkerRef = useRef<google.maps.Marker | null>(null);
  const tempMarkerRef = useRef<google.maps.Marker | null>(null);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const heatmapDataRef = useRef<HeatmapData | null>(null);
  const heatmapRectanglesRef = useRef<google.maps.Rectangle[]>([]);
  const lightingHeatmapDataRef = useRef<LightingHeatmapData | null>(null);
  const lightingHeatmapRectanglesRef = useRef<google.maps.Rectangle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [lightingHeatmapData, setLightingHeatmapData] = useState<LightingHeatmapData | null>(null);
  const lastRouteKeyRef = useRef<string | null>(null);
  const lastDirectionsResultRef = useRef<google.maps.DirectionsResult | null>(null);
  const routeComparisonRef = useRef<RouteComparison | null>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      toast.error('Google Maps API key not configured. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file');
      setIsLoading(false);
      return;
    }

    // Load Google Maps script
    const loadGoogleMaps = () => {
      return new Promise<void>((resolve, reject) => {
        if (window.google && window.google.maps) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,directions`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Maps'));
        document.head.appendChild(script);
      });
    };

    loadGoogleMaps().then(() => {
      // Try to get user location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            initMap(position.coords.latitude, position.coords.longitude);
          },
          () => {
            // Default to Toronto if geolocation denied
            initMap(43.6532, -79.3832);
            toast.info('Using default location (Toronto)');
          }
        );
      } else {
        initMap(43.6532, -79.3832);
      }
    }).catch((error) => {
      console.error('Error loading Google Maps:', error);
      toast.error('Failed to load Google Maps');
      setIsLoading(false);
    });

    const initMap = (lat: number, lng: number) => {
      if (!mapRef.current) return;

      const map = new google.maps.Map(mapRef.current, {
        center: { lat, lng },
        zoom: 15,
        styles: [
          {
            elementType: 'geometry',
            stylers: [{ color: '#1a1f2e' }],
          },
          {
            elementType: 'labels.text.stroke',
            stylers: [{ color: '#1a1f2e' }],
          },
          {
            elementType: 'labels.text.fill',
            stylers: [{ color: '#8b9dc3' }],
          },
          {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{ color: '#2c3441' }],
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#1a2332' }],
          },
        ],
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      // Add user location marker
      const userMarker = new google.maps.Marker({
        position: { lat, lng },
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#0ea5e9',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        title: 'Your Location',
      });
      userLocationMarkerRef.current = userMarker;

      // Initialize DirectionsRenderer
      const directionsRenderer = new google.maps.DirectionsRenderer({
        map,
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: '#0ea5e9',
          strokeWeight: 5,
          strokeOpacity: 0.8,
        },
      });
      directionsRendererRef.current = directionsRenderer;

      mapInstanceRef.current = map;
      setIsLoading(false);
      
      if (onMapLoad) {
        onMapLoad(map);
      }
    };

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
      routePolylinesRef.current.forEach(polyline => polyline.setMap(null));
      routePolylinesRef.current = [];
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.setMap(null);
      }
      if (tempMarkerRef.current) {
        tempMarkerRef.current.setMap(null);
      }
      if (clickListenerRef.current) {
        google.maps.event.removeListener(clickListenerRef.current);
      }
      // Cleanup heatmap rectangles
      heatmapRectanglesRef.current.forEach(rect => rect.setMap(null));
      heatmapRectanglesRef.current = [];
      // Cleanup lighting heatmap rectangles
      lightingHeatmapRectanglesRef.current.forEach(rect => rect.setMap(null));
      lightingHeatmapRectanglesRef.current = [];
    };
  }, []);

  // Handle map click listener for report placement
  useEffect(() => {
    if (!mapInstanceRef.current || !onMapClick) return;

    // Remove existing listener if any
    if (clickListenerRef.current) {
      google.maps.event.removeListener(clickListenerRef.current);
    }

    // Add click listener
    const listener = mapInstanceRef.current.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng && mapInstanceRef.current) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();

        // Show temporary marker if in report mode
        if (isReportMode) {
          // Remove previous temp marker
          if (tempMarkerRef.current) {
            tempMarkerRef.current.setMap(null);
          }

          // Get color based on report type
          const getReportColor = (type: string | null) => {
            switch (type) {
              case 'bad_lighting': return '#fbbf24';
              case 'no_sidewalk': return '#f97316';
              case 'suspicious_area': return '#ef4444';
              case 'blocked_path': return '#dc2626';
              default: return '#0ea5e9';
            }
          };

          // Create temporary marker
          const tempMarker = new google.maps.Marker({
            position: { lat, lng },
            map: mapInstanceRef.current,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: getReportColor(pendingReportType),
              fillOpacity: 0.8,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            },
            title: 'Click to place report here',
            animation: google.maps.Animation.DROP,
          });

          tempMarkerRef.current = tempMarker;

          // Close previous info window if any
          if (infoWindowRef.current) {
            infoWindowRef.current.close();
          }

          // Show info window with confirmation
          const infoWindow = new google.maps.InfoWindow({
            content: `<div style="color: #000; padding: 12px; text-align: center; min-width: 150px;">
              <strong style="display: block; margin-bottom: 8px;">Place Report Here?</strong>
              <button id="confirm-report" style="
                background: #0ea5e9;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 600;
                margin-right: 8px;
              ">Confirm</button>
              <button id="cancel-report" style="
                background: #6b7280;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 600;
              ">Cancel</button>
            </div>`,
          });

          infoWindowRef.current = infoWindow;
          infoWindow.open(mapInstanceRef.current, tempMarker);

          // Handle confirm button click
          setTimeout(() => {
            const confirmBtn = document.getElementById('confirm-report');
            const cancelBtn = document.getElementById('cancel-report');
            
            if (confirmBtn) {
              confirmBtn.onclick = () => {
                onMapClick(lat, lng);
                infoWindow.close();
                infoWindowRef.current = null;
                if (tempMarkerRef.current) {
                  tempMarkerRef.current.setMap(null);
                  tempMarkerRef.current = null;
                }
              };
            }
            
            if (cancelBtn) {
              cancelBtn.onclick = () => {
                infoWindow.close();
                infoWindowRef.current = null;
                if (tempMarkerRef.current) {
                  tempMarkerRef.current.setMap(null);
                  tempMarkerRef.current = null;
                }
              };
            }
          }, 100);
        } else {
          // If not in report mode, just call the handler directly
          onMapClick(lat, lng);
        }
      }
    });

    clickListenerRef.current = listener;

    return () => {
      if (clickListenerRef.current) {
        google.maps.event.removeListener(clickListenerRef.current);
        clickListenerRef.current = null;
      }
    };
  }, [onMapClick, isReportMode, pendingReportType]);

  // Update cursor style when in report mode and cleanup temp marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const mapDiv = mapRef.current;
    if (mapDiv) {
      if (isReportMode) {
        mapDiv.style.cursor = 'crosshair';
      } else {
        mapDiv.style.cursor = '';
        // Clear temporary marker and info window when exiting report mode
        if (tempMarkerRef.current) {
          tempMarkerRef.current.setMap(null);
          tempMarkerRef.current = null;
        }
        if (infoWindowRef.current) {
          infoWindowRef.current.close();
          infoWindowRef.current = null;
        }
      }
    }
  }, [isReportMode]);

  // Load crime heatmap data
  useEffect(() => {
    if (activeLayers.heatmap && !heatmapData) {
      processCrimeDataToGrid().then((data) => {
        setHeatmapData(data);
        heatmapDataRef.current = data;
      }).catch((error) => {
        console.error('Error loading heatmap data:', error);
        toast.error('Failed to load heatmap data');
      });
    }
  }, [activeLayers.heatmap, heatmapData]);

  // Load lighting heatmap data
  useEffect(() => {
    if (activeLayers.lightingHeatmap && !lightingHeatmapData) {
      processLightingDataToGrid().then((data) => {
        setLightingHeatmapData(data);
        lightingHeatmapDataRef.current = data;
      }).catch((error) => {
        console.error('Error loading lighting heatmap data:', error);
        toast.error('Failed to load lighting heatmap data');
      });
    }
  }, [activeLayers.lightingHeatmap, lightingHeatmapData]);

  // Display/hide heatmap overlay
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing rectangles
    heatmapRectanglesRef.current.forEach((rect) => rect.setMap(null));
    heatmapRectanglesRef.current = [];

    if (activeLayers.heatmap && heatmapData && heatmapData.cells.length > 0) {
      // Add grid cells as rectangles (exact match to create_grid_map.py)
      heatmapData.cells.forEach((cell) => {
        const rectangle = new google.maps.Rectangle({
          bounds: {
            north: cell.latMax,
            south: cell.latMin,
            east: cell.lngMax,
            west: cell.lngMin,
          },
          fillColor: cell.color,
          fillOpacity: cell.opacity || 0.4, // Use opacity from data (matches create_grid_map.py)
          strokeColor: 'gray',
          strokeOpacity: 1.0,
          strokeWeight: 0.3, // Matches create_grid_map.py weight
          map: mapInstanceRef.current,
        });

        // Add click listener to show info (matching create_grid_map.py popup format)
        rectangle.addListener('click', () => {
          const infoWindow = new google.maps.InfoWindow({
            content: `<div style="color: #000; padding: 8px;">
              <b>Crimes:</b> ${cell.crimeCount}<br/>
              <b>Percentile:</b> ${cell.percentile}th
            </div>`,
          });
          infoWindow.setPosition({
            lat: (cell.latMin + cell.latMax) / 2,
            lng: (cell.lngMin + cell.lngMax) / 2,
          });
          infoWindow.open(mapInstanceRef.current);
        });

        heatmapRectanglesRef.current.push(rectangle);
      });
    }
  }, [activeLayers.heatmap, heatmapData]);

  // Display/hide lighting heatmap overlay
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing lighting rectangles
    lightingHeatmapRectanglesRef.current.forEach((rect) => rect.setMap(null));
    lightingHeatmapRectanglesRef.current = [];

    if (activeLayers.lightingHeatmap && lightingHeatmapData && lightingHeatmapData.cells.length > 0) {
      // Add grid cells as rectangles (exact match to create_lighting_map.py)
      lightingHeatmapData.cells.forEach((cell) => {
        const rectangle = new google.maps.Rectangle({
          bounds: {
            north: cell.latMax,
            south: cell.latMin,
            east: cell.lngMax,
            west: cell.lngMin,
          },
          fillColor: cell.color,
          fillOpacity: cell.opacity || 0.5, // Use opacity from data (matches create_lighting_map.py)
          strokeColor: 'gray',
          strokeOpacity: 1.0,
          strokeWeight: 0.3, // Matches create_lighting_map.py weight
          map: mapInstanceRef.current,
        });

        // Add click listener to show info (matching create_lighting_map.py popup format)
        rectangle.addListener('click', () => {
          const infoWindow = new google.maps.InfoWindow({
            content: `<div style="color: #000; padding: 8px;">
              <b>Streetlights:</b> ${cell.lightCount}<br/>
              <b>Percentile:</b> ${cell.percentile}th
            </div>`,
          });
          infoWindow.setPosition({
            lat: (cell.latMin + cell.latMax) / 2,
            lng: (cell.lngMin + cell.lngMax) / 2,
          });
          infoWindow.open(mapInstanceRef.current);
        });

        lightingHeatmapRectanglesRef.current.push(rectangle);
      });
    }
  }, [activeLayers.lightingHeatmap, lightingHeatmapData]);

  // Handle route calculation and rendering with multiple alternatives
  useEffect(() => {
    if (!mapInstanceRef.current || !routeDestination) return;
    
    // Use routeOrigin if provided, otherwise fall back to userLocation
    const origin = routeOrigin || userLocation;
    if (!origin) return;
    
    if (!window.google || !window.google.maps || !window.google.maps.DirectionsService) return;

    // Create a unique key for this route request
    const baseRouteKey = `${origin.lat},${origin.lng}-${routeDestination.lat},${routeDestination.lng}`;
    const routeKey = `${baseRouteKey}-${selectedRouteType || 'default'}`;
    
    // If we have cached routes and only the selection changed, update display
    const lastBaseKey = lastRouteKeyRef.current?.split('-').slice(0, 2).join('-');
    if (lastBaseKey === baseRouteKey && routeComparisonRef.current && lastRouteKeyRef.current !== routeKey) {
      // Only selection changed - update display with cached data
      const comparison = routeComparisonRef.current;
      const routeToDisplay = selectedRouteType && comparison[selectedRouteType]
        ? comparison[selectedRouteType]
        : comparison.balanced || comparison.shortest || (comparison.routes.length > 0 ? comparison.routes[0] : null);

      if (routeToDisplay && routeToDisplay.route && mapInstanceRef.current && lastDirectionsResultRef.current) {
        // Clear existing polylines
        routePolylinesRef.current.forEach((polyline) => {
          polyline.setMap(null);
        });
        routePolylinesRef.current = [];
        if (directionsRendererRef.current) {
          directionsRendererRef.current.setMap(null);
        }

        // Use the cached directions result
        const originalResult = lastDirectionsResultRef.current;
        const selectedResult: google.maps.DirectionsResult = {
          ...originalResult,
          routes: [routeToDisplay.route],
        };

        // Set color based on selected route type
        let routeColor = '#3b82f6'; // Default blue
        if (selectedRouteType === 'shortest') routeColor = '#3b82f6'; // Blue
        else if (selectedRouteType === 'safest') routeColor = '#10b981'; // Green
        else if (selectedRouteType === 'balanced') routeColor = '#f97316'; // Orange
        // Fallback to route comparison if selectedRouteType is null
        else if (routeToDisplay === comparison.shortest) routeColor = '#3b82f6'; // Blue
        else if (routeToDisplay === comparison.safest) routeColor = '#10b981'; // Green
        else if (routeToDisplay === comparison.balanced) routeColor = '#f97316'; // Orange

        // Create renderer for markers only
        directionsRendererRef.current = new google.maps.DirectionsRenderer({
          map: mapInstanceRef.current!,
          suppressMarkers: false,
          polylineOptions: {
            strokeOpacity: 0, // Hide default polyline
          },
        });
        directionsRendererRef.current.setDirections(selectedResult);
        
        // Create colored polyline for selected route
        const selectedPath: google.maps.LatLng[] = [];
        routeToDisplay.route.legs.forEach((leg) => {
          leg.steps.forEach((step) => {
            step.path.forEach((point) => {
              selectedPath.push(point);
            });
          });
        });
        
        const selectedPolyline = new google.maps.Polyline({
          path: selectedPath,
          strokeColor: routeColor,
          strokeWeight: 12,
          strokeOpacity: 1.0,
          zIndex: 1000,
          map: mapInstanceRef.current!,
        });
        routePolylinesRef.current.push(selectedPolyline);

        // Display other routes
        originalResult.routes.forEach((route) => {
          if (route === routeToDisplay.route) return;

          const altRouteScore = comparison.routes.find(r => r.route === route);
          let altColor = '#94a3b8'; // Neutral gray
          if (altRouteScore) {
            if (altRouteScore === comparison.shortest) altColor = '#60a5fa'; // Light blue
            else if (altRouteScore === comparison.safest) altColor = '#34d399'; // Light green
            else if (altRouteScore === comparison.balanced) altColor = '#fb923c'; // Light orange
          }

          const altPath: google.maps.LatLng[] = [];
          route.legs.forEach((leg) => {
            leg.steps.forEach((step) => {
              step.path.forEach((point) => {
                altPath.push(point);
              });
            });
          });
          
          const altPolyline = new google.maps.Polyline({
            path: altPath,
            strokeColor: altColor,
            strokeWeight: 6,
            strokeOpacity: 0.6,
            zIndex: 500,
            map: mapInstanceRef.current!,
          });
          routePolylinesRef.current.push(altPolyline);
        });

        // Fit map to show entire route
        const bounds = new google.maps.LatLngBounds();
        routeToDisplay.route.legs.forEach((leg) => {
          bounds.extend(leg.start_location);
          bounds.extend(leg.end_location);
        });
        mapInstanceRef.current?.fitBounds(bounds);

        lastRouteKeyRef.current = routeKey;
        return;
      }
    }
    
    // Skip if we've already calculated this exact route
    if (lastRouteKeyRef.current === routeKey) return;
    
    lastRouteKeyRef.current = routeKey;

    const directionsService = new google.maps.DirectionsService();
    
    // Clear existing polylines
    routePolylinesRef.current.forEach((polyline) => {
      polyline.setMap(null);
    });
    routePolylinesRef.current = [];
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }

    const routeRequest: google.maps.DirectionsRequest = {
      origin: new google.maps.LatLng(origin.lat, origin.lng),
      destination: new google.maps.LatLng(routeDestination.lat, routeDestination.lng),
      travelMode: google.maps.TravelMode.WALKING,
      provideRouteAlternatives: true, // Request multiple route alternatives
    };

    directionsService.route(routeRequest, (result, status) => {
      if (status === 'OK' && result && result.routes && result.routes.length > 0) {
        // Store the original result
        lastDirectionsResultRef.current = result;
        
        try {
          // Score and compare routes
          const comparison = compareRoutes(
            result.routes,
            heatmapDataRef.current,
            lightingHeatmapDataRef.current
          );
          routeComparisonRef.current = comparison;

          // Pass comparison to parent
          if (onRoutesCalculated) {
            onRoutesCalculated(comparison);
          }

          // If only one route, use it directly
          if (result.routes.length === 1) {
            const singleRoute = result.routes[0];
            const singleRouteScore = comparison.routes[0];
            
            // Create renderer for markers
            directionsRendererRef.current = new google.maps.DirectionsRenderer({
              map: mapInstanceRef.current!,
              suppressMarkers: false,
              polylineOptions: {
                strokeOpacity: 0,
              },
            });
            
            const singleResult: google.maps.DirectionsResult = {
              ...result,
              routes: [singleRoute],
            };
            directionsRendererRef.current.setDirections(singleResult);
            
            // Create colored polyline
            const singlePath: google.maps.LatLng[] = [];
            singleRoute.legs.forEach((leg) => {
              leg.steps.forEach((step) => {
                step.path.forEach((point) => {
                  singlePath.push(point);
                });
              });
            });
            
            const singlePolyline = new google.maps.Polyline({
              path: singlePath,
              strokeColor: '#3b82f6',
              strokeWeight: 12,
              strokeOpacity: 1.0,
              zIndex: 1000,
              map: mapInstanceRef.current!,
            });
            routePolylinesRef.current.push(singlePolyline);

            // Fit map
            const bounds = new google.maps.LatLngBounds();
            singleRoute.legs.forEach((leg) => {
              bounds.extend(leg.start_location);
              bounds.extend(leg.end_location);
            });
            mapInstanceRef.current?.fitBounds(bounds);
          } else {
            // Multiple routes - display based on selection
            const routeToDisplay = selectedRouteType && comparison[selectedRouteType]
              ? comparison[selectedRouteType]
              : comparison.balanced || comparison.shortest || (comparison.routes.length > 0 ? comparison.routes[0] : null);

            if (routeToDisplay && routeToDisplay.route) {
              const selectedResult: google.maps.DirectionsResult = {
                ...result,
                routes: [routeToDisplay.route],
              };

              // Set color based on selected route type
              let routeColor = '#3b82f6'; // Default blue
              if (selectedRouteType === 'shortest') routeColor = '#3b82f6'; // Blue
              else if (selectedRouteType === 'safest') routeColor = '#10b981'; // Green
              else if (selectedRouteType === 'balanced') routeColor = '#f97316'; // Orange
              // Fallback to route comparison if selectedRouteType is null
              else if (routeToDisplay === comparison.shortest) routeColor = '#3b82f6'; // Blue
              else if (routeToDisplay === comparison.safest) routeColor = '#10b981'; // Green
              else if (routeToDisplay === comparison.balanced) routeColor = '#f97316'; // Orange

              // Create renderer for markers
              directionsRendererRef.current = new google.maps.DirectionsRenderer({
                map: mapInstanceRef.current!,
                suppressMarkers: false,
                polylineOptions: {
                  strokeOpacity: 0,
                },
              });
              directionsRendererRef.current.setDirections(selectedResult);
              
              // Create colored polyline for selected route
              const selectedPath: google.maps.LatLng[] = [];
              routeToDisplay.route.legs.forEach((leg) => {
                leg.steps.forEach((step) => {
                  step.path.forEach((point) => {
                    selectedPath.push(point);
                  });
                });
              });
              
              const selectedPolyline = new google.maps.Polyline({
                path: selectedPath,
                strokeColor: routeColor,
                strokeWeight: 12,
                strokeOpacity: 1.0,
                zIndex: 1000,
                map: mapInstanceRef.current!,
              });
              routePolylinesRef.current.push(selectedPolyline);

              // Display other routes
              result.routes.forEach((route) => {
                if (route === routeToDisplay.route) return;

                const altRouteScore = comparison.routes.find(r => r.route === route);
                let altColor = '#94a3b8'; // Neutral gray
                if (altRouteScore) {
                  if (altRouteScore === comparison.shortest) altColor = '#60a5fa'; // Light blue
                  else if (altRouteScore === comparison.safest) altColor = '#34d399'; // Light green
                  else if (altRouteScore === comparison.balanced) altColor = '#fb923c'; // Light orange
                }

                const altPath: google.maps.LatLng[] = [];
                route.legs.forEach((leg) => {
                  leg.steps.forEach((step) => {
                    step.path.forEach((point) => {
                      altPath.push(point);
                    });
                  });
                });
                
                const altPolyline = new google.maps.Polyline({
                  path: altPath,
                  strokeColor: altColor,
                  strokeWeight: 6,
                  strokeOpacity: 0.6,
                  zIndex: 500,
                  map: mapInstanceRef.current!,
                });
                routePolylinesRef.current.push(altPolyline);
              });

              // Fit map
              const bounds = new google.maps.LatLngBounds();
              routeToDisplay.route.legs.forEach((leg) => {
                bounds.extend(leg.start_location);
                bounds.extend(leg.end_location);
              });
              mapInstanceRef.current?.fitBounds(bounds);
            }
          }
        } catch (error) {
          console.error('Error processing routes:', error);
        }
      } else {
        console.error('Directions request failed due to ' + status);
      }
    });
  }, [routeOrigin, routeDestination, userLocation, selectedRouteType, onRoutesCalculated]);

  // Update markers based on active layers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add community report markers
    if (activeLayers.userReports && communityReports.length > 0) {
      communityReports.forEach((report) => {
        const getReportColor = (type: string) => {
          switch (type) {
            case 'bad_lighting': return '#fbbf24';
            case 'no_sidewalk': return '#f97316';
            case 'suspicious_area': return '#ef4444';
            case 'blocked_path': return '#dc2626';
            default: return '#fbbf24';
          }
        };

        const marker = new google.maps.Marker({
          position: { lat: report.lat, lng: report.lng },
          map: mapInstanceRef.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: getReportColor(report.type),
            fillOpacity: 0.8,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
          title: report.description,
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `<div style="color: #000; padding: 8px; max-width: 200px;">
            <strong>${report.type.replace('_', ' ').toUpperCase()}</strong><br/>
            ${report.description}<br/>
            <small>👍 ${report.upvotes} | 👎 ${report.downvotes}</small>
          </div>`,
        });

        marker.addListener('click', () => {
          infoWindow.open(mapInstanceRef.current, marker);
        });

        markersRef.current.push(marker);
      });
    }
  }, [activeLayers, communityReports]);

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}
      {isReportMode && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <span className="text-sm font-semibold">📍 Click on the map to place your report</span>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full rounded-lg" />
    </div>
  );
};

export default Map;