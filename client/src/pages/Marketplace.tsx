import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown,
  Users,
  Zap,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface MarketplaceTrade {
  id: string;
  energyTradedKwh: number;
  timestamp: string;
}

interface TopSeller {
  rank: number;
  energyTradedKwh: number;
}

interface MarketplaceData {
  trades: MarketplaceTrade[];
  topSellers: TopSeller[];
  renewablePercentage: number;
}

export default function Marketplace() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');

  // Fetch marketplace data
  const { 
    data: marketplaceData, 
    isLoading: isLoadingMarketplace,
    refetch: refetchMarketplace 
  } = useQuery<MarketplaceData>({
    queryKey: ['/api/marketplace', timeRange],
    enabled: !!user,
  });

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'today':
        return 'Today';
      case 'week':
        return 'This Week';
      case 'month':
        return 'This Month';
      default:
        return 'Today';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Energy Marketplace</h1>
          <p className="text-muted-foreground">
            Peer-to-peer renewable energy trading simulation
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex rounded-lg border">
            {['today', 'week', 'month'].map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimeRange(range as any)}
                className="rounded-none first:rounded-l-lg last:rounded-r-lg"
                data-testid={`button-timerange-${range}`}
              >
                {range === 'today' ? 'Today' : range === 'week' ? 'Week' : 'Month'}
              </Button>
            ))}
          </div>
          <Button
            onClick={() => refetchMarketplace()}
            variant="outline"
            size="sm"
            disabled={isLoadingMarketplace}
            data-testid="button-refresh-marketplace"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingMarketplace ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Market Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Trades</p>
                <p className="text-2xl font-bold" data-testid="text-active-trades">
                  {marketplaceData?.trades?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Energy Traded</p>
                <p className="text-2xl font-bold" data-testid="text-total-energy">
                  {marketplaceData?.trades?.reduce((sum, trade) => sum + trade.energyTradedKwh, 0)?.toFixed(2) || 0} kWh
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Renewable Energy</p>
                <p className="text-2xl font-bold text-green-500" data-testid="text-renewable-percentage">
                  {marketplaceData?.renewablePercentage?.toFixed(1) || 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Trades */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Recent Trades - {getTimeRangeLabel()}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingMarketplace ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                <span>Loading trades...</span>
              </div>
            ) : !marketplaceData?.trades?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No trades available for {getTimeRangeLabel().toLowerCase()}.</p>
                <p className="text-sm">Check back later for marketplace activity.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {marketplaceData.trades.slice(0, 10).map((trade, index) => (
                  <div
                    key={trade.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                    data-testid={`trade-item-${index}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                        <ArrowUpRight className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium">Energy Trade</p>
                        <p className="text-sm text-muted-foreground">
                          Peer-to-peer transaction
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {trade.energyTradedKwh.toFixed(2)} kWh
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(trade.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Sellers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Top Energy Sellers</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingMarketplace ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                <span>Loading sellers...</span>
              </div>
            ) : !marketplaceData?.topSellers?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No seller data available.</p>
                <p className="text-sm">Marketplace activity will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {marketplaceData.topSellers.map((seller, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                    data-testid={`seller-item-${index}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          #{seller.rank}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">Anonymous Seller {seller.rank}</p>
                        <p className="text-sm text-muted-foreground">
                          Community member
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {seller.energyTradedKwh.toFixed(2)} kWh
                      </p>
                      <Badge variant="outline" className="text-xs">
                        Top Seller
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Market Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingDown className="w-5 h-5" />
            <span>Market Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Market Activity</h4>
              <p className="text-sm text-muted-foreground mb-4">
                The energy marketplace enables peer-to-peer trading of renewable energy between households. 
                This simulation shows how excess solar energy can be shared within the community.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Market participation:</span>
                  <span className="font-medium">High</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Average trade size:</span>
                  <span className="font-medium">
                    {marketplaceData?.trades?.length ? 
                      (marketplaceData.trades.reduce((sum, trade) => sum + trade.energyTradedKwh, 0) / marketplaceData.trades.length).toFixed(2) : 0} kWh
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Renewable share:</span>
                  <span className="font-medium text-green-600">
                    {marketplaceData?.renewablePercentage?.toFixed(1) || 0}%
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Environmental Impact</h4>
              <p className="text-sm text-muted-foreground mb-4">
                By trading renewable energy locally, the community reduces grid dependency and 
                promotes sustainable energy consumption patterns.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>CO₂ reduction:</span>
                  <span className="font-medium text-green-600">
                    {((marketplaceData?.trades?.reduce((sum, trade) => sum + trade.energyTradedKwh, 0) || 0) * 0.82).toFixed(1)} kg
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Grid load reduction:</span>
                  <span className="font-medium">
                    {marketplaceData?.trades?.reduce((sum, trade) => sum + trade.energyTradedKwh, 0)?.toFixed(1) || 0} kWh
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Community benefit:</span>
                  <span className="font-medium text-blue-600">High</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}