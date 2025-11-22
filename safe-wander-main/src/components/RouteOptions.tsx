import { Route, Clock, Shield, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useRef } from 'react';

interface RouteOptionsProps {
  onRouteRequest: (destination: { 
    placeId: string; 
    address: string; 
    lat: number; 
    lng: number 
  }) => void;
  map?: google.maps.Map | null;
}


const RouteOptions = ({ onRouteRequest, map }: RouteOptionsProps) => {
  const [destination, setDestination] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (inputRef.current && window.google && window.google.maps && window.google.maps.places) {
      // Initialize Autocomplete
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['geocode', 'establishment'],
        fields: ['place_id', 'formatted_address', 'geometry'],
      });

      // Bind autocomplete to map bounds if map is available
      if (map) {
        autocomplete.bindTo('bounds', map);
      }

      autocompleteRef.current = autocomplete;

      // Listen for place selection
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        
        if (place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          
          const address = place.formatted_address || place.name || '';
          setDestination(address);
          
          onRouteRequest({
            placeId: place.place_id || '',
            address,
            lat,
            lng,
          });
        }
      });
    }

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [map, onRouteRequest]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // The autocomplete listener will handle the route request
    if (inputRef.current) {
      inputRef.current.blur();
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
          <Label htmlFor="destination" className="text-sm text-foreground">
            Where are you going?
          </Label>
          <Input
            ref={inputRef}
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
          disabled={!destination.trim()}
        >
          Find Routes
        </Button>
      </form>

      {/* ... rest of existing code (Fastest Route, Safest Route, Safety Score Factors) ... */}
    </Card>
  );
};

export default RouteOptions;
