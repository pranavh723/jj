import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CommunityLeaderboard } from '@/components/CommunityLeaderboard';
import { 
  Users, 
  Trophy, 
  Target, 
  TrendingUp,
  MapPin,
  Calendar,
  Award,
  Leaf,
  IndianRupee,
  Zap,
  Medal
} from 'lucide-react';

interface Community {
  id: string;
  name: string;
  city: string;
  description?: string;
  memberCount?: number;
  avgRenewableShare?: number;
  totalSavings?: number;
  totalCO2Avoided?: number;
}

export default function Community() {
  const [selectedCommunity, setSelectedCommunity] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  // Fetch communities
  const { data: communities = [], isLoading: isLoadingCommunities } = useQuery({
    queryKey: ['/api/communities'],
    queryFn: () => api.getCommunities(),
  });

  // Set first community as default
  React.useEffect(() => {
    if (communities.length > 0 && !selectedCommunity) {
      setSelectedCommunity(communities[0].id);
    }
  }, [communities, selectedCommunity]);

  // Fetch leaderboard for selected community
  const { 
    data: leaderboard = [], 
    isLoading: isLoadingLeaderboard 
  } = useQuery({
    queryKey: ['/api/community', selectedCommunity, 'leaderboard'],
    queryFn: () => api.getLeaderboard(selectedCommunity),
    enabled: !!selectedCommunity,
  });

  // Mock community data (in real app, this would come from API)
  const communityStats = {
    totalMembers: 45,
    activeMembers: 38,
    avgRenewableShare: 68,
    monthlyGrowth: 12,
  };

  // Process leaderboard data
  const processedLeaderboard = React.useMemo(() => {
    if (!leaderboard.length) {
      // Mock data for demonstration
      return {
        renewableShareLeaders: [
          { rank: 1, name: 'Raj Sharma', unit: 'Flat 302', percentage: 84, points: 120 },
          { rank: 2, name: 'Priya Patel', unit: 'Flat 105', percentage: 78, points: 95 },
          { rank: 3, name: 'Amit Kumar', unit: 'Flat 201', percentage: 72, points: 80 },
        ],
        costSavingsLeaders: [
          { rank: 1, name: 'Priya Patel', unit: 'Flat 105', amount: 2340, points: 0 },
          { rank: 2, name: 'Raj Sharma', unit: 'Flat 302', amount: 2180, points: 0 },
          { rank: 3, name: 'Neha Singh', unit: 'Flat 404', amount: 1950, points: 0 },
        ],
        co2ReductionLeaders: [
          { rank: 1, name: 'Raj Sharma', unit: 'Flat 302', co2: 156, points: 0 },
          { rank: 2, name: 'Amit Kumar', unit: 'Flat 201', co2: 142, points: 0 },
          { rank: 3, name: 'Priya Patel', unit: 'Flat 105', co2: 138, points: 0 },
        ],
        totalSavings: '₹18,450',
        totalCO2: '1,234 kg',
        avgRenewableShare: '68%'
      };
    }

    // Process real leaderboard data when available
    const sorted = [...leaderboard].sort((a, b) => b.points - a.points);
    
    return {
      renewableShareLeaders: sorted.slice(0, 3).map((item, index) => ({
        rank: index + 1,
        name: item.userName || 'Anonymous',
        unit: item.householdName || 'Unknown',
        percentage: Math.round(item.renewableSharePct),
        points: item.points
      })),
      costSavingsLeaders: sorted.slice(0, 3).map((item, index) => ({
        rank: index + 1,
        name: item.userName || 'Anonymous',
        unit: item.householdName || 'Unknown',
        amount: Math.round(item.costSaved),
        points: 0
      })),
      co2ReductionLeaders: sorted.slice(0, 3).map((item, index) => ({
        rank: index + 1,
        name: item.userName || 'Anonymous',
        unit: item.householdName || 'Unknown',
        co2: Math.round(item.co2AvoidedKg),
        points: 0
      })),
      totalSavings: `₹${sorted.reduce((sum, item) => sum + item.costSaved, 0).toLocaleString()}`,
      totalCO2: `${sorted.reduce((sum, item) => sum + item.co2AvoidedKg, 0).toFixed(0)} kg`,
      avgRenewableShare: `${Math.round(sorted.reduce((sum, item) => sum + item.renewableSharePct, 0) / sorted.length || 0)}%`
    };
  }, [leaderboard]);

  if (isLoadingCommunities) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-8 bg-muted rounded"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (communities.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="p-8 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No communities available</h3>
          <p className="text-muted-foreground mb-4">
            Join a community to compare your renewable energy usage with neighbors and participate in challenges.
          </p>
          <Button data-testid="button-find-communities">
            Find Communities Near You
          </Button>
        </Card>
      </div>
    );
  }

  const currentCommunity = communities.find((c: Community) => c.id === selectedCommunity);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Community</h1>
          <p className="text-muted-foreground">
            Connect with neighbors and compete in renewable energy challenges.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
            <SelectTrigger className="w-64" data-testid="select-community">
              <SelectValue placeholder="Select community" />
            </SelectTrigger>
            <SelectContent>
              {communities.map((community: Community) => (
                <SelectItem key={community.id} value={community.id}>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span>{community.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {community.city}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
            <SelectTrigger className="w-32" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Community Header */}
      {currentCommunity && (
        <Card className="gradient-bg">
          <CardContent className="p-6 text-white">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold mb-2" data-testid="text-community-name">
                  {currentCommunity.name}
                </h2>
                <div className="flex items-center space-x-4 text-sm text-white/80">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span data-testid="text-community-city">{currentCommunity.city}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span data-testid="text-member-count">{communityStats.totalMembers} members</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Active since 2023</span>
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white" data-testid="badge-community-rank">
                #1 in {currentCommunity.city}
              </Badge>
            </div>
            
            {currentCommunity.description && (
              <p className="text-white/90 mb-4" data-testid="text-community-description">
                {currentCommunity.description}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold" data-testid="text-active-members">
                  {communityStats.activeMembers}
                </div>
                <div className="text-sm text-white/80">Active Members</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" data-testid="text-avg-renewable">
                  {communityStats.avgRenewableShare}%
                </div>
                <div className="text-sm text-white/80">Avg. Renewable</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-300" data-testid="text-monthly-growth">
                  +{communityStats.monthlyGrowth}%
                </div>
                <div className="text-sm text-white/80">Monthly Growth</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" data-testid="text-community-rank-number">
                  #1
                </div>
                <div className="text-sm text-white/80">City Ranking</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievement Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                <Trophy className="text-yellow-600 dark:text-yellow-400 w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Your Achievements</h3>
                <p className="text-sm text-muted-foreground">This month</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Medal className="w-4 h-4 text-primary" />
                  <span className="text-sm">Solar Champion</span>
                </div>
                <Badge variant="secondary" data-testid="badge-solar-champion">Earned</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Award className="w-4 h-4 text-accent" />
                  <span className="text-sm">Energy Saver</span>
                </div>
                <Badge variant="outline" data-testid="badge-energy-saver">2/3 goals</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Leaf className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Green Hero</span>
                </div>
                <Badge variant="outline" data-testid="badge-green-hero">In Progress</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Target className="text-primary w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Monthly Challenge</h3>
                <p className="text-sm text-muted-foreground">80% renewable goal</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Your Progress</span>
                  <span className="font-medium" data-testid="text-challenge-progress">72%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: '72%' }}
                    data-testid="bar-challenge-progress"
                  ></div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                8% more to reach the goal and earn 100 bonus points!
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-secondary w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Your Ranking</h3>
                <p className="text-sm text-muted-foreground">Community position</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Renewable Share</span>
                <Badge className="bg-primary text-primary-foreground" data-testid="badge-renewable-rank">
                  #3
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Cost Savings</span>
                <Badge variant="secondary" data-testid="badge-savings-rank">#5</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">CO₂ Reduction</span>
                <Badge className="bg-green-600 text-white" data-testid="badge-co2-rank">#2</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Community Leaderboard */}
      {isLoadingLeaderboard ? (
        <Card className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="h-4 bg-muted rounded"></div>
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="h-16 bg-muted rounded"></div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : (
        <CommunityLeaderboard {...processedLeaderboard} />
      )}

      {/* Community Challenges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="w-5 h-5" />
            <span>Active Challenges</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">80% Renewable Challenge</h4>
                <Badge data-testid="badge-challenge-1">7 days left</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Achieve 80% renewable energy usage for the month
              </p>
              <div className="flex items-center justify-between text-sm">
                <span>Participants: 32/45</span>
                <span className="font-medium text-primary">Prize: ₹5,000</span>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">CO₂ Reduction Sprint</h4>
                <Badge variant="secondary" data-testid="badge-challenge-2">2 weeks left</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Community goal: Avoid 5,000 kg CO₂ emissions
              </p>
              <div className="flex items-center justify-between text-sm">
                <span>Progress: 3,240/5,000 kg</span>
                <span className="font-medium text-green-600">65% complete</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
