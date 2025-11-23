export interface CommunityReport {
  id: string;
  lat: number;
  lng: number;
  type: 'bad_lighting' | 'no_sidewalk' | 'suspicious_area' | 'blocked_path';
  description: string;
  timestamp: number;
  upvotes: number;
  downvotes: number;
  reportedBy: string;
}

export const REPORT_TYPES = {
  bad_lighting: {
    label: 'Bad Lighting',
    description: 'Low visibility or missing lights',
    icon: 'lightbulb-off',
    color: '#fbbf24',
  },
  no_sidewalk: {
    label: 'No Sidewalk',
    description: 'No or broken sidewalk',
    icon: 'construction',
    color: '#f97316',
  },
  suspicious_area: {
    label: 'Suspicious Area',
    description: 'Area feels unsafe',
    icon: 'alert-triangle',
    color: '#ef4444',
  },
  blocked_path: {
    label: 'Blocked Path',
    description: 'Construction, debris, or blockage',
    icon: 'octagon',
    color: '#92400e',
  },
} as const;

// Calculate confidence score based on votes
export const getConfidenceScore = (upvotes: number, downvotes: number): number => {
  const total = upvotes + downvotes;
  if (total === 0) return 0;
  return (upvotes / total) * 100;
};

// Check if report is still fresh (within 48 hours)
export const isReportFresh = (timestamp: number): boolean => {
  const now = Date.now();
  const fortyEightHours = 48 * 60 * 60 * 1000;
  return now - timestamp < fortyEightHours;
};

// Filter valid reports (fresh OR confirmed by multiple users)
export const filterValidReports = (reports: CommunityReport[]): CommunityReport[] => {
  return reports.filter((report) => {
    const isFresh = isReportFresh(report.timestamp);
    const isConfirmed = report.upvotes >= 3;
    const confidenceScore = getConfidenceScore(report.upvotes, report.downvotes);
    
    return (isFresh || isConfirmed) && confidenceScore >= 50;
  });
};

// Calculate safety impact for routing algorithm
export const calculateReportImpact = (report: CommunityReport): number => {
  const confidenceScore = getConfidenceScore(report.upvotes, report.downvotes);
  const baseImpact = {
    bad_lighting: -15,
    no_sidewalk: -20,
    suspicious_area: -25,
    blocked_path: -30,
  }[report.type];

  // Scale impact by confidence
  return baseImpact * (confidenceScore / 100);
};

// Get time ago string
export const getTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

// Generate unique ID for new reports
export const generateReportId = (): string => {
  return `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
