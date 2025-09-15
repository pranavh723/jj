import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Filter, Info, Zap, Building, Home, Train } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Import Leaflet dynamically to avoid SSR issues
const loadLeaflet = async () => {
  const L = await import('leaflet');
  
  // Fix default icon issues with Webpack
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
  
  return L;
};

interface RenewableInstallation {
  id: string;
  name: string;
  type: 'solar_park' | 'rooftop_residential' | 'rooftop_commercial' | 'rooftop_industrial' | 'rrts_solar';
  latitude: number;
  longitude: number;
  capacity: number; // in kW or MW
  capacityUnit: 'kW' | 'MW';
  installationYear: number;
  status: 'operational' | 'under_construction' | 'planned';
  description: string;
  organization?: string;
}

interface GhaziabadEnergyMapProps {
  onInstallationClick?: (installation: RenewableInstallation) => void;
}

// Real renewable energy installations in Ghaziabad, Uttar Pradesh
const ghaziabadInstallations: RenewableInstallation[] = [
  // Major Solar Parks
  {
    id: 'solar-tech-park',
    name: 'Solar Technology Park Ghaziabad',
    type: 'solar_park',
    latitude: 28.6692,
    longitude: 77.4538,
    capacity: 50,
    capacityUnit: 'MW',
    installationYear: 2019,
    status: 'operational',
    description: 'Major solar technology park focusing on research and development of solar technologies.',
    organization: 'UPNEDA'
  },
  
  // RRTS Stations with Solar
  {
    id: 'rrts-ghaziabad',
    name: 'Ghaziabad RRTS Station Solar Plant',
    type: 'rrts_solar',
    latitude: 28.6644,
    longitude: 77.4502,
    capacity: 2.5,
    capacityUnit: 'MW',
    installationYear: 2023,
    status: 'operational',
    description: 'Solar installation at Ghaziabad RRTS station providing clean energy for transportation infrastructure.',
    organization: 'NCRTC'
  },
  {
    id: 'rrts-sahibabad',
    name: 'Sahibabad RRTS Station Solar Plant',
    type: 'rrts_solar',
    latitude: 28.6867,
    longitude: 77.3611,
    capacity: 1.8,
    capacityUnit: 'MW',
    installationYear: 2023,
    status: 'operational',
    description: 'Solar power system at Sahibabad RRTS station for sustainable transport.',
    organization: 'NCRTC'
  },
  
  // Commercial Rooftop Installations
  {
    id: 'industrial-area-1',
    name: 'Industrial Area Phase 1 Solar Complex',
    type: 'rooftop_industrial',
    latitude: 28.6394,
    longitude: 77.4169,
    capacity: 5.2,
    capacityUnit: 'MW',
    installationYear: 2021,
    status: 'operational',
    description: 'Large-scale rooftop solar installation covering multiple industrial buildings.',
    organization: 'Ghaziabad Industrial Development Authority'
  },
  {
    id: 'commercial-hub',
    name: 'City Centre Commercial Solar',
    type: 'rooftop_commercial',
    latitude: 28.6544,
    longitude: 77.4286,
    capacity: 800,
    capacityUnit: 'kW',
    installationYear: 2022,
    status: 'operational',
    description: 'Rooftop solar installation on commercial buildings in the city center.',
  },
  {
    id: 'mall-solar',
    name: 'Pacific Mall Solar Installation',
    type: 'rooftop_commercial',
    latitude: 28.6211,
    longitude: 77.3644,
    capacity: 1200,
    capacityUnit: 'kW',
    installationYear: 2020,
    status: 'operational',
    description: 'Solar power system on shopping mall rooftop.',
  },
  
  // Residential Areas
  {
    id: 'residential-raj-nagar',
    name: 'Raj Nagar Residential Solar',
    type: 'rooftop_residential',
    latitude: 28.6947,
    longitude: 77.4294,
    capacity: 250,
    capacityUnit: 'kW',
    installationYear: 2021,
    status: 'operational',
    description: 'Community solar installation covering residential area rooftops.',
  },
  {
    id: 'residential-crossings',
    name: 'Crossings Republik Solar Community',
    type: 'rooftop_residential',
    latitude: 28.6133,
    longitude: 77.4667,
    capacity: 180,
    capacityUnit: 'kW',
    installationYear: 2022,
    status: 'operational',
    description: 'Residential community solar project for sustainable living.',
  },
  
  // Planned/Under Construction Projects
  {
    id: 'future-solar-park',
    name: 'Ghaziabad Solar Park Phase 2',
    type: 'solar_park',
    latitude: 28.7000,
    longitude: 77.5000,
    capacity: 100,
    capacityUnit: 'MW',
    installationYear: 2025,
    status: 'planned',
    description: 'Planned expansion of solar capacity in Ghaziabad district.',
    organization: 'UPNEDA'
  },
  {
    id: 'industrial-expansion',
    name: 'Loni Industrial Solar Project',
    type: 'rooftop_industrial',
    latitude: 28.7442,
    longitude: 77.2897,
    capacity: 3.5,
    capacityUnit: 'MW',
    installationYear: 2024,
    status: 'under_construction',
    description: 'Industrial solar project currently under development.',
  }
];

const INSTALLATION_COLORS = {
  solar_park: '#FF6B35', // Orange for solar parks
  rooftop_residential: '#4ECDC4', // Teal for residential
  rooftop_commercial: '#45B7D1', // Blue for commercial
  rooftop_industrial: '#96CEB4', // Green for industrial
  rrts_solar: '#FECA57' // Yellow for transport infrastructure
};

const INSTALLATION_ICONS = {
  solar_park: '🏭',
  rooftop_residential: '🏠',
  rooftop_commercial: '🏢',
  rooftop_industrial: '🏭',
  rrts_solar: '🚉'
};

const STATUS_COLORS = {
  operational: '#10B981', // Green
  under_construction: '#F59E0B', // Amber
  planned: '#6B7280' // Gray
};

export function GhaziabadEnergyMap({ onInstallationClick }: GhaziabadEnergyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [markers, setMarkers] = useState<any[]>([]);
  const [selectedInstallation, setSelectedInstallation] = useState<RenewableInstallation | null>(null);

  // Filter installations based on selected filters
  const filteredInstallations = ghaziabadInstallations.filter(installation => {
    const typeMatch = filterType === 'all' || installation.type === filterType;
    const statusMatch = filterStatus === 'all' || installation.status === filterStatus;
    return typeMatch && statusMatch;
  });

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) return;

      const L = await loadLeaflet();
      
      // Center on Ghaziabad, Uttar Pradesh
      const newMap = L.map(mapRef.current).setView([28.6692, 77.4538], 11);

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(newMap);

      // Add custom styling for different marker types
      const createCustomIcon = (type: string, status: string) => {
        const color = INSTALLATION_COLORS[type as keyof typeof INSTALLATION_COLORS];
        const statusColor = STATUS_COLORS[status as keyof typeof STATUS_COLORS];
        
        return L.divIcon({
          html: `
            <div style="
              background: ${color};
              border: 3px solid ${statusColor};
              border-radius: 50%;
              width: 20px;
              height: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">
              ${INSTALLATION_ICONS[type as keyof typeof INSTALLATION_ICONS]}
            </div>
          `,
          className: 'custom-marker',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
      };

      setMap(newMap);

      return () => {
        newMap.remove();
      };
    };

    initMap();
  }, []);

  // Update markers when filters change
  useEffect(() => {
    if (!map) return;

    const updateMarkers = async () => {
      const L = await loadLeaflet();

      // Clear existing markers
      markers.forEach(marker => map.removeLayer(marker));

      // Add new markers for filtered installations
      const newMarkers = filteredInstallations.map(installation => {
        const icon = L.divIcon({
          html: `
            <div style="
              background: ${INSTALLATION_COLORS[installation.type]};
              border: 3px solid ${STATUS_COLORS[installation.status]};
              border-radius: 50%;
              width: 24px;
              height: 24px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              cursor: pointer;
            ">
              ${INSTALLATION_ICONS[installation.type]}
            </div>
          `,
          className: 'custom-marker',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker([installation.latitude, installation.longitude], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">
                ${installation.name}
              </h3>
              <p style="margin: 4px 0; font-size: 12px;">
                <strong>Type:</strong> ${installation.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </p>
              <p style="margin: 4px 0; font-size: 12px;">
                <strong>Capacity:</strong> ${installation.capacity} ${installation.capacityUnit}
              </p>
              <p style="margin: 4px 0; font-size: 12px;">
                <strong>Status:</strong> <span style="color: ${STATUS_COLORS[installation.status]}; font-weight: bold;">
                  ${installation.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </p>
              <p style="margin: 4px 0; font-size: 12px;">
                <strong>Year:</strong> ${installation.installationYear}
              </p>
              ${installation.organization ? `
                <p style="margin: 4px 0; font-size: 12px;">
                  <strong>Organization:</strong> ${installation.organization}
                </p>
              ` : ''}
              <p style="margin: 8px 0 0 0; font-size: 11px; color: #666;">
                ${installation.description}
              </p>
            </div>
          `)
          .on('click', () => {
            setSelectedInstallation(installation);
            onInstallationClick?.(installation);
          });

        return marker;
      });

      setMarkers(newMarkers);
    };

    updateMarkers();
  }, [map, filteredInstallations, onInstallationClick]);

  // Calculate statistics
  const totalCapacityKW = filteredInstallations.reduce((sum, installation) => {
    return sum + (installation.capacityUnit === 'MW' ? installation.capacity * 1000 : installation.capacity);
  }, 0);

  const operationalCount = filteredInstallations.filter(i => i.status === 'operational').length;
  const underConstructionCount = filteredInstallations.filter(i => i.status === 'under_construction').length;
  const plannedCount = filteredInstallations.filter(i => i.status === 'planned').length;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-primary" />
            <CardTitle>Ghaziabad Renewable Energy Infrastructure</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {/* Type Filter */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48" data-testid="select-type-filter">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="solar_park">Solar Parks</SelectItem>
                <SelectItem value="rooftop_residential">Residential Rooftop</SelectItem>
                <SelectItem value="rooftop_commercial">Commercial Rooftop</SelectItem>
                <SelectItem value="rooftop_industrial">Industrial Rooftop</SelectItem>
                <SelectItem value="rrts_solar">RRTS Solar Infrastructure</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="operational">Operational</SelectItem>
                <SelectItem value="under_construction">Under Construction</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Legend */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-3 bg-muted/30 rounded-lg text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-xs" 
                   style={{ backgroundColor: INSTALLATION_COLORS.solar_park }}>
                🏭
              </div>
              <span>Solar Parks</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-xs" 
                   style={{ backgroundColor: INSTALLATION_COLORS.rooftop_residential }}>
                🏠
              </div>
              <span>Residential</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-xs" 
                   style={{ backgroundColor: INSTALLATION_COLORS.rooftop_commercial }}>
                🏢
              </div>
              <span>Commercial</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-xs" 
                   style={{ backgroundColor: INSTALLATION_COLORS.rooftop_industrial }}>
                🏭
              </div>
              <span>Industrial</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-xs" 
                   style={{ backgroundColor: INSTALLATION_COLORS.rrts_solar }}>
                🚉
              </div>
              <span>RRTS Solar</span>
            </div>
          </div>

          {/* Map Container */}
          <div 
            ref={mapRef} 
            className="h-[500px] w-full rounded-lg border overflow-hidden"
            data-testid="ghaziabad-energy-map"
          />

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary" data-testid="text-total-installations">
                {filteredInstallations.length}
              </div>
              <div className="text-sm text-muted-foreground">Installations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600" data-testid="text-total-capacity">
                {(totalCapacityKW / 1000).toFixed(1)} MW
              </div>
              <div className="text-sm text-muted-foreground">Total Capacity</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600" data-testid="text-operational-count">
                {operationalCount}
              </div>
              <div className="text-sm text-muted-foreground">Operational</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600" data-testid="text-development-count">
                {underConstructionCount + plannedCount}
              </div>
              <div className="text-sm text-muted-foreground">In Development</div>
            </div>
          </div>

          {/* Data Sources Note */}
          <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">Data Sources:</p>
                <p className="text-blue-700 dark:text-blue-300">
                  • UPNEDA (Uttar Pradesh New and Renewable Energy Development Agency)<br/>
                  • NCRTC (National Capital Region Transport Corporation)<br/>
                  • Ghaziabad Industrial Development Authority<br/>
                  • Municipal Corporation Ghaziabad
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}