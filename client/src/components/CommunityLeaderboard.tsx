import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Percent, IndianRupee, Leaf } from 'lucide-react';

interface LeaderboardUser {
  rank: number;
  name: string;
  unit: string;
  percentage?: number;
  amount?: number;
  co2?: number;
  points: number;
}

interface CommunityLeaderboardProps {
  renewableShareLeaders: LeaderboardUser[];
  costSavingsLeaders: LeaderboardUser[];
  co2ReductionLeaders: LeaderboardUser[];
  totalSavings: string;
  totalCO2: string;
  avgRenewableShare: string;
}

function getRankBadgeColor(rank: number) {
  switch (rank) {
    case 1: return 'bg-primary text-primary-foreground';
    case 2: return 'bg-accent text-accent-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
}

export function CommunityLeaderboard({
  renewableShareLeaders,
  costSavingsLeaders,
  co2ReductionLeaders,
  totalSavings,
  totalCO2,
  avgRenewableShare
}: CommunityLeaderboardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Community Leaderboard</CardTitle>
            <p className="text-sm text-muted-foreground">Sunrise Gardens Society • March 2024</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button size="sm" data-testid="button-current-month">This Month</Button>
            <Button variant="outline" size="sm" data-testid="button-all-time">All Time</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Renewable Share Leaderboard */}
          <div>
            <h4 className="font-medium text-foreground mb-4 flex items-center">
              <Percent className="text-primary mr-2 w-4 h-4" />
              Renewable Share
            </h4>
            <div className="space-y-3">
              {renewableShareLeaders.map((user) => (
                <div 
                  key={`renewable-${user.rank}`}
                  className={`flex items-center space-x-3 p-3 rounded-lg ${user.rank === 1 ? 'bg-muted/30' : ''}`}
                >
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${getRankBadgeColor(user.rank)}`}>
                    <span data-testid={`rank-renewable-${user.rank}`}>{user.rank}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground" data-testid={`name-renewable-${user.rank}`}>
                      {user.name}
                    </p>
                    <p className="text-xs text-muted-foreground" data-testid={`unit-renewable-${user.rank}`}>
                      {user.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p 
                      className={`text-sm font-bold ${user.rank === 1 ? 'text-primary' : user.rank === 2 ? 'text-accent' : 'text-foreground'}`}
                      data-testid={`percentage-renewable-${user.rank}`}
                    >
                      {user.percentage}%
                    </p>
                    <p className="text-xs text-muted-foreground" data-testid={`points-renewable-${user.rank}`}>
                      +{user.points} pts
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cost Savings Leaderboard */}
          <div>
            <h4 className="font-medium text-foreground mb-4 flex items-center">
              <IndianRupee className="text-primary mr-2 w-4 h-4" />
              Cost Savings
            </h4>
            <div className="space-y-3">
              {costSavingsLeaders.map((user) => (
                <div 
                  key={`cost-${user.rank}`}
                  className={`flex items-center space-x-3 p-3 rounded-lg ${user.rank === 1 ? 'bg-muted/30' : ''}`}
                >
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${getRankBadgeColor(user.rank)}`}>
                    <span data-testid={`rank-cost-${user.rank}`}>{user.rank}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground" data-testid={`name-cost-${user.rank}`}>
                      {user.name}
                    </p>
                    <p className="text-xs text-muted-foreground" data-testid={`unit-cost-${user.rank}`}>
                      {user.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p 
                      className={`text-sm font-bold ${user.rank === 1 ? 'text-primary' : user.rank === 2 ? 'text-accent' : 'text-foreground'}`}
                      data-testid={`amount-cost-${user.rank}`}
                    >
                      ₹{user.amount}
                    </p>
                    <p className="text-xs text-muted-foreground">saved</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CO2 Reduction Leaderboard */}
          <div>
            <h4 className="font-medium text-foreground mb-4 flex items-center">
              <Leaf className="text-primary mr-2 w-4 h-4" />
              CO₂ Avoided
            </h4>
            <div className="space-y-3">
              {co2ReductionLeaders.map((user) => (
                <div 
                  key={`co2-${user.rank}`}
                  className={`flex items-center space-x-3 p-3 rounded-lg ${user.rank === 1 ? 'bg-muted/30' : ''}`}
                >
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${getRankBadgeColor(user.rank)}`}>
                    <span data-testid={`rank-co2-${user.rank}`}>{user.rank}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground" data-testid={`name-co2-${user.rank}`}>
                      {user.name}
                    </p>
                    <p className="text-xs text-muted-foreground" data-testid={`unit-co2-${user.rank}`}>
                      {user.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p 
                      className={`text-sm font-bold ${user.rank === 1 ? 'text-primary' : user.rank === 2 ? 'text-accent' : 'text-foreground'}`}
                      data-testid={`co2-amount-${user.rank}`}
                    >
                      {user.co2} kg
                    </p>
                    <p className="text-xs text-muted-foreground">CO₂ avoided</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Community Stats Summary */}
        <div className="mt-6 p-4 gradient-bg rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-white" data-testid="text-total-savings">
                {totalSavings}
              </p>
              <p className="text-sm text-white/80">Total Community Savings</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white" data-testid="text-total-co2">
                {totalCO2}
              </p>
              <p className="text-sm text-white/80">Total CO₂ Avoided</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white" data-testid="text-avg-renewable">
                {avgRenewableShare}
              </p>
              <p className="text-sm text-white/80">Avg. Renewable Share</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
