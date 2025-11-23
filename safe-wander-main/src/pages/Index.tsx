import { useState, useEffect, useCallback } from 'react';
import Map from '@/components/Map';
import SafetyLayers from '@/components/SafetyLayers';
import EmergencyButton from '@/components/EmergencyButton';
import NearbySafePlaces from '@/components/NearbySafePlaces';
import RouteOptions from '@/components/RouteOptions';
import ReportButton from '@/components/ReportButton';
import ReportModal from '@/components/ReportModal';
import CommunityReports from '@/components/CommunityReports';
import { toast } from 'sonner';
import { CommunityReport, generateReportId } from '@/lib/reportUtils';
import { testBackend } from "../lib/api.js";
import { fetchNearbyPlaces, SafePlace } from '@/lib/placesUtils';
import { RouteComparison } from '@/lib/heatmapUtils';


const Index = () => {
  const [activeLayers, setActiveLayers] = useState({
    businesses: false,
    userReports: true,
    heatmap: false,
    lightingHeatmap: false,
  });

  const [crimeData, setCrimeData] = useState([]);
  const [lightingData, setLightingData] = useState([]);
  const [safePlaces, setSafePlaces] = useState<SafePlace[]>([]);
  const [communityReports, setCommunityReports] = useState<CommunityReport[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [pendingReport, setPendingReport] = useState<{ type: string; description: string } | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [routeOrigin, setRouteOrigin] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [routeDestination, setRouteDestination] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [routeComparison, setRouteComparison] = useState<RouteComparison | null>(null);
  const [selectedRouteType, setSelectedRouteType] = useState<'shortest' | 'safest' | 'balanced' | null>(null);

  console.log("communityReports", communityReports)

  useEffect(() => {
    // Load mock data
    Promise.all([
      fetch('/data/crime-data.json').then(res => res.json()),
      fetch('/data/lighting-data.json').then(res => res.json()),
      fetch('/data/community-reports.json').then(res => res.json()),
    ])
      .then(([crime, lighting, reports]) => {
        setCrimeData(crime);
        setLightingData(lighting);
        setCommunityReports(reports);
      })
      .catch((error) => {
        console.error('Error loading data:', error);
        toast.error('Failed to load safety data');
      });
        testBackend().then(data => {
    console.log("Backend says:", data);
  });

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
        },
        () => {
          // Default to Toronto if geolocation denied
          const defaultLocation = { lat: 43.6532, lng: -79.3832 };
          setUserLocation(defaultLocation);
        }
      );
    } else {
      setUserLocation({ lat: 43.6532, lng: -79.3832 });
    }
  }, []);

  const loadNearbyPlaces = useCallback(async () => {
    if (!userLocation) return;
    
    // Make sure Google Maps Places API is loaded
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      console.warn('Google Maps Places API not loaded yet');
      return;
    }
    
    setIsLoadingPlaces(true);
    try {
      const places = await fetchNearbyPlaces(userLocation.lat, userLocation.lng, 2000, mapInstance);
      setSafePlaces(places);
      if (places.length > 0) {
        toast.success(`Found ${places.length} nearby safe places`);
      } else {
        // No places found, try fallback to mock data
        console.warn('No places found from Google Places API, using fallback data');
        fetch('/data/safe-places.json')
          .then(res => res.json())
          .then(mockPlaces => {
            // Update distances for mock places based on user location
            const updatedPlaces = mockPlaces.map((place: any) => {
              const distanceMeters = Math.sqrt(
                Math.pow((place.lat - userLocation.lat) * 111000, 2) +
                Math.pow((place.lng - userLocation.lng) * 111000 * Math.cos(userLocation.lat * Math.PI / 180), 2)
              );
              return {
                ...place,
                distanceMeters,
                distance: distanceMeters < 1000 ? `${Math.round(distanceMeters)}m` : `${(distanceMeters / 1000).toFixed(1)}km`
              };
            });
            setSafePlaces(updatedPlaces);
            toast.info('Using default safe places data');
          })
          .catch(() => {
            toast.warning('No safe places available');
          });
      }
    } catch (error) {
      console.error('Error fetching nearby places:', error);
      toast.error('Failed to load nearby places. Using default data.');
      // Fallback to mock data
      fetch('/data/safe-places.json')
        .then(res => res.json())
        .then(places => {
          // Update distances for mock places based on user location
          const updatedPlaces = places.map((place: any) => {
            const distanceMeters = Math.sqrt(
              Math.pow((place.lat - userLocation.lat) * 111000, 2) +
              Math.pow((place.lng - userLocation.lng) * 111000 * Math.cos(userLocation.lat * Math.PI / 180), 2)
            );
            return {
              ...place,
              distanceMeters,
              distance: distanceMeters < 1000 ? `${Math.round(distanceMeters)}m` : `${(distanceMeters / 1000).toFixed(1)}km`
            };
          });
          setSafePlaces(updatedPlaces);
        })
        .catch(() => {
          toast.error('Failed to load safe places data');
        });
    } finally {
      setIsLoadingPlaces(false);
    }
  }, [userLocation, mapInstance]);

  // Fetch nearby places when user location and Google Maps are available
  useEffect(() => {
    if (!userLocation) return;
    
    let timeoutId: NodeJS.Timeout | null = null;
    
    // Wait for Google Maps Places API to be fully loaded
    const checkAndLoad = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        loadNearbyPlaces();
      } else {
        // Retry after a short delay
        timeoutId = setTimeout(checkAndLoad, 500);
      }
    };
    
    checkAndLoad();
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [userLocation, mapInstance, loadNearbyPlaces]);

  const handleLayerToggle = (layer: 'businesses' | 'userReports' | 'heatmap' | 'lightingHeatmap') => {
    setActiveLayers((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  };

  const handleEmergencyClick = () => {
    // Find nearest 24/7 place
    const emergencyPlace = safePlaces.find((place) => place.open24h);
    if (emergencyPlace) {
      handlePlaceSelect(emergencyPlace);
      toast.success(`Nearest safe place: ${emergencyPlace.name} (${emergencyPlace.distance})`);
    } else if (safePlaces.length > 0) {
      // If no 24/7 place, use the nearest one
      handlePlaceSelect(safePlaces[0]);
      toast.info(`Nearest safe place: ${safePlaces[0].name} (${safePlaces[0].distance})`);
    } else {
      toast.error('No safe places found nearby');
    }
  };

  const handlePlaceSelect = (place: SafePlace) => {
    if (!userLocation) {
      toast.error('User location not available');
      return;
    }
    
    setRouteDestination({
      lat: place.lat,
      lng: place.lng,
      address: place.address || place.name,
    });
    toast.success(`Route to ${place.name} calculated!`);
  };

  const handleMapLoad = (map: google.maps.Map) => {
    setMapInstance(map);
  };

  const handleRoutesCalculated = (comparison: RouteComparison) => {
    setRouteComparison(comparison);
    // Default to balanced route if available, but only if no route is currently selected
    if (!selectedRouteType) {
      if (comparison.balanced && comparison.balanced.route) {
        setSelectedRouteType('balanced');
      } else if (comparison.shortest && comparison.shortest.route) {
        setSelectedRouteType('shortest');
      } else if (comparison.safest && comparison.safest.route) {
        setSelectedRouteType('safest');
      }
    }
  };

  const handleRouteTypeSelect = (type: 'shortest' | 'safest' | 'balanced') => {
    setSelectedRouteType(type);
  };

  const handleRouteRequest = useCallback((
    origin: { 
      placeId: string; 
      address: string; 
      lat: number; 
      lng: number 
    } | null,
    destination: { 
      placeId: string; 
      address: string; 
      lat: number; 
      lng: number 
    }
  ) => {
    // If no origin provided, check if user location is available
    if (!origin && !userLocation) {
      toast.error('Please provide a starting point or enable location services.');
      return;
    }
    
    // Set origin if provided, otherwise will use userLocation in Map component
    if (origin) {
      setRouteOrigin({
        lat: origin.lat,
        lng: origin.lng,
        address: origin.address,
      });
    } else {
      setRouteOrigin(null);
    }
    
    setRouteDestination({
      lat: destination.lat,
      lng: destination.lng,
      address: destination.address,
    });
    
    const originText = origin ? origin.address : 'your location';
    toast.success(`Route from ${originText} to ${destination.address} calculated!`);
  }, [userLocation]);


  const handleReportSubmit = (type: string, description: string) => {
    setPendingReport({ type, description });
    toast.info('Tap the map to place your report marker');
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (pendingReport) {
      const newReport: CommunityReport = {
        id: generateReportId(),
        lat,
        lng,
        type: pendingReport.type as any,
        description: pendingReport.description,
        timestamp: Date.now(),
        upvotes: 0,
        downvotes: 0,
        reportedBy: 'current-user',
      };

      setCommunityReports([...communityReports, newReport]);
      setPendingReport(null);
      toast.success('Report placed successfully!');
    }
  };

  const handleVote = (reportId: string, voteType: 'up' | 'down') => {
    setCommunityReports(reports =>
      reports.map(report =>
        report.id === reportId
          ? {
              ...report,
              upvotes: voteType === 'up' ? report.upvotes + 1 : report.upvotes,
              downvotes: voteType === 'down' ? report.downvotes + 1 : report.downvotes,
            }
          : report
      )
    );
  };

  const handleDismissReport = (reportId: string) => {
    setCommunityReports(reports => reports.filter(r => r.id !== reportId));
    toast.success('Report dismissed');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-200 overflow-hidden">
              <img 
                src="/Hackwestern logo (3).png" 
                alt="StreetSmart Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">StreetSmart</h1>
              <p className="text-xs text-muted-foreground">Intelligent Safety Navigation</p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground hidden sm:block">
            Real-time safety routing
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 h-screen flex">
        {/* Left Sidebar */}
        <aside className="w-80 bg-card border-r border-border overflow-y-auto p-4 space-y-4 hidden lg:block">
          <SafetyLayers activeLayers={activeLayers} onLayerToggle={handleLayerToggle} />
          <RouteOptions 
            onRouteRequest={handleRouteRequest} 
            map={mapInstance}
            routeComparison={routeComparison}
            selectedRouteType={selectedRouteType}
            onRouteTypeSelect={handleRouteTypeSelect}
          />
        </aside>

        {/* Map */}
        <div className="flex-1 relative">
          <Map
            crimeData={crimeData}
            lightingData={lightingData}
            communityReports={communityReports}
            activeLayers={activeLayers}
            onMapClick={handleMapClick}
            onMapLoad={handleMapLoad}
            routeOrigin={routeOrigin}
            routeDestination={routeDestination}
            userLocation={userLocation}
            isReportMode={!!pendingReport}
            pendingReportType={pendingReport?.type || null}
            onRoutesCalculated={handleRoutesCalculated}
            selectedRouteType={selectedRouteType}
          />

          {/* Mobile Controls */}
          <div className="lg:hidden absolute top-4 left-4 right-4 z-30 space-y-2">
            <SafetyLayers activeLayers={activeLayers} onLayerToggle={handleLayerToggle} />
          </div>

          {/* Report Button - positioned on map */}
          <ReportButton onClick={() => setIsReportModalOpen(true)} />
        </div>

        {/* Right Sidebar */}
        <aside className="w-80 bg-card border-l border-border overflow-y-auto p-4 space-y-4 hidden xl:block">
          <NearbySafePlaces places={safePlaces} onPlaceSelect={handlePlaceSelect} isLoading={isLoadingPlaces} />
          <CommunityReports 
            reports={communityReports} 
            onVote={handleVote}
            onDismiss={handleDismissReport}
          />
        </aside>

        {/* Report Modal */}
        <ReportModal
          open={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          onSubmit={handleReportSubmit}
        />

        {/* Emergency Button */}
        <EmergencyButton onEmergencyClick={handleEmergencyClick} />
      </main>

      {/* Mobile Bottom Sheet Preview */}
      <div className="xl:hidden fixed bottom-20 left-4 right-4 z-30">
        <div className="bg-card rounded-lg border border-border p-4 max-h-48 overflow-hidden shadow-glow">
          <h3 className="font-semibold text-foreground mb-2 text-sm">Nearby Safe Places</h3>
          <div className="space-y-2">
            {safePlaces.slice(0, 2).map((place: any) => (
              <div key={place.id} className="text-xs text-muted-foreground">
                {place.name} - {place.distance}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
