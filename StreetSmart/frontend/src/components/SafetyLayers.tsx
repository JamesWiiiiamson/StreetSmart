import { Layers, Lightbulb, Users, Map } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface SafetyLayersProps {
  activeLayers: {
    userReports: boolean;
    heatmap: boolean;
    lightingHeatmap: boolean;
  };
  onLayerToggle: (layer: 'userReports' | 'heatmap' | 'lightingHeatmap') => void;
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
        <h4 className="text-sm font-medium mb-3 text-foreground">Legends</h4>
        
        {activeLayers.heatmap && (
          <div className="mb-4">
            <h5 className="text-xs font-semibold mb-2 text-foreground">Crime Heatmap</h5>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-border/50" style={{ backgroundColor: '#FFFFCC' }}></div>
                <span className="text-muted-foreground">Safest (0-10%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-border/50" style={{ backgroundColor: '#FFFF66' }}></div>
                <span className="text-muted-foreground">Safe (20-30%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-border/50" style={{ backgroundColor: '#FFDB4D' }}></div>
                <span className="text-muted-foreground">Moderate (40-50%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-border/50" style={{ backgroundColor: '#FF9933' }}></div>
                <span className="text-muted-foreground">Caution (60-70%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-border/50" style={{ backgroundColor: '#FF3300' }}></div>
                <span className="text-muted-foreground">High Risk (80-90%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-border/50" style={{ backgroundColor: '#CC0000' }}></div>
                <span className="text-muted-foreground">Most Dangerous (90-100%)</span>
              </div>
            </div>
          </div>
        )}
        
        {activeLayers.lightingHeatmap && (
          <div className={activeLayers.heatmap ? "mt-4 pt-4 border-t border-border" : ""}>
            <h5 className="text-xs font-semibold mb-2 text-foreground">Lighting Heatmap</h5>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-border/50" style={{ backgroundColor: '#fde047' }}></div>
                <span className="text-muted-foreground">Very Well Lit (90-100%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-border/50" style={{ backgroundColor: '#fbbf24' }}></div>
                <span className="text-muted-foreground">Well Lit (80-90%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-border/50" style={{ backgroundColor: '#fb923c' }}></div>
                <span className="text-muted-foreground">Good (70-80%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-border/50" style={{ backgroundColor: '#f97316' }}></div>
                <span className="text-muted-foreground">Moderate (60-70%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-border/50" style={{ backgroundColor: '#dc2626' }}></div>
                <span className="text-muted-foreground">Poor (40-50%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-border/50" style={{ backgroundColor: '#64748b' }}></div>
                <span className="text-muted-foreground">Very Poor (20-30%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-border/50" style={{ backgroundColor: '#1e293b' }}></div>
                <span className="text-muted-foreground">Poorly Lit (0-10%)</span>
              </div>
            </div>
          </div>
        )}
        
        {activeLayers.userReports && (
          <div className={(activeLayers.heatmap || activeLayers.lightingHeatmap) ? "mt-4 pt-4 border-t border-border" : ""}>
            <h5 className="text-xs font-semibold mb-2 text-foreground">User Reports</h5>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#fbbf24' }}></div>
                <span className="text-muted-foreground">Bad Lighting</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f97316' }}></div>
                <span className="text-muted-foreground">No Sidewalk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
                <span className="text-muted-foreground">Suspicious Area</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#92400e' }}></div>
                <span className="text-muted-foreground">Blocked Path</span>
              </div>
            </div>
          </div>
        )}
        
        {!activeLayers.heatmap && !activeLayers.lightingHeatmap && !activeLayers.userReports && (
          <p className="text-xs text-muted-foreground italic">Enable layers to see legends</p>
        )}
      </div>
    </Card>
  );
};

export default SafetyLayers;
