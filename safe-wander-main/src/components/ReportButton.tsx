import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReportButtonProps {
  onClick: () => void;
}

const ReportButton = ({ onClick }: ReportButtonProps) => {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className="absolute bottom-6 left-6 z-50 h-14 px-6 rounded-full bg-gradient-primary hover:opacity-90 shadow-glow transition-all hover:scale-105 pointer-events-auto"
      aria-label="Report safety issue"
    >
      <Plus className="h-5 w-5 mr-2" />
      <span className="font-semibold">Report Issue</span>
    </Button>
  );
};

export default ReportButton;
