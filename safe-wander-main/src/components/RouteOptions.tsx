import { Route, Clock, Shield, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useRef } from 'react';

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
}


const RouteOptions = ({ onRouteRequest, map }: RouteOptionsProps) => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const originInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const originAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const destinationAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [originData, setOriginData] = useState<{ placeId: string; address: string; lat: number; lng: number } | null>(null);
  const [destinationData, setDestinationData] = useState<{ placeId: string; address: string; lat: number; lng: number } | null>(null);

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
            Starting Point (optional)
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

      {/* ... rest of existing code (Fastest Route, Safest Route, Safety Score Factors) ... */}
    </Card>
  );
};

export default RouteOptions;
