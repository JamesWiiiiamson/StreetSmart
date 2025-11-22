import { MapPin, Clock, Navigation, Fuel, Coffee, ShoppingCart, Train, Dumbbell, Cross } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface SafePlace {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  open24h: boolean;
  isOpen?: boolean; // Whether the place is currently open
  hoursUntilClose?: number;
  distance: string;
}

interface NearbySafePlacesProps {
  places: SafePlace[];
  onPlaceSelect: (place: SafePlace) => void;
  isLoading?: boolean;
}

const NearbySafePlaces = ({ places, onPlaceSelect, isLoading = false }: NearbySafePlacesProps) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'pharmacy':
        return <Cross className="h-5 w-5 text-accent" />;
      case 'gas_station':
        return <Fuel className="h-5 w-5 text-accent" />;
      case 'restaurant':
        return <Coffee className="h-5 w-5 text-accent" />;
      case 'grocery':
        return <ShoppingCart className="h-5 w-5 text-accent" />;
      case 'subway':
        return <Train className="h-5 w-5 text-accent" />;
      case 'gym':
        return <Dumbbell className="h-5 w-5 text-accent" />;
      default:
        return <MapPin className="h-5 w-5 text-accent" />;
    }
  };

  return (
    <Card className="p-4 bg-card border-border h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Nearby Safe Places</h3>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2 mx-auto"></div>
              <p className="text-sm text-muted-foreground">Loading nearby places...</p>
            </div>
          </div>
        ) : places.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">No nearby places found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {places.map((place) => (
            <Card
              key={place.id}
              className="p-3 bg-secondary border-border hover:border-primary transition-colors cursor-pointer"
              onClick={() => onPlaceSelect(place)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">{getIcon(place.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-medium text-sm text-foreground truncate">
                      {place.name}
                    </h4>
                    <div className="flex items-center gap-1 shrink-0">
                      {place.isOpen !== undefined && (
                        <Badge 
                          variant="outline" 
                          className={
                            place.isOpen 
                              ? "bg-success/10 text-success border-success/20" 
                              : "bg-destructive/10 text-destructive border-destructive/20"
                          }
                        >
                          {place.isOpen ? 'Open' : 'Closed'}
                        </Badge>
                      )}
                      {place.open24h && (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                          24/7
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground capitalize mb-2">
                    {place.type.replace('_', ' ')}
                  </p>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Navigation className="h-3 w-3" />
                      <span>{place.distance}</span>
                    </div>
                    {!place.open24h && place.hoursUntilClose && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Closes in {place.hoursUntilClose}h</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Click on any location to get directions
        </p>
      </div>
    </Card>
  );
};

export default NearbySafePlaces;
