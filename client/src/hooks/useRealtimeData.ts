import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';

interface RealtimeDataMessage {
  type: 'appliance_update' | 'battery_update' | 'solar_update' | 'energy_update' | 'system_message';
  timestamp: string;
  data: any;
}

interface RealtimeDataState {
  appliances: Map<string, any>;
  battery: any | null;
  solar: any | null;
  energy: any | null;
  isConnected: boolean;
  lastUpdate: Date | null;
  systemMessage: string | null;
}

export function useRealtimeData(householdId?: string) {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const [realtimeData, setRealtimeData] = useState<RealtimeDataState>({
    appliances: new Map(),
    battery: null,
    solar: null,
    energy: null,
    isConnected: false,
    lastUpdate: null,
    systemMessage: null,
  });

  const connectWebSocket = useCallback(() => {
    if (!user || !householdId) return;

    try {
      // Close existing connection
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }

      // Create WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/realtime`;
      
      console.log(`🔌 Connecting to real-time data stream: ${wsUrl}`);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connected to real-time data stream');
        
        // Subscribe to user and household data
        wsRef.current?.send(JSON.stringify({
          type: 'subscribe',
          userId: user.id,
          householdId: householdId,
        }));

        // Update connection status
        setRealtimeData(prev => ({
          ...prev,
          isConnected: true,
          systemMessage: '🔴 LIVE: Real-time data stream connected',
        }));

        reconnectAttempts.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: RealtimeDataMessage = JSON.parse(event.data);
          
          setRealtimeData(prev => {
            const newState = { ...prev, lastUpdate: new Date() };
            
            switch (message.type) {
              case 'appliance_update':
                const newAppliances = new Map(prev.appliances);
                newAppliances.set(message.data.name, {
                  ...message.data,
                  timestamp: message.timestamp,
                });
                newState.appliances = newAppliances;
                break;

              case 'battery_update':
                newState.battery = {
                  ...message.data,
                  timestamp: message.timestamp,
                };
                break;

              case 'solar_update':
                newState.solar = {
                  ...message.data,
                  timestamp: message.timestamp,
                };
                break;

              case 'energy_update':
                newState.energy = {
                  ...message.data,
                  timestamp: message.timestamp,
                };
                break;

              case 'system_message':
                newState.systemMessage = message.data.message;
                break;
            }

            return newState;
          });
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        
        setRealtimeData(prev => ({
          ...prev,
          isConnected: false,
          systemMessage: '🔴 Connection lost - Reconnecting...',
        }));

        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`⏳ Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connectWebSocket();
          }, delay);
        } else {
          setRealtimeData(prev => ({
            ...prev,
            systemMessage: '❌ Connection failed - Please refresh the page',
          }));
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setRealtimeData(prev => ({
          ...prev,
          isConnected: false,
          systemMessage: '❌ Connection error - Retrying...',
        }));
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }, [user, householdId]);

  // Connect when dependencies change
  useEffect(() => {
    connectWebSocket();

    return () => {
      // Cleanup on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  // Manually reconnect function
  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    connectWebSocket();
  }, [connectWebSocket]);

  // Get appliances as array for easy iteration
  const appliancesList = Array.from(realtimeData.appliances.values());

  return {
    ...realtimeData,
    appliances: appliancesList,
    reconnect,
    // Helper functions for components
    getAppliance: (name: string) => realtimeData.appliances.get(name),
    getTotalPowerConsumption: () => 
      appliancesList.reduce((total, appliance) => total + (appliance.powerWatts || 0), 0),
  };
}