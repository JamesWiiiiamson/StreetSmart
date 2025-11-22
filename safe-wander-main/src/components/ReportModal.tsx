import { useState } from 'react';
import { X, LightbulbOff, Construction, AlertTriangle, OctagonX, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { REPORT_TYPES } from '@/lib/reportUtils';
import { toast } from 'sonner';

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (type: string, description: string) => void;
}

const ReportModal = ({ open, onClose, onSubmit }: ReportModalProps) => {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [step, setStep] = useState<'select' | 'details'>('select');

  const getIcon = (type: string) => {
    switch (type) {
      case 'bad_lighting':
        return LightbulbOff;
      case 'no_sidewalk':
        return Construction;
      case 'suspicious_area':
        return AlertTriangle;
      case 'blocked_path':
        return OctagonX;
      default:
        return MapPin;
    }
  };

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    setStep('details');
  };

  const handleSubmit = () => {
    if (!selectedType) return;
    
    onSubmit(selectedType, description || REPORT_TYPES[selectedType as keyof typeof REPORT_TYPES].description);
    toast.success('Report submitted! Tap the map to place the marker.');
    handleClose();
  };

  const handleClose = () => {
    setSelectedType(null);
    setDescription('');
    setStep('select');
    onClose();
  };

  const handleBack = () => {
    if (step === 'details') {
      setStep('select');
      setDescription('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {step === 'select' ? 'Report Safety Issue' : 'Add Details'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {step === 'select'
              ? 'Select the type of safety issue you want to report'
              : 'Add additional details (optional) and tap the map to place your report'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' ? (
          <div className="grid grid-cols-2 gap-3 py-4">
            {Object.entries(REPORT_TYPES).map(([key, value]) => {
              const Icon = getIcon(key);
              return (
                <Button
                  key={key}
                  onClick={() => handleTypeSelect(key)}
                  variant="outline"
                  className="h-auto flex-col gap-3 p-4 hover:border-primary hover:bg-secondary"
                >
                  <Icon className="h-8 w-8" style={{ color: value.color }} />
                  <div className="text-center">
                    <div className="font-semibold text-sm text-foreground mb-1">
                      {value.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {value.description}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg border border-border">
              {selectedType && (() => {
                const Icon = getIcon(selectedType);
                const reportType = REPORT_TYPES[selectedType as keyof typeof REPORT_TYPES];
                return (
                  <>
                    <Icon className="h-6 w-6" style={{ color: reportType.color }} />
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-foreground">
                        {reportType.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {reportType.description}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div>
              <Label htmlFor="description" className="text-foreground">
                Additional Details (Optional)
              </Label>
              <Textarea
                id="description"
                placeholder="Add more information about this issue..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-2 bg-secondary border-border text-foreground placeholder:text-muted-foreground min-h-24"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                Continue
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReportModal;
