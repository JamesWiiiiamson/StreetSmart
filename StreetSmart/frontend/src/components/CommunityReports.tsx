import { useEffect, useState } from 'react';
import { ThumbsUp, ThumbsDown, X, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CommunityReport,
  REPORT_TYPES,
  getConfidenceScore,
  getTimeAgo,
  filterValidReports,
} from '@/lib/reportUtils';
import { toast } from 'sonner';

interface CommunityReportsProps {
  reports: CommunityReport[];
  onVote: (reportId: string, voteType: 'up' | 'down') => void;
  onDismiss?: (reportId: string) => void;
}

const CommunityReports = ({ reports, onVote, onDismiss }: CommunityReportsProps) => {
  const [validReports, setValidReports] = useState<CommunityReport[]>([]);

  useEffect(() => {
    setValidReports(filterValidReports(reports));
  }, [reports]);

  const handleVote = (reportId: string, voteType: 'up' | 'down') => {
    onVote(reportId, voteType);
    toast.success(`Vote recorded!`);
  };

  if (validReports.length === 0) {
    return (
      <Card className="p-6 bg-card border-border text-center">
        <p className="text-muted-foreground text-sm">
          No community reports in this area yet
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-card border-border h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Community Reports</h3>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          {validReports.length} Active
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3">
          {validReports.map((report) => {
            const reportType = REPORT_TYPES[report.type];
            const confidenceScore = getConfidenceScore(report.upvotes, report.downvotes);
            const timeAgo = getTimeAgo(report.timestamp);

            return (
              <Card
                key={report.id}
                className="p-3 bg-secondary border-border relative"
              >
                {onDismiss && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDismiss(report.id)}
                    className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-background"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}

                <div className="pr-8">
                  <div className="flex items-start gap-2 mb-2">
                    <Badge
                      variant="outline"
                      style={{
                        backgroundColor: `${reportType.color}20`,
                        borderColor: `${reportType.color}40`,
                        color: reportType.color,
                      }}
                    >
                      {reportType.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {timeAgo}
                    </span>
                  </div>

                  <p className="text-sm text-foreground mb-3">
                    {report.description}
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Confidence:
                      </span>
                      <Progress
                        value={confidenceScore}
                        className="flex-1 h-2"
                      />
                      <span className="text-xs font-medium text-foreground">
                        {Math.round(confidenceScore)}%
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVote(report.id, 'up')}
                        className="flex-1 h-8 bg-success/10 hover:bg-success/20 border-success/20"
                      >
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        <span className="text-xs">{report.upvotes}</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVote(report.id, 'down')}
                        className="flex-1 h-8 bg-danger/10 hover:bg-danger/20 border-danger/20"
                      >
                        <ThumbsDown className="h-3 w-3 mr-1" />
                        <span className="text-xs">{report.downvotes}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Reports auto-expire after 48h unless confirmed by multiple users
        </p>
      </div>
    </Card>
  );
};

export default CommunityReports;
