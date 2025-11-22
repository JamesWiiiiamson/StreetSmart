import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface EmergencyButtonProps {
  onEmergencyClick: () => void;
}

const EmergencyButton = ({ onEmergencyClick }: EmergencyButtonProps) => {
  const handleClick = () => {
    toast.success('Finding nearest safe location...');
    onEmergencyClick();
  };

  return (
    <Button
      onClick={handleClick}
      size="lg"
      className="fixed bottom-6 right-6 z-50 h-16 w-16 rounded-full bg-danger hover:bg-danger/90 shadow-danger-glow transition-all hover:scale-110"
      aria-label="Emergency - Find nearest safe place"
    >
      <AlertCircle className="h-8 w-8" />
    </Button>
  );
};

export default EmergencyButton;
