import { queryClient } from './queryClient';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken || localStorage.getItem('auth_token');
}

export async function apiRequest(
  url: string,
  method: string = 'GET',
  data?: unknown
): Promise<Response> {
  const token = getAuthToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status}: ${errorText}`);
  }

  return response;
}

// API functions for specific endpoints
export const api = {
  // Auth
  async login(email: string, password: string) {
    const response = await apiRequest('/api/auth/login', 'POST', { email, password });
    return response.json();
  },

  async register(email: string, password: string, name: string) {
    const response = await apiRequest('/api/auth/register', 'POST', { email, password, name });
    return response.json();
  },

  // Households
  async createHousehold(data: any) {
    const response = await apiRequest('/api/households', 'POST', data);
    return response.json();
  },

  async getHouseholds() {
    const response = await apiRequest('/api/households');
    return response.json();
  },

  async getHousehold(id: string) {
    const response = await apiRequest(`/api/households/${id}`);
    return response.json();
  },

  async updateHousehold(id: string, data: any) {
    const response = await apiRequest(`/api/households/${id}`, 'PUT', data);
    return response.json();
  },

  async deleteHousehold(id: string) {
    const response = await apiRequest(`/api/households/${id}`, 'DELETE');
    return response.json();
  },

  // Devices
  async createDevice(data: any) {
    const response = await apiRequest('/api/devices', 'POST', data);
    return response.json();
  },

  async getDevices(householdId: string) {
    const response = await apiRequest(`/api/devices?household_id=${householdId}`);
    return response.json();
  },

  async deleteDevice(id: string) {
    const response = await apiRequest(`/api/devices/${id}`, 'DELETE');
    return response.json();
  },

  // Dashboard
  async getDashboardData(householdId: string) {
    const response = await apiRequest(`/api/dashboard?household_id=${householdId}`);
    return response.json();
  },

  // Forecasts
  async getForecasts(householdId: string) {
    const response = await apiRequest(`/api/forecasts?household_id=${householdId}`);
    return response.json();
  },

  // Recommendations
  async generateRecommendations(householdId: string) {
    const response = await apiRequest(`/api/recommendations/generate?household_id=${householdId}`, 'POST');
    return response.json();
  },

  // Communities
  async getCommunities() {
    const response = await apiRequest('/api/communities');
    return response.json();
  },

  async getLeaderboard(communityId: string) {
    const response = await apiRequest(`/api/community/${communityId}/leaderboard`);
    return response.json();
  },

  async getCommunityHouseholds(communityId: string) {
    const response = await apiRequest(`/api/community/${communityId}/households`);
    return response.json();
  },

  // Meter readings
  async createMeterReading(data: any) {
    const response = await apiRequest('/api/meter-readings', 'POST', data);
    return response.json();
  },

  // Appliance readings
  async deleteApplianceReading(id: string) {
    const response = await apiRequest(`/api/readings/${id}`, 'DELETE');
    return response.json();
  },
};
