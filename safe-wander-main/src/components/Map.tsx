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
  const [isLoading, setIsLoading] = useState(true);

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
      
      // Add click listener for placing reports
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
      // Cleanup markers
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

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add crime markers
    if (activeLayers.crime && crimeData.length > 0) {
      crimeData.forEach((crime) => {
        const marker = new google.maps.Marker({
          position: { lat: crime.lat, lng: crime.lng },
          map: mapInstanceRef.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: crime.severity === 'high' ? 8 : crime.severity === 'medium' ? 6 : 4,
            fillColor: crime.severity === 'high' ? '#ef4444' : crime.severity === 'medium' ? '#f97316' : '#fbbf24',
            fillOpacity: 0.7,
            strokeColor: '#ffffff',
            strokeWeight: 1,
          },
          title: `${crime.type} - ${crime.description}`,
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `<div style="color: #000; padding: 8px;">
            <strong>${crime.type.toUpperCase()}</strong><br/>
            ${crime.description}<br/>
            <small>Severity: ${crime.severity}</small>
          </div>`,
        });

        marker.addListener('click', () => {
          infoWindow.open(mapInstanceRef.current, marker);
        });

        markersRef.current.push(marker);
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
            scale: 5,
            fillColor: light.level === 'high' ? '#10b981' : light.level === 'medium' ? '#fbbf24' : '#ef4444',
            fillOpacity: 0.6,
            strokeColor: '#ffffff',
            strokeWeight: 1,
          },
          title: `Lighting: ${light.level}`,
        });

        markersRef.current.push(marker);
      });
    }

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

export default Map;
