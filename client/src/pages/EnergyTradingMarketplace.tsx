import { useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  Zap,
  Battery,
  Sun,
  Users,
  MapPin
} from 'lucide-react';

interface EnergyListing {
  id: string;
  sellerName: string;
  energyType: 'solar' | 'battery' | 'grid';
  availableKWh: number;
  pricePerKWh: number;
  location: string;
  timeSlot: string;
  isVerified: boolean;
}

export default function EnergyTradingMarketplace() {
  // Mock energy listings data
  const [energyListings] = useState<EnergyListing[]>([
    {
      id: '1',
      sellerName: 'Raj Sharma',
      energyType: 'solar',
      availableKWh: 25.5,
      pricePerKWh: 4.50,
      location: 'Flat 302, Block A',
      timeSlot: '2:00 PM - 4:00 PM',
      isVerified: true
    },
    {
      id: '2',
      sellerName: 'Priya Patel',
      energyType: 'battery',
      availableKWh: 18.2,
      pricePerKWh: 5.20,
      location: 'Flat 105, Block B',
      timeSlot: '6:00 PM - 8:00 PM',
      isVerified: true
    },
    {
      id: '3',
      sellerName: 'Amit Kumar',
      energyType: 'solar',
      availableKWh: 32.0,
      pricePerKWh: 4.25,
      location: 'Flat 201, Block C',
      timeSlot: '12:00 PM - 3:00 PM',
      isVerified: false
    },
    {
      id: '4',
      sellerName: 'Neha Singh',
      energyType: 'battery',
      availableKWh: 12.8,
      pricePerKWh: 5.50,
      location: 'Flat 404, Block D',
      timeSlot: '7:00 PM - 9:00 PM',
      isVerified: true
    },
    {
      id: '5',
      sellerName: 'Vikram Gupta',
      energyType: 'solar',
      availableKWh: 40.3,
      pricePerKWh: 4.10,
      location: 'Flat 506, Block A',
      timeSlot: '1:00 PM - 5:00 PM',
      isVerified: true
    }
  ]);

  const getEnergyTypeIcon = (type: EnergyListing['energyType']) => {
    switch (type) {
      case 'solar':
        return <Sun className="w-4 h-4 text-yellow-500" />;
      case 'battery':
        return <Battery className="w-4 h-4 text-green-500" />;
      default:
        return <Zap className="w-4 h-4 text-blue-500" />;
    }
  };

  const getEnergyTypeBadge = (type: EnergyListing['energyType']) => {
    switch (type) {
      case 'solar':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">Solar</Badge>;
      case 'battery':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Battery</Badge>;
      default:
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">Grid</Badge>;
    }
  };

  const handleBuyEnergy = (listing: EnergyListing) => {
    // TODO: Implement energy purchase logic
    console.log('Buying energy from:', listing.sellerName);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header with Back Link */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button asChild variant="outline" size="sm" data-testid="button-back-to-community">
            <Link href="/community">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Community
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-marketplace-title">
              ⚡ Energy Trading Marketplace
            </h1>
            <p className="text-muted-foreground">
              Buy and sell renewable energy with your neighbors
            </p>
          </div>
        </div>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-listings">5</p>
              <p className="text-xs text-muted-foreground">Active Listings</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
              <Sun className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-available-energy">128.8</p>
              <p className="text-xs text-muted-foreground">kWh Available</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-active-sellers">5</p>
              <p className="text-xs text-muted-foreground">Active Sellers</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-avg-price">₹4.71</p>
              <p className="text-xs text-muted-foreground">Avg Price/kWh</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Energy Listings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="w-5 h-5" />
            <span>Available Energy Listings</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Browse renewable energy available for purchase from community members
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Seller</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Available (kWh)</th>
                  <th className="text-left p-3 font-medium">Price per kWh</th>
                  <th className="text-left p-3 font-medium">Time Slot</th>
                  <th className="text-left p-3 font-medium">Location</th>
                  <th className="text-left p-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {energyListings.map((listing) => (
                  <tr key={listing.id} className="border-b hover:bg-muted/50" data-testid={`row-energy-listing-${listing.id}`}>
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <div>
                          <p className="font-medium" data-testid={`text-seller-name-${listing.id}`}>
                            {listing.sellerName}
                          </p>
                          {listing.isVerified && (
                            <Badge variant="outline" className="text-xs">
                              Verified
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        {getEnergyTypeIcon(listing.energyType)}
                        {getEnergyTypeBadge(listing.energyType)}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="font-medium" data-testid={`text-available-kwh-${listing.id}`}>
                        {listing.availableKWh}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-medium text-primary" data-testid={`text-price-per-kwh-${listing.id}`}>
                        ₹{listing.pricePerKWh.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-muted-foreground" data-testid={`text-time-slot-${listing.id}`}>
                        {listing.timeSlot}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span data-testid={`text-location-${listing.id}`}>{listing.location}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <Button 
                        size="sm" 
                        onClick={() => handleBuyEnergy(listing)}
                        data-testid={`button-buy-${listing.id}`}
                      >
                        Buy
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}