import { Layers, Lightbulb, Store, Users, Map } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface SafetyLayersProps {
  activeLayers: {
    businesses: boolean;
    userReports: boolean;
    heatmap: boolean;
    lightingHeatmap: boolean;
  };
  onLayerToggle: (layer: 'businesses' | 'userReports' | 'heatmap' | 'lightingHeatmap') => void;
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

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Map className="h-4 w-4 text-primary" />
            <Label htmlFor="heatmap-layer" className="cursor-pointer">
              Crime Heatmap
            </Label>
          </div>
          <Switch
            id="heatmap-layer"
            checked={activeLayers.heatmap}
            onCheckedChange={() => onLayerToggle('heatmap')}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-warning" />
            <Label htmlFor="lighting-heatmap-layer" className="cursor-pointer">
              Lighting Heatmap
            </Label>
          </div>
          <Switch
            id="lighting-heatmap-layer"
            checked={activeLayers.lightingHeatmap}
            onCheckedChange={() => onLayerToggle('lightingHeatmap')}
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
        {activeLayers.heatmap && (
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-sm font-medium mb-3 text-foreground">Crime Heatmap</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4" style={{ backgroundColor: '#FFFFCC' }}></div>
                <span className="text-muted-foreground">Safest (0-10%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4" style={{ backgroundColor: '#FF9933' }}></div>
                <span className="text-muted-foreground">Medium (60-70%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4" style={{ backgroundColor: '#CC0000' }}></div>
                <span className="text-muted-foreground">Most Dangerous (90-100%)</span>
              </div>
            </div>
          </div>
        )}
        {activeLayers.lightingHeatmap && (
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-sm font-medium mb-3 text-foreground">Lighting Heatmap</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4" style={{ backgroundColor: '#10b981' }}></div>
                <span className="text-muted-foreground">Well Lit (90-100%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4" style={{ backgroundColor: '#0ea5e9' }}></div>
                <span className="text-muted-foreground">Good (60-70%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4" style={{ backgroundColor: '#1a1a2e' }}></div>
                <span className="text-muted-foreground">Poorly Lit (0-10%)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default SafetyLayers;
