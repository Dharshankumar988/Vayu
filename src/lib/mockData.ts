// Legacy mock data - now mainly used for backward compatibility
// Real data comes from dcStore.ts

export const REGION_NAMES: Record<string, string> = {
  north_america: 'North America',
  south_america: 'South America',
  europe: 'Europe',
  asia: 'Asia',
  africa: 'Africa',
  oceania: 'Oceania',
};

export const REGION_COORDS: Record<string, { lat: number; lng: number }> = {
  north_america: { lat: 39.0, lng: -98.0 },
  south_america: { lat: -15.0, lng: -60.0 },
  europe:        { lat: 50.0, lng: 10.0 },
  asia:          { lat: 30.0, lng: 105.0 },
  africa:        { lat: 0.0,  lng: 20.0 },
  oceania:       { lat: -25.0, lng: 134.0 },
};

export const DEMO_CREDENTIALS = [
  { label: 'Admin', email: 'admin@vayu.com', password: 'admin123', role: 'admin' },
  { label: 'Client (Individual)', email: 'tony@stark.com', password: 'client123', role: 'client' },
  { label: 'Client (Organization)', email: 'bruce@wayne.com', password: 'client123', role: 'client' },
];
