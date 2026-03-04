
export enum Language {
  ENGLISH = 'en',
  TELUGU = 'te',
  HINDI = 'hi'
}

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  farmName: string;
  language: Language;
  experience: number;
  mainCrops: string[];
  landSize: number; // in Acres
};

export type Field = {
  id: string;
  name: string;
  size: number;
  cropType: string;
  healthScore: number;
  lastAnalysis: string;
  location: { lat: number; lng: number };
};

export type AnalysisResult = {
  id: string;
  fieldId: string;
  timestamp: string;
  imageUrl: string;
  status: 'healthy' | 'warning' | 'critical';
  disease?: string;
  recommendations: string[];
  youtubeLinks?: { title: string; url: string }[];
  confidence: number;
};

export type MarketPrice = {
  crop: string;
  price: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
  market: string;
};

export type Alert = {
  id: string;
  type: 'disease' | 'weather' | 'market';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: string;
  read: boolean;
};

export type FlightLog = {
  id: string;
  date: string;
  duration: string;
  pilot: string;
  purpose: string;
};

export type ChatMessage = {
  role: 'user' | 'model';
  text: string;
  imageUrl?: string;
  timestamp: Date;
};

export type AnalysisSettings = {
  sensitivity: 'standard' | 'high' | 'ultra';
  detailLevel: 'basic' | 'standard' | 'comprehensive';
  includeResearch: boolean;
};

export type Dealer = {
  id: string;
  name: string;
  phone: string;
  location: string;
  rating: number;
  specialization: string[];
};
