import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface MapProps {
  onMapLoad?: (map: google.maps.Map) => void;
  crimeData?: any[];
  lightingData?: any[];
  communityReports?: any[];
  activeLayers: {
    crime: boolean;
    lighting: boolean;
    businesses: boolean;
    userReports: boolean;
  };
  onMapClick?: (lat: number, lng: number) => void;
  routeDestination?: { lat: number; lng: number; address: string } | null;
  userLocation?: { lat: number; lng: number } | null;
}

const Map = ({ onMapLoad, crimeData = [], lightingData = [], communityReports = [], activeLayers, onMapClick, routeDestination, userLocation }: MapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const userLocationMarkerRef = useRef<google.maps.Marker | null>(null);
// SVG icons for different report types
const REPORT_ICONS = {
  bad_lighting: {
    path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
    color: '#fbbf24',
    label: '💡',
  },
  no_sidewalk: {
    path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
    color: '#f97316',
    label: '🚧',
  },
  suspicious_area: {
    path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
    color: '#ef4444',
    label: '⚠️',
  },
  blocked_path: {
    path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
    color: '#dc2626',
    label: '🚫',
  },
};

const Map = ({ onMapLoad, crimeData = [], lightingData = [], communityReports = [], activeLayers, onMapClick }: MapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowsRef = useRef<google.maps.InfoWindow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      toast.error('Google Maps API key not configured. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file');
      setIsLoading(false);
      return;
    }

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
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            initMap(position.coords.latitude, position.coords.longitude);
          },
          () => {
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
          { elementType: 'geometry', stylers: [{ color: '#1a1f2e' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1f2e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#8b9dc3' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c3441' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#1a2332' }] },
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
          scale: 12,
          fillColor: '#0ea5e9',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        title: 'Your Location',
        zIndex: 1000,
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
      
      if (onMapClick) {
        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            onMapClick(e.latLng.lat(), e.latLng.lng());
          }
        });
      }
      
      if (onMapLoad) {
        onMapLoad(map);
      }
    };

    return () => {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.setMap(null);
      }
    };
  }, []);

  // Handle route calculation and rendering
  useEffect(() => {
    if (!mapInstanceRef.current || !routeDestination || !userLocation) return;
    if (!window.google || !window.google.maps || !window.google.maps.DirectionsService) return;

    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = directionsRendererRef.current;

    if (!directionsRenderer) return;

    directionsService.route(
      {
        origin: new google.maps.LatLng(userLocation.lat, userLocation.lng),
        destination: new google.maps.LatLng(routeDestination.lat, routeDestination.lng),
        travelMode: google.maps.TravelMode.WALKING,
      },
      (result, status) => {
        if (status === 'OK' && result) {
          directionsRenderer.setDirections(result);
          // Fit map to show entire route
          const bounds = new google.maps.LatLngBounds();
          result.routes[0].legs.forEach((leg) => {
            bounds.extend(leg.start_location);
            bounds.extend(leg.end_location);
          });
          mapInstanceRef.current?.fitBounds(bounds);
        } else {
          console.error('Directions request failed due to ' + status);
        }
      }
    );
  }, [routeDestination, userLocation]);

  // Update markers based on active layers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers and info windows
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    infoWindowsRef.current.forEach(iw => iw.close());
    infoWindowsRef.current = [];

    // Add crime markers
    if (activeLayers.crime && crimeData.length > 0) {
      crimeData.forEach((crime) => {
        const marker = new google.maps.Marker({
          position: { lat: crime.lat, lng: crime.lng },
          map: mapInstanceRef.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: crime.severity === 'high' ? 10 : crime.severity === 'medium' ? 8 : 6,
            fillColor: crime.severity === 'high' ? '#ef4444' : crime.severity === 'medium' ? '#f97316' : '#fbbf24',
            fillOpacity: 0.8,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
          title: `${crime.type} - ${crime.description}`,
          zIndex: 100,
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="color: #000; padding: 12px; max-width: 220px; font-family: system-ui;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="font-size: 20px;">🚨</span>
                <strong style="font-size: 14px; text-transform: uppercase;">${crime.type}</strong>
              </div>
              <p style="margin: 0 0 8px 0; font-size: 13px;">${crime.description}</p>
              <span style="background: ${crime.severity === 'high' ? '#fee2e2' : crime.severity === 'medium' ? '#ffedd5' : '#fef3c7'}; 
                     color: ${crime.severity === 'high' ? '#dc2626' : crime.severity === 'medium' ? '#ea580c' : '#d97706'}; 
                     padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                ${crime.severity.toUpperCase()} SEVERITY
              </span>
            </div>
          `,
        });

        marker.addListener('click', () => {
          infoWindowsRef.current.forEach(iw => iw.close());
          infoWindow.open(mapInstanceRef.current, marker);
        });

        markersRef.current.push(marker);
        infoWindowsRef.current.push(infoWindow);
      });
    }

    // Add lighting markers
    if (activeLayers.lighting && lightingData.length > 0) {
      lightingData.forEach((light) => {
        const marker = new google.maps.Marker({
          position: { lat: light.lat, lng: light.lng },
          map: mapInstanceRef.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: light.level === 'high' ? '#10b981' : light.level === 'medium' ? '#fbbf24' : '#ef4444',
            fillOpacity: 0.7,
            strokeColor: '#ffffff',
            strokeWeight: 1,
          },
          title: `Lighting: ${light.level}`,
          zIndex: 50,
        });

        markersRef.current.push(marker);
      });
    }

    // Add community report markers with custom icons
    if (activeLayers.userReports && communityReports.length > 0) {
      communityReports.forEach((report) => {
        const reportConfig = REPORT_ICONS[report.type as keyof typeof REPORT_ICONS] || REPORT_ICONS.suspicious_area;
        
        // Create a custom marker with label
        const marker = new google.maps.Marker({
          position: { lat: report.lat, lng: report.lng },
          map: mapInstanceRef.current,
          icon: {
            path: 'M12 0C5.4 0 0 5.4 0 12c0 7.2 12 24 12 24s12-16.8 12-24C24 5.4 18.6 0 12 0z',
            fillColor: reportConfig.color,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            scale: 1.5,
            anchor: new google.maps.Point(12, 36),
            labelOrigin: new google.maps.Point(12, 12),
          },
          label: {
            text: reportConfig.label,
            fontSize: '16px',
          },
          title: report.description,
          zIndex: 200,
          animation: google.maps.Animation.DROP,
        });

        const timeAgo = getTimeAgo(report.timestamp);
        const confidencePercent = report.upvotes + report.downvotes > 0 
          ? Math.round((report.upvotes / (report.upvotes + report.downvotes)) * 100) 
          : 0;

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="color: #000; padding: 12px; max-width: 250px; font-family: system-ui;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                <span style="font-size: 24px;">${reportConfig.label}</span>
                <div>
                  <strong style="font-size: 14px; display: block; text-transform: uppercase; color: ${reportConfig.color};">
                    ${report.type.replace('_', ' ')}
                  </strong>
                  <span style="font-size: 11px; color: #666;">${timeAgo}</span>
                </div>
              </div>
              <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 1.4;">${report.description}</p>
              <div style="display: flex; gap: 12px; align-items: center; padding-top: 8px; border-top: 1px solid #eee;">
                <div style="display: flex; align-items: center; gap: 4px;">
                  <span style="color: #10b981;">👍</span>
                  <span style="font-weight: 600;">${report.upvotes}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                  <span style="color: #ef4444;">👎</span>
                  <span style="font-weight: 600;">${report.downvotes}</span>
                </div>
                <div style="margin-left: auto; background: #f3f4f6; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                  ${confidencePercent}% confidence
                </div>
              </div>
            </div>
          `,
        });

        marker.addListener('click', () => {
          infoWindowsRef.current.forEach(iw => iw.close());
          infoWindow.open(mapInstanceRef.current, marker);
        });

        // Add hover effect
        marker.addListener('mouseover', () => {
          marker.setAnimation(google.maps.Animation.BOUNCE);
          setTimeout(() => marker.setAnimation(null), 700);
        });

        markersRef.current.push(marker);
        infoWindowsRef.current.push(infoWindow);
      });
    }
  }, [activeLayers, crimeData, lightingData, communityReports]);

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
      <div ref={mapRef} className="w-full h-full rounded-lg" />
    </div>
  );
};

// Helper function for time ago
const getTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

export default Map;