import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sun, Zap, Filter, ZoomIn, ZoomOut, MapPin } from 'lucide-react';
import { Household } from '@shared/schema';

interface CommunityMapProps {
  households: Household[];
  onHouseholdClick?: (household: Household) => void;
}

interface EnergySource {
  id: string;
  name: string;
  type: 'solar' | 'wind' | 'hydro' | 'geothermal';
  capacity: number;
  x: number;
  y: number;
  household: Household;
}

const ENERGY_SOURCE_COLORS = {
  solar: 'var(--neon-blue)',
  wind: 'var(--chart-3)',
  hydro: 'var(--chart-1)',
  geothermal: 'var(--neon-red)'
};

const ENERGY_SOURCE_ICONS = {
  solar: '☀️',
  wind: '💨',
  hydro: '💧',
  geothermal: '🌋'
};

export function CommunityMap({ households, onHouseholdClick }: CommunityMapProps) {
  const [filterType, setFilterType] = useState<string>('all');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hoveredSource, setHoveredSource] = useState<string | null>(null);

  // Convert households to energy sources for mapping
  const energySources: EnergySource[] = useMemo(() => {
    return households
      .filter(h => h.pvKw > 0) // Only households with solar panels
      .map((household, index) => {
        // Create a semi-realistic layout by distributing households across the community area
        const angle = (index / households.length) * 2 * Math.PI;
        const radius = 80 + (index % 3) * 30; // Vary the radius for a more natural layout
        const centerX = 200;
        const centerY = 150;
        
        return {
          id: household.id,
          name: household.name,
          type: 'solar' as const,
          capacity: household.pvKw,
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
          household
        };
      });
  }, [households]);

  const filteredSources = useMemo(() => {
    if (filterType === 'all') return energySources;
    return energySources.filter(source => source.type === filterType);
  }, [energySources, filterType]);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.2, 0.5));

  const getSourceSize = (capacity: number) => {
    return Math.max(8, Math.min(20, capacity * 2)); // Scale based on capacity
  };

  // Default color for all active energy sources
  const getSourceColor = () => {
    return '#10B981'; // Green for active sources
  };

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-primary" />
              <CardTitle>Community Energy Map</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              {/* Filter Controls */}
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40" data-testid="select-energy-filter">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="solar">Solar Only</SelectItem>
                  <SelectItem value="wind">Wind Only</SelectItem>
                  <SelectItem value="hydro">Hydro Only</SelectItem>
                </SelectContent>
              </Select>

              {/* Zoom Controls */}
              <div className="flex items-center space-x-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleZoomOut}
                  data-testid="button-zoom-out"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleZoomIn}
                  data-testid="button-zoom-in"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ENERGY_SOURCE_COLORS.solar }}></div>
                <span className="text-sm">Solar Panels</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm">Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-sm">Maintenance</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm">Offline</span>
              </div>
              <div className="ml-auto text-sm text-muted-foreground">
                {filteredSources.length} energy sources shown
              </div>
            </div>

            {/* SVG Map */}
            <div className="w-full bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg border overflow-hidden">
              <svg 
                width="100%" 
                height="400" 
                viewBox="0 0 400 300"
                className="w-full h-auto"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
                data-testid="community-map-svg"
              >
                {/* Background elements for community layout */}
                <defs>
                  <pattern id="roads" patternUnits="userSpaceOnUse" width="20" height="20">
                    <rect width="20" height="20" fill="#f3f4f6" />
                    <path d="M 0,20 l 20,0" stroke="#d1d5db" strokeWidth="1" />
                    <path d="M 20,0 l 0,20" stroke="#d1d5db" strokeWidth="1" />
                  </pattern>
                  <linearGradient id="buildingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#e5e7eb', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#d1d5db', stopOpacity: 1 }} />
                  </linearGradient>
                </defs>

                {/* Community streets/grid */}
                <rect width="400" height="300" fill="url(#roads)" opacity="0.3" />

                {/* Community center/buildings */}
                <rect x="160" y="120" width="80" height="60" fill="url(#buildingGradient)" stroke="#9ca3af" strokeWidth="1" rx="4" />
                <text x="200" y="155" textAnchor="middle" className="text-xs fill-gray-600" fontSize="10">
                  Community Center
                </text>

                {/* Park area */}
                <circle cx="100" cy="80" r="30" fill="#16a34a" opacity="0.3" />
                <text x="100" y="85" textAnchor="middle" className="text-xs fill-green-700" fontSize="8">
                  Park
                </text>

                {/* Roads */}
                <path d="M 0,150 L 400,150" stroke="#9ca3af" strokeWidth="3" opacity="0.6" />
                <path d="M 200,0 L 200,300" stroke="#9ca3af" strokeWidth="3" opacity="0.6" />

                {/* Energy sources (households with solar) */}
                {filteredSources.map((source) => (
                  <g key={source.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <g
                          className="cursor-pointer transition-all duration-200 hover:scale-110"
                          onMouseEnter={() => setHoveredSource(source.id)}
                          onMouseLeave={() => setHoveredSource(null)}
                          onClick={() => onHouseholdClick?.(source.household)}
                          data-testid={`energy-source-${source.id}`}
                        >
                          {/* Base circle for household */}
                          <circle
                            cx={source.x}
                            cy={source.y}
                            r={getSourceSize(source.capacity)}
                            fill={ENERGY_SOURCE_COLORS[source.type]}
                            stroke={getSourceColor()}
                            strokeWidth={hoveredSource === source.id ? 3 : 2}
                            opacity={0.9}
                          />
                          
                          {/* Solar panel icon */}
                          <text
                            x={source.x}
                            y={source.y + 3}
                            textAnchor="middle"
                            className="text-white"
                            fontSize={Math.max(8, source.capacity)}
                            style={{ pointerEvents: 'none' }}
                          >
                            ☀️
                          </text>

                          {/* Capacity indicator */}
                          <text
                            x={source.x}
                            y={source.y + getSourceSize(source.capacity) + 12}
                            textAnchor="middle"
                            className="text-xs fill-gray-700 dark:fill-gray-300"
                            fontSize="8"
                            style={{ pointerEvents: 'none' }}
                          >
                            {source.capacity}kW
                          </text>
                        </g>
                      </TooltipTrigger>
                      
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-2">
                          <div className="font-semibold flex items-center space-x-2">
                            <Sun className="w-4 h-4" />
                            <span>{source.name}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Type:</span>
                              <div className="font-medium capitalize">{source.type}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Capacity:</span>
                              <div className="font-medium">{source.capacity} kW</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Location:</span>
                              <div className="font-medium">Lat: {source.household.latitude.toFixed(4)}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Longitude:</span>
                              <div className="font-medium">{source.household.longitude.toFixed(4)}</div>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Click for more details
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </g>
                ))}

                {/* Grid lines for reference (optional) */}
                {zoomLevel > 1.2 && (
                  <g opacity="0.2">
                    {Array.from({ length: 20 }, (_, i) => (
                      <g key={i}>
                        <line x1={i * 20} y1="0" x2={i * 20} y2="300" stroke="#9ca3af" strokeWidth="0.5" />
                        <line x1="0" y1={i * 15} x2="400" y2={i * 15} stroke="#9ca3af" strokeWidth="0.5" />
                      </g>
                    ))}
                  </g>
                )}
              </svg>
            </div>

            {/* Statistics Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary" data-testid="text-total-sources">
                  {filteredSources.length}
                </div>
                <div className="text-sm text-muted-foreground">Energy Sources</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600" data-testid="text-total-capacity">
                  {filteredSources.reduce((sum, s) => sum + s.capacity, 0).toFixed(1)}kW
                </div>
                <div className="text-sm text-muted-foreground">Total Capacity</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600" data-testid="text-active-sources">
                  {filteredSources.length}
                </div>
                <div className="text-sm text-muted-foreground">Active Sources</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600" data-testid="text-avg-capacity">
                  {filteredSources.length > 0 ? (filteredSources.reduce((sum, s) => sum + s.capacity, 0) / filteredSources.length).toFixed(1) : 0}kW
                </div>
                <div className="text-sm text-muted-foreground">Avg Capacity</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}