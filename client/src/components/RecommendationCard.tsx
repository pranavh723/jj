import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Droplets, 
  Car, 
  WashingMachine, 
  Microwave,
  Lightbulb
} from 'lucide-react';

interface Recommendation {
  id: string;
  deviceId: string;
  deviceName?: string | null;
  startTs: string;
  endTs: string;
  reason: string;
  estimatedSavings: number;
  estimatedCo2Avoided: number;
}

interface RecommendationCardProps {
  recommendation: Recommendation;
}

const deviceIcons = {
  'washing machine': WashingMachine,
  'water heater': Droplets,
  'ev charging': Car,
  'microwave': Microwave,
  'lights': Lightbulb,
  'default': Zap
};

function getDeviceIcon(deviceName: string | undefined | null) {
  if (!deviceName) return deviceIcons.default;
  const key = deviceName.toLowerCase();
  for (const [name, icon] of Object.entries(deviceIcons)) {
    if (key.includes(name)) return icon;
  }
  return deviceIcons.default;
}

function getBadgeVariant(savings: number) {
  if (savings > 50) return 'default'; // primary
  if (savings > 25) return 'secondary'; // accent
  return 'outline'; // secondary
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const DeviceIcon = getDeviceIcon(recommendation.deviceName);
  const badgeVariant = getBadgeVariant(recommendation.estimatedSavings);
  
  const timeSlot = `${formatTime(recommendation.startTs)} - ${formatTime(recommendation.endTs)}`;

  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <DeviceIcon className="text-primary w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-foreground" data-testid={`text-device-${recommendation.deviceId}`}>
                {recommendation.deviceName || 'Unknown Device'}
              </h4>
              <Badge variant={badgeVariant as any} data-testid={`badge-recommendation-${recommendation.id}`}>
                Best Time
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2" data-testid={`text-timeslot-${recommendation.id}`}>
              Best time: {timeSlot}
            </p>
            <p className="text-xs text-muted-foreground" data-testid={`text-reason-${recommendation.id}`}>
              {recommendation.reason}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
