import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Zap, 
  Battery,
  Leaf,
  AlertTriangle,
  Trophy,
  Medal,
  Award
} from 'lucide-react';

interface CommunityHousehold {
  id: string;
  name: string;
  devices: number;
  dailyConsumption: number;
  renewableShare: number;
  batteryCapacity: number;
  anomalyCount: number;
}

interface CommunitySummary {
  totalHouseholds: number;
  totalEnergyConsumption: number;
  totalRenewableContribution: number;
  totalBatteryStorage: number;
}

interface CommunityData {
  households: CommunityHousehold[];
  summary: CommunitySummary;
}

export default function Community() {
  const { user } = useAuth();
  
  // Fetch centralized data for community insights
  const { data: communityData, isLoading } = useQuery<CommunityData>({
    queryKey: ['/api/data'],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-8 bg-muted rounded"></div>
              </div>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-muted rounded w-1/3"></div>
                <div className="space-y-3">
                  {[...Array(5)].map((_, j) => (
                    <div key={j} className="h-16 bg-muted rounded"></div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!communityData) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Failed to load community data</p>
        </div>
      </div>
    );
  }

  // Extract data with safe fallbacks
  const households = communityData?.households || [];
  const summary = communityData?.summary || {
    totalHouseholds: 0,
    totalEnergyConsumption: 0,
    totalRenewableContribution: 0,
    totalBatteryStorage: 0
  };

  // Sort households by renewable share for leaderboard
  const sortedByEfficiency = [...households].sort((a, b) => b.renewableShare - a.renewableShare);
  const topThree = sortedByEfficiency.slice(0, 3);

  const getDeviceStatusColor = (anomalyCount: number) => {
    if (anomalyCount === 0) return 'text-green-600 bg-green-50 dark:bg-green-950/20';
    if (anomalyCount <= 2) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20';
    return 'text-red-600 bg-red-50 dark:bg-red-950/20';
  };

  const getDeviceStatusIcon = (anomalyCount: number) => {
    if (anomalyCount === 0) return '✅';
    if (anomalyCount <= 2) return '⚠️';
    return '🚨';
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Award className="w-5 h-5 text-amber-600" />;
      default: return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Community Energy Insights</h1>
        <p className="text-muted-foreground">
          Monitor household energy performance and efficiency across the community.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Households</p>
                <p className="text-2xl font-bold" data-testid="text-total-households">
                  {summary.totalHouseholds}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Zap className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Daily Consumption</p>
                <p className="text-2xl font-bold" data-testid="text-total-consumption">
                  {summary.totalEnergyConsumption} <span className="text-sm font-normal">kWh/day</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Leaf className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Renewable Contribution</p>
                <p className="text-2xl font-bold" data-testid="text-renewable-contribution">
                  {summary.totalRenewableContribution} <span className="text-sm font-normal">kWh/day</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Battery className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Battery Storage</p>
                <p className="text-2xl font-bold" data-testid="text-battery-storage">
                  {summary.totalBatteryStorage} <span className="text-sm font-normal">kWh</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Household Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle>Household Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {households.map((household, index) => (
                <div
                  key={household.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  data-testid={`household-row-${index}`}
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground" data-testid={`text-household-name-${index}`}>
                      {household.name}
                    </h4>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                      <span>{household.devices} devices</span>
                      <span>{household.dailyConsumption} kWh/day</span>
                      <span>{household.batteryCapacity} kWh battery</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-600">
                        {household.renewableShare}% renewable
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${getDeviceStatusColor(household.anomalyCount)}`}>
                        {getDeviceStatusIcon(household.anomalyCount)} {household.anomalyCount} issues
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Efficiency Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle>Efficiency Leaderboard</CardTitle>
            <p className="text-sm text-muted-foreground">Ranked by renewable energy share</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topThree.map((household, index) => {
                const rank = index + 1;
                return (
                  <div
                    key={household.id}
                    className={`flex items-center space-x-4 p-4 rounded-lg ${
                      rank === 1 ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-950/20 dark:to-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800' :
                      rank === 2 ? 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-950/20 dark:to-gray-900/20 border-2 border-gray-200 dark:border-gray-800' :
                      'bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20 border-2 border-amber-200 dark:border-amber-800'
                    }`}
                    data-testid={`leaderboard-${rank}`}
                  >
                    <div className="flex items-center space-x-2">
                      {getRankIcon(rank)}
                      <span className="text-2xl font-bold text-muted-foreground">#{rank}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground" data-testid={`text-leader-name-${rank}`}>
                        {household.name}
                      </h4>
                      <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                        <span>{household.devices} devices</span>
                        <span>{household.dailyConsumption} kWh/day</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600" data-testid={`text-renewable-share-${rank}`}>
                        {household.renewableShare}%
                      </div>
                      <div className="text-xs text-muted-foreground">renewable</div>
                    </div>
                  </div>
                );
              })}
              
              {/* Remaining households summary */}
              {households.length > 3 && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    +{households.length - 3} more households in the community
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}