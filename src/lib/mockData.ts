import { DataCenter } from "@/components/3d/Layer1/GlobeView";

export const MOCK_DATA_CENTERS: DataCenter[] = [
  { id: "dc-us-east-1", name: "US East (N. Virginia)", lat: 39.0438, lng: -77.4874, status: "operational", size: 1.2, provider: "Mock AWS", clients: ["Stark Industries", "Wayne Enterprises"] },
  { id: "dc-us-west-1", name: "US West (N. California)", lat: 37.3382, lng: -121.8863, status: "operational", size: 1.0, provider: "Mock Azure", clients: ["Stark Industries"] },
  { id: "dc-eu-west-1", name: "Europe (Ireland)", lat: 53.3498, lng: -6.2603, status: "operational", size: 1.1, provider: "Mock AWS", clients: ["Wayne Enterprises"] },
  { id: "dc-eu-central-1", name: "Europe (Frankfurt)", lat: 50.1109, lng: 8.6821, status: "degraded", size: 1.5, provider: "Mock AWS", clients: ["Stark Industries"] },
  { id: "dc-ap-southeast-1", name: "Asia Pacific (Singapore)", lat: 1.3521, lng: 103.8198, status: "operational", size: 1.3, provider: "Mock Azure", clients: ["Wayne Enterprises"] },
  { id: "dc-ap-northeast-1", name: "Asia Pacific (Tokyo)", lat: 35.6895, lng: 139.6917, status: "operational", size: 1.4, provider: "Mock AWS", clients: ["Stark Industries", "Wayne Enterprises"] },
  { id: "dc-sa-east-1", name: "South America (São Paulo)", lat: -23.5505, lng: -46.6333, status: "operational", size: 0.9, provider: "Mock Azure", clients: [] },
  { id: "dc-af-south-1", name: "Africa (Cape Town)", lat: -33.9249, lng: 18.4241, status: "offline", size: 0.8, provider: "Mock AWS", clients: ["Stark Industries"] },
  { id: "dc-me-south-1", name: "Middle East (Bahrain)", lat: 26.0667, lng: 50.5577, status: "operational", size: 0.7, provider: "Mock Azure", clients: ["Wayne Enterprises"] },
  { id: "dc-ap-south-1", name: "Asia Pacific (Mumbai)", lat: 19.0760, lng: 72.8777, status: "operational", size: 1.2, provider: "Mock AWS", clients: ["Stark Industries", "Wayne Enterprises"] },
];
