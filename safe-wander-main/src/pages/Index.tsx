import { useState, useEffect } from 'react';
import Map from '@/components/Map';
import SafetyLayers from '@/components/SafetyLayers';
import EmergencyButton from '@/components/EmergencyButton';
import NearbySafePlaces from '@/components/NearbySafePlaces';
import RouteOptions from '@/components/RouteOptions';
import ReportButton from '@/components/ReportButton';
import ReportModal from '@/components/ReportModal';
import CommunityReports from '@/components/CommunityReports';
import { Shield } from 'lucide-react';
import { toast } from 'sonner';
import { CommunityReport, generateReportId } from '@/lib/reportUtils';

const Index = () => {
  const [activeLayers, setActiveLayers] = useState({
    crime: true,
    lighting: true,
    businesses: false,
    userReports: true,
  });

  const [crimeData, setCrimeData] = useState([]);
  const [lightingData, setLightingData] = useState([]);
  const [safePlaces, setSafePlaces] = useState([]);
  const [communityReports, setCommunityReports] = useState<CommunityReport[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [pendingReport, setPendingReport] = useState<{ type: string; description: string } | null>(null);

  useEffect(() => {
    // Load mock data
    Promise.all([
      fetch('/data/crime-data.json').then(res => res.json()),
      fetch('/data/lighting-data.json').then(res => res.json()),
      fetch('/data/safe-places.json').then(res => res.json()),
      fetch('/data/community-reports.json').then(res => res.json()),
    ])
      .then(([crime, lighting, places, reports]) => {
        setCrimeData(crime);
        setLightingData(lighting);
        setSafePlaces(places);
        setCommunityReports(reports);
      })
      .catch((error) => {
        console.error('Error loading data:', error);
        toast.error('Failed to load safety data');
      });
  }, []);

  const handleLayerToggle = (layer: 'crime' | 'lighting' | 'businesses' | 'userReports') => {
    setActiveLayers((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  };

  const handleEmergencyClick = () => {
    // Find nearest 24/7 place
    const emergencyPlace = safePlaces.find((place: any) => place.open24h);
    if (emergencyPlace) {
      toast.success(`Nearest safe place: ${emergencyPlace.name} (${emergencyPlace.distance})`);
    }
  };

  const handlePlaceSelect = (place: any) => {
    toast.info(`Getting directions to ${place.name}...`);
  };

  const handleRouteRequest = (destination: string) => {
    toast.info(`Calculating safest route to ${destination}...`);
  };

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
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-primary">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">SafeRoute</h1>
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
          <RouteOptions onRouteRequest={handleRouteRequest} />
        </aside>

        {/* Map */}
        <div className="flex-1 relative">
          <Map
            crimeData={crimeData}
            lightingData={lightingData}
            communityReports={communityReports}
            activeLayers={activeLayers}
            onMapClick={handleMapClick}
          />

          {/* Mobile Controls */}
          <div className="lg:hidden absolute top-4 left-4 right-4 z-30 space-y-2">
            <SafetyLayers activeLayers={activeLayers} onLayerToggle={handleLayerToggle} />
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="w-80 bg-card border-l border-border overflow-y-auto p-4 space-y-4 hidden xl:block">
          <NearbySafePlaces places={safePlaces} onPlaceSelect={handlePlaceSelect} />
          <CommunityReports 
            reports={communityReports} 
            onVote={handleVote}
            onDismiss={handleDismissReport}
          />
        </aside>

        {/* Report Button */}
        <ReportButton onClick={() => setIsReportModalOpen(true)} />

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
