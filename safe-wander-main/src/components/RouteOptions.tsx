import { Route, Clock, Shield, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useRef } from 'react';
import { RouteComparison } from '@/lib/heatmapUtils';

interface RouteOptionsProps {
  onRouteRequest: (origin: { 
    placeId: string; 
    address: string; 
    lat: number; 
    lng: number 
  } | null, destination: { 
    placeId: string; 
    address: string; 
    lat: number; 
    lng: number 
  }) => void;
  map?: google.maps.Map | null;
  routeComparison?: RouteComparison | null;
  selectedRouteType?: 'shortest' | 'safest' | 'balanced' | null;
  onRouteTypeSelect?: (type: 'shortest' | 'safest' | 'balanced') => void;
}


const RouteOptions = ({ onRouteRequest, map, routeComparison, selectedRouteType, onRouteTypeSelect }: RouteOptionsProps) => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const originInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const originAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const destinationAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [originData, setOriginData] = useState<{ placeId: string; address: string; lat: number; lng: number } | null>(null);
  const [destinationData, setDestinationData] = useState<{ placeId: string; address: string; lat: number; lng: number } | null>(null);

  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  // Initialize origin autocomplete
  useEffect(() => {
    if (originInputRef.current && window.google && window.google.maps && window.google.maps.places) {
      const autocomplete = new google.maps.places.Autocomplete(originInputRef.current, {
        types: ['geocode', 'establishment'],
        fields: ['place_id', 'formatted_address', 'geometry'],
      });

      if (map) {
        autocomplete.bindTo('bounds', map);
      }

      originAutocompleteRef.current = autocomplete;

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        
        if (place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const address = place.formatted_address || place.name || '';
          
          setOrigin(address);
          setOriginData({
            placeId: place.place_id || '',
            address,
            lat,
            lng,
          });
        }
      });
    }

    return () => {
      if (originAutocompleteRef.current) {
        google.maps.event.clearInstanceListeners(originAutocompleteRef.current);
      }
    };
  }, [map]);

  // Initialize destination autocomplete
  useEffect(() => {
    if (destinationInputRef.current && window.google && window.google.maps && window.google.maps.places) {
      const autocomplete = new google.maps.places.Autocomplete(destinationInputRef.current, {
        types: ['geocode', 'establishment'],
        fields: ['place_id', 'formatted_address', 'geometry'],
      });

      if (map) {
        autocomplete.bindTo('bounds', map);
      }

      destinationAutocompleteRef.current = autocomplete;

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        
        if (place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const address = place.formatted_address || place.name || '';
          
          setDestination(address);
          setDestinationData({
            placeId: place.place_id || '',
            address,
            lat,
            lng,
          });
        }
      });
    }

    return () => {
      if (destinationAutocompleteRef.current) {
        google.maps.event.clearInstanceListeners(destinationAutocompleteRef.current);
      }
    };
  }, [map]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!destinationData) {
      return;
    }
    
    // Use origin if provided, otherwise null (will use user location)
    onRouteRequest(originData, destinationData);
    
    if (originInputRef.current) {
      originInputRef.current.blur();
    }
    if (destinationInputRef.current) {
      destinationInputRef.current.blur();
    }
  };

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center gap-2 mb-4">
        <Route className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Route Options</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="origin" className="text-sm text-foreground">
            Starting Point
          </Label>
          <Input
            ref={originInputRef}
            id="origin"
            type="text"
            placeholder="Use current location or search..."
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="mt-2 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Leave empty to use your current location
          </p>
        </div>

        <div>
          <Label htmlFor="destination" className="text-sm text-foreground">
            Destination *
          </Label>
          <Input
            ref={destinationInputRef}
            id="destination"
            type="text"
            placeholder="Search for a place or address"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="mt-2 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-primary hover:bg-primary/90"
          disabled={!destinationData}
        >
          Find Routes
        </Button>
      </form>

      {/* Route Selection */}
      {routeComparison && routeComparison.routes && routeComparison.routes.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="font-semibold text-sm text-foreground mb-3">Select Route</h4>
          
          {/* Shortest Route */}
          {routeComparison.shortest && routeComparison.shortest.route && (
            <button
              onClick={() => onRouteTypeSelect?.('shortest')}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                selectedRouteType === 'shortest'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-border bg-secondary hover:border-blue-500/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="font-semibold text-sm text-foreground">Shortest Route</span>
                {selectedRouteType === 'shortest' && (
                  <span className="ml-auto text-xs bg-blue-500 text-white px-2 py-0.5 rounded">Selected</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div>Distance: {formatDistance(routeComparison.shortest.distance)}</div>
                <div>Time: {formatDuration(routeComparison.shortest.duration)}</div>
                <div>Safety: {Math.round(routeComparison.shortest.combinedSafetyScore)}/100</div>
              </div>
            </button>
          )}

          {/* Safest Route */}
          {routeComparison.safest && routeComparison.safest.route && (
            <button
              onClick={() => onRouteTypeSelect?.('safest')}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                selectedRouteType === 'safest'
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-border bg-secondary hover:border-green-500/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-4 w-4 text-green-500" />
                <span className="font-semibold text-sm text-foreground">Safest Route</span>
                {selectedRouteType === 'safest' && (
                  <span className="ml-auto text-xs bg-green-500 text-white px-2 py-0.5 rounded">Selected</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div>Distance: {formatDistance(routeComparison.safest.distance)}</div>
                <div>Time: {formatDuration(routeComparison.safest.duration)}</div>
                <div>Safety: {Math.round(routeComparison.safest.combinedSafetyScore)}/100</div>
                <div className="text-green-600">Crime: {Math.round(routeComparison.safest.crimeSafetyScore)}/100 | Lighting: {Math.round(routeComparison.safest.lightingScore)}/100</div>
              </div>
            </button>
          )}

          {/* Balanced Route */}
          {routeComparison.balanced && routeComparison.balanced.route && (
            <button
              onClick={() => onRouteTypeSelect?.('balanced')}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                selectedRouteType === 'balanced'
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-border bg-secondary hover:border-orange-500/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <span className="font-semibold text-sm text-foreground">Balanced Route</span>
                {selectedRouteType === 'balanced' && (
                  <span className="ml-auto text-xs bg-orange-500 text-white px-2 py-0.5 rounded">Selected</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div>Distance: {formatDistance(routeComparison.balanced.distance)}</div>
                <div>Time: {formatDuration(routeComparison.balanced.duration)}</div>
                <div>Safety: {Math.round(routeComparison.balanced.combinedSafetyScore)}/100</div>
                <div className="text-orange-600">Best balance of distance and safety</div>
              </div>
            </button>
          )}
        </div>
      )}
    </Card>
  );
};

export default RouteOptions;
