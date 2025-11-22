import { Layers, AlertTriangle, Lightbulb, Store, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface SafetyLayersProps {
  activeLayers: {
    crime: boolean;
    lighting: boolean;
    businesses: boolean;
    userReports: boolean;
  };
  onLayerToggle: (layer: 'crime' | 'lighting' | 'businesses' | 'userReports') => void;
}

const SafetyLayers = ({ activeLayers, onLayerToggle }: SafetyLayersProps) => {
  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Safety Layers</h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-danger" />
            <Label htmlFor="crime-layer" className="cursor-pointer">
              Recent Crime
            </Label>
          </div>
          <Switch
            id="crime-layer"
            checked={activeLayers.crime}
            onCheckedChange={() => onLayerToggle('crime')}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-warning" />
            <Label htmlFor="lighting-layer" className="cursor-pointer">
              Street Lighting
            </Label>
          </div>
          <Switch
            id="lighting-layer"
            checked={activeLayers.lighting}
            onCheckedChange={() => onLayerToggle('lighting')}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-accent" />
            <Label htmlFor="business-layer" className="cursor-pointer">
              Open Businesses
            </Label>
          </div>
          <Switch
            id="business-layer"
            checked={activeLayers.businesses}
            onCheckedChange={() => onLayerToggle('businesses')}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            <Label htmlFor="reports-layer" className="cursor-pointer">
              User Reports
            </Label>
          </div>
          <Switch
            id="reports-layer"
            checked={activeLayers.userReports}
            onCheckedChange={() => onLayerToggle('userReports')}
          />
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <h4 className="text-sm font-medium mb-3 text-foreground">Legend</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-danger"></div>
            <span className="text-muted-foreground">High Risk / Low Light</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning"></div>
            <span className="text-muted-foreground">Medium Risk / Medium Light</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success"></div>
            <span className="text-muted-foreground">Safe / Well Lit</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SafetyLayers;
