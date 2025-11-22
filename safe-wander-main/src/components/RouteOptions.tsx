import { Route, Clock, Shield, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface RouteOptionsProps {
  onRouteRequest: (destination: string) => void;
}

const RouteOptions = ({ onRouteRequest }: RouteOptionsProps) => {
  const [destination, setDestination] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (destination.trim()) {
      onRouteRequest(destination);
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
            id="destination"
            type="text"
            placeholder="Enter destination address"
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

      <div className="mt-6 space-y-3">
        <div className="flex items-start gap-3 p-3 bg-secondary rounded-lg border border-border">
          <Clock className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-sm text-foreground mb-1">Fastest Route</h4>
            <p className="text-xs text-muted-foreground">
              Prioritizes shortest travel time
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-success/10 rounded-lg border border-success/20">
          <Shield className="h-5 w-5 text-success shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-sm text-foreground mb-1">Safest Route</h4>
            <p className="text-xs text-muted-foreground">
              Avoids crime hotspots and dark areas
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <h4 className="text-sm font-medium mb-3 text-foreground">Safety Score Factors</h4>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3 w-3" />
            <span>Recent crime activity</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3 w-3" />
            <span>Street lighting levels</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3 w-3" />
            <span>Commercial activity</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3 w-3" />
            <span>Time of day</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default RouteOptions;
