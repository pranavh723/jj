import { z } from "zod";

// Standardized appliance name mapping
const APPLIANCE_NORMALIZATION_MAP: Record<string, string> = {
  // Air Conditioner variations
  'air conditioner': 'Air Conditioner',
  'ac': 'Air Conditioner',
  'a/c': 'Air Conditioner',
  'air con': 'Air Conditioner',
  'airconditioner': 'Air Conditioner',
  
  // Refrigerator variations
  'refrigerator': 'Refrigerator',
  'fridge': 'Refrigerator',
  'refrig': 'Refrigerator',
  
  // Washing Machine variations
  'washing machine': 'Washing Machine',
  'washer': 'Washing Machine',
  'washing_machine': 'Washing Machine',
  
  // Water Heater variations
  'water heater': 'Water Heater',
  'heater': 'Water Heater',
  'geyser': 'Water Heater',
  'water_heater': 'Water Heater',
  
  // Television variations
  'television': 'Television',
  'tv': 'Television',
  'telly': 'Television',
  
  // Computer variations
  'computer': 'Computer',
  'pc': 'Computer',
  'laptop': 'Computer',
  'desktop': 'Computer',
  
  // Lights variations
  'led lights': 'LED Lights',
  'lights': 'LED Lights',
  'lighting': 'LED Lights',
  'led': 'LED Lights',
  'bulb': 'LED Lights',
  'bulbs': 'LED Lights',
  
  // Fan variations
  'ceiling fan': 'Ceiling Fan',
  'fan': 'Ceiling Fan',
  'ceiling_fan': 'Ceiling Fan',
  
  // Kitchen appliances
  'microwave': 'Microwave',
  'micro wave': 'Microwave',
  'dishwasher': 'Dishwasher',
  'dish washer': 'Dishwasher',
  'electric oven': 'Electric Oven',
  'oven': 'Electric Oven',
  'toaster': 'Toaster',
  'coffee maker': 'Coffee Maker',
  'coffee_maker': 'Coffee Maker',
  
  // Cleaning appliances
  'vacuum cleaner': 'Vacuum Cleaner',
  'vacuum': 'Vacuum Cleaner',
  'vacuum_cleaner': 'Vacuum Cleaner',
  
  // Default/Generic
  'unknown': 'Unknown Appliance',
  'other': 'Other Appliance',
  'misc': 'Other Appliance'
};

// Standardized appliance categories for consistent naming
export const STANDARD_APPLIANCES = [
  'Air Conditioner',
  'Refrigerator',
  'Washing Machine',
  'Water Heater',
  'Television',
  'Computer',
  'LED Lights',
  'Ceiling Fan',
  'Microwave',
  'Dishwasher',
  'Electric Oven',
  'Toaster',
  'Coffee Maker',
  'Vacuum Cleaner',
  'Other Appliance'
] as const;

export type StandardAppliance = typeof STANDARD_APPLIANCES[number];

/**
 * Normalize an appliance name to a standardized format
 * @param name - The raw appliance name (can be null, undefined, or string)
 * @returns Normalized appliance name or 'Unknown Appliance' if invalid
 */
export function normalizeApplianceName(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') {
    return 'Unknown Appliance';
  }
  
  // Clean the input: trim whitespace, convert to lowercase for matching
  const cleanName = name.trim().toLowerCase();
  
  if (!cleanName) {
    return 'Unknown Appliance';
  }
  
  // Direct match in normalization map
  if (APPLIANCE_NORMALIZATION_MAP[cleanName]) {
    return APPLIANCE_NORMALIZATION_MAP[cleanName];
  }
  
  // Partial matching for compound names
  for (const [key, normalizedName] of Object.entries(APPLIANCE_NORMALIZATION_MAP)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return normalizedName;
    }
  }
  
  // If no match found, capitalize the first letter of each word
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Check if an appliance name is a standard/recognized appliance
 */
export function isStandardAppliance(name: string): name is StandardAppliance {
  return STANDARD_APPLIANCES.includes(name as StandardAppliance);
}

/**
 * Validate and normalize an appliance name for API inputs
 */
export const applianceNameSchema = z
  .string()
  .min(1, 'Appliance name is required')
  .transform((name) => normalizeApplianceName(name));