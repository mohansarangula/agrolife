
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Menu, 
  MessageSquareText,
  X, 
  Sun, 
  Cloud, 
  CloudRain, 
  ChevronRight, 
  Camera, 
  Upload,
  Zap,
  Signal,
  Battery,
  Settings as SettingsIcon,
  Bell,
  Activity,
  Plane,
  Map as MapIcon,
  TrendingUp,
  Navigation,
  Crosshair,
  Layers,
  ZoomIn,
  ZoomOut,
  Eye,
  SlidersHorizontal,
  Plus,
  BookOpen,
  Calendar,
  Clock,
  User as UserIcon,
  Search,
  RotateCw,
  Video,
  Wifi,
  WifiOff,
  RefreshCw,
  Cpu,
  Radio,
  Mail,
  Lock,
  Smartphone,
  Tractor,
  Globe,
  Wind,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Edit2,
  Check,
  Save,
  ImageIcon,
  Trash2,
  Target,
  Phone,
  Star,
  ShoppingBag,
  Store,
  Info,
  Locate,
  BarChart3,
  Scan,
  History,
  Monitor,
  Thermometer,
  Timer,
  Download,
  Link as LinkIcon,
  Unlink,
  AlertTriangle,
  Moon,
  MonitorSmartphone,
  ShieldCheck,
  HardDrive,
  ClipboardList,
  AlertCircle,
  Unlock,
  Lock as LockIcon,
  Focus,
  Volume2,
  VolumeX,
  ExternalLink,
  Play,
  Square,
  Sprout,
  Droplets,
  ArrowRight,
  Home,
  MoreHorizontal,
  HelpCircle,
  TrendingDown,
  MapPin,
  Trees,
  LogOut,
  Maximize2,
  Compass,
  ZapOff
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { GoogleGenAI, Modality, LiveServerMessage, Blob } from '@google/genai';
import { Language, User, Field, AnalysisResult, MarketPrice, Alert, FlightLog, ChatMessage, AnalysisSettings, Dealer } from './types';
import { TRANSLATIONS, NAV_ITEMS, SECONDARY_NAV } from './constants';
import { geminiService } from './services/geminiService';

// --- Audio Helpers for Live API ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// --- UI Components ---
const Button: React.FC<{ 
  onClick?: () => void; 
  children: React.ReactNode; 
  className?: string; 
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'glass' | 'danger' | 'ghost';
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}> = ({ onClick, children, className = "", variant = "primary", disabled = false, type = "button" }) => {
  const variants = {
    primary: "bg-primary-700 text-white hover:bg-primary-800 shadow-lg shadow-primary-700/20",
    secondary: "bg-sky-500 text-white hover:bg-sky-600 shadow-lg shadow-sky-500/20",
    accent: "bg-amber-400 text-black hover:bg-amber-500",
    outline: "border-2 border-primary-700 text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 dark:text-primary-400 dark:border-primary-800",
    glass: "glass bg-white/20 text-white hover:bg-white/30 border-white/40",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
  };
  return (
    <button 
      type={type}
      disabled={disabled}
      onClick={onClick} 
      className={`px-6 py-3 rounded-2xl font-bold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = "", ...props }) => (
  <div 
    className={`bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-black/5 border border-slate-100 dark:border-slate-800 p-6 ${className}`}
    {...props}
  >
    {children}
  </div>
);

const Input: React.FC<{ 
  label?: string; 
  icon?: React.ReactNode;
  placeholder?: string;
  type?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  min?: string | number;
  max?: string | number;
}> = ({ label, icon, placeholder, type = "text", value, onChange, required, min, max }) => (
  <div className="space-y-1.5 w-full text-left">
    {label && <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">{label}</label>}
    <div className="relative group">
      {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-600 transition-colors">{icon}</div>}
      <input 
        type={type} 
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        min={min}
        max={max}
        className={`w-full ${icon ? 'pl-11' : 'pl-4'} pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-600 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all text-sm dark:text-slate-100`}
      />
    </div>
  </div>
);

const Toggle: React.FC<{ label: string; enabled: boolean; onChange: (v: boolean) => void }> = ({ label, enabled, onChange }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm font-medium dark:text-slate-300">{label}</span>
    <button 
      onClick={() => onChange(!enabled)}
      className={`w-12 h-6 rounded-full transition-colors relative ${enabled ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-700'}`}
    >
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${enabled ? 'left-7' : 'left-1'}`} />
    </button>
  </div>
);

// --- Main App ---
export default function App() {
  const [language, setLanguage] = useState<Language>(Language.ENGLISH);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authStep, setAuthStep] = useState(1);
  const [droneStatus, setDroneStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [droneTelemetry, setDroneTelemetry] = useState({
    altitude: 0,
    speed: 0,
    heading: 0,
    pitch: 0,
    roll: 0,
    lat: 17.3850,
    lng: 78.4867
  });
  const [weather, setWeather] = useState({
    temp: 28,
    windSpeed: 12,
    precipProb: 15,
    condition: 'Partly Cloudy'
  });
  const [isPreFlightModalOpen, setIsPreFlightModalOpen] = useState(false);
  const [isWifiModalOpen, setIsWifiModalOpen] = useState(false);
  const [wifiNetwork, setWifiNetwork] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [preFlightChecklist, setPreFlightChecklist] = useState({
    battery: false,
    gps: false,
    camera: false,
    motors: false
  });

  // Assistant & Live AI States
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState<{user: string, ai: string}[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatImage, setChatImage] = useState<string | null>(null);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [assistantMode, setAssistantMode] = useState<'live' | 'chat'>('chat');
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const [currentAiText, setCurrentAiText] = useState('');
  const [currentUserText, setCurrentUserText] = useState('');
  const sessionRef = useRef<any>(null);
  const audioContextsRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  // Field Detail View
  const [selectedFieldForDetail, setSelectedFieldForDetail] = useState<Field | null>(null);
  const [isRegisterFieldModalOpen, setIsRegisterFieldModalOpen] = useState(false);
  const [isEditingCoordinates, setIsEditingCoordinates] = useState(false);
  const [newFieldForm, setNewFieldForm] = useState({
    name: '',
    size: 0,
    cropType: 'Rice',
    lat: 17.3850,
    lng: 78.4867
  });

  // Market States
  const [selectedMarketCrop, setSelectedMarketCrop] = useState<string>('Rice');
  const [sellCropForm, setSellCropForm] = useState({
    crop: 'Rice',
    quantity: 0,
    unit: 'Quintals'
  });
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Battery Drain & Telemetry Effect
  useEffect(() => {
    let interval: any;
    if (droneStatus === 'connected') {
      interval = setInterval(() => {
        setBatteryLevel(prev => {
          if (prev <= 1) {
            setDroneStatus('disconnected');
            setAlerts(prevAlerts => [{
              id: Date.now().toString(),
              type: 'weather',
              severity: 'high',
              message: 'Drone battery critical! Emergency landing initiated.',
              timestamp: new Date().toISOString(),
              read: false
            }, ...prevAlerts]);
            return 0;
          }
          return prev - 0.2;
        });

        setDroneTelemetry(prev => ({
          ...prev,
          altitude: Math.max(0, prev.altitude + (Math.random() - 0.5) * 0.1),
          speed: Math.max(0, prev.speed + (Math.random() - 0.5) * 0.05),
          heading: (prev.heading + (Math.random() - 0.5) * 1 + 360) % 360
        }));
      }, 2000);
    } else if (droneStatus === 'disconnected') {
      setBatteryLevel(100);
      setDroneTelemetry({
        altitude: 0,
        speed: 0,
        heading: 0,
        pitch: 0,
        roll: 0,
        lat: 17.3850,
        lng: 78.4867
      });
    }
    return () => clearInterval(interval);
  }, [droneStatus]);

  const moveDrone = (direction: 'up' | 'down' | 'left' | 'right' | 'forward' | 'backward' | 'rotateLeft' | 'rotateRight') => {
    if (droneStatus !== 'connected') return;
    
    setDroneTelemetry(prev => {
      const newState = { ...prev };
      switch (direction) {
        case 'up': newState.altitude = Math.min(120, newState.altitude + 2); break;
        case 'down': newState.altitude = Math.max(0, newState.altitude - 2); break;
        case 'forward': newState.speed = Math.min(25, newState.speed + 1); break;
        case 'backward': newState.speed = Math.max(0, newState.speed - 1); break;
        case 'left': newState.roll = Math.max(-25, newState.roll - 5); break;
        case 'right': newState.roll = Math.min(25, newState.roll + 5); break;
        case 'rotateLeft': newState.heading = (newState.heading - 10 + 360) % 360; break;
        case 'rotateRight': newState.heading = (newState.heading + 10) % 360; break;
      }
      return newState;
    });
  };

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisSettings, setAnalysisSettings] = useState<AnalysisSettings>({
    sensitivity: 'standard',
    detailLevel: 'standard',
    includeResearch: false
  });
  const [isAnalysisSettingsOpen, setIsAnalysisSettingsOpen] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bottom Options Menu state
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);

  // Alerts State
  const [alerts, setAlerts] = useState<Alert[]>([
    { id: '1', type: 'weather', severity: 'high', message: 'Heavy rainfall expected in next 24 hours. Secure your equipment.', timestamp: new Date().toISOString(), read: false },
    { id: '2', type: 'market', severity: 'medium', message: 'Rice prices up by 4.2% in Warangal Mandi.', timestamp: new Date().toISOString(), read: false },
    { id: '3', type: 'disease', severity: 'high', message: 'Leaf Blight detected in West Block. Immediate spraying recommended.', timestamp: new Date(Date.now() - 3600000).toISOString(), read: false },
    { id: '4', type: 'market', severity: 'low', message: 'Fertilizer subsidies updated for current season.', timestamp: new Date(Date.now() - 86400000).toISOString(), read: true },
  ]);

  // App Settings State
  const [appSettings, setAppSettings] = useState({
    pushNotifications: true,
    autoAnalysis: false,
    metricUnits: true,
    droneSafetyHeight: 15,
    highResUpload: true
  });

  // Auth Form State
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    phone: '',
    farmName: '',
    experience: 0,
    landSize: 0,
    mainCrops: [] as string[]
  });

  const availableCrops = ['Rice', 'Wheat', 'Corn', 'Cotton', 'Soybean', 'Sugar Cane', 'Tomato', 'Chilli'];

  const marketPrices: MarketPrice[] = [
    { crop: 'Rice', price: 2450, trend: 'up', change: 1.5, market: 'Local Mandi' },
    { crop: 'Corn', price: 1850, trend: 'down', change: -0.8, market: 'Local Mandi' },
    { crop: 'Wheat', price: 2100, trend: 'stable', change: 0.1, market: 'Regional Center' },
    { crop: 'Cotton', price: 7200, trend: 'up', change: 2.4, market: 'Khammam' },
    { crop: 'Soybean', price: 4600, trend: 'down', change: -1.2, market: 'Latur' },
  ];

  const dealers: Dealer[] = [
    { id: 'd1', name: 'Sri Krishna Traders', phone: '+91 98480 12345', location: 'Warangal Mandi', rating: 4.8, specialization: ['Rice', 'Corn'] },
    { id: 'd2', name: 'Venkateshwara Agro', phone: '+91 99890 54321', location: 'Khammam Market', rating: 4.5, specialization: ['Cotton', 'Chilli'] },
    { id: 'd3', name: 'Farmer First Seeds', phone: '+91 88776 65544', location: 'Hyderabad Gunj', rating: 4.2, specialization: ['Wheat', 'Soybean'] },
    { id: 'd4', name: 'Global Agri Solutions', phone: '+91 77665 54433', location: 'Nizamabad', rating: 4.6, specialization: ['Sugar Cane', 'Rice'] },
    { id: 'd5', name: 'Modern Mandi Services', phone: '+91 66554 43322', location: 'Karimnagar', rating: 4.4, specialization: ['Tomato', 'Chilli'] },
  ];

  const marketPriceHistory = useMemo(() => ({
    'Rice': [
      { date: '10/18', price: 2380 }, { date: '10/19', price: 2400 }, { date: '10/20', price: 2410 },
      { date: '10/21', price: 2430 }, { date: '10/22', price: 2440 }, { date: '10/23', price: 2445 },
      { date: '10/24', price: 2450 }
    ],
    'Wheat': [
      { date: '10/18', price: 2050 }, { date: '10/19', price: 2070 }, { date: '10/20', price: 2085 },
      { date: '10/21', price: 2100 }, { date: '10/22', price: 2095 }, { date: '10/23', price: 2105 },
      { date: '10/24', price: 2100 }
    ],
    'Corn': [
      { date: '10/18', price: 1950 }, { date: '10/19', price: 1920 }, { date: '10/20', price: 1900 },
      { date: '10/21', price: 1880 }, { date: '10/22', price: 1860 }, { date: '10/23', price: 1855 },
      { date: '10/24', price: 1850 }
    ],
    'Cotton': [
      { date: '10/18', price: 6800 }, { date: '10/19', price: 6950 }, { date: '10/20', price: 7000 },
      { date: '10/21', price: 7100 }, { date: '10/22', price: 7150 }, { date: '10/23', price: 7180 },
      { date: '10/24', price: 7200 }
    ],
    'Soybean': [
      { date: '10/18', price: 4750 }, { date: '10/19', price: 4720 }, { date: '10/20', price: 4700 },
      { date: '10/21', price: 4680 }, { date: '10/22', price: 4650 }, { date: '10/23', price: 4630 },
      { date: '10/24', price: 4600 }
    ]
  }), []);

  // --- Dynamic Suggestions ---
  const suggestions = useMemo(() => {
    if (!user) return [];
    const { landSize, mainCrops } = user;
    const bestCrop = [...marketPrices].sort((a, b) => b.change - a.change)[0];
    const recs = [];
    if (landSize > 0) {
      if (landSize > 5) {
        recs.push({
          title: 'Diversified Growth',
          desc: `With ${landSize} acres, split into ${Math.floor(landSize * 0.6)} acres of ${mainCrops[0] || 'Rice'} and ${Math.ceil(landSize * 0.4)} acres of ${bestCrop.crop} (currently trending up by ${bestCrop.change}%).`,
          icon: <Layers className="w-5 h-5 text-primary-600" />
        });
      } else {
        recs.push({
          title: 'Intensive Farming',
          desc: `Focus all ${landSize} acres on ${bestCrop.crop} for maximum seasonal ROI based on current mandi trends.`,
          icon: <Target className="w-5 h-5 text-amber-600" />
        });
      }
    }
    return recs;
  }, [user]);

  // --- Mock Field Data influenced by User ---
  const [fields, setFields] = useState<Field[]>([]);

  const t = TRANSLATIONS[language];

  // --- Live Assistant Control ---
  const startLiveAssistant = async () => {
    if (isLiveActive) return;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextsRef.current = { input: inputCtx, output: outputCtx };
      
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        console.error("Microphone access failed:", e);
        alert("Could not access microphone. Please ensure you have a microphone connected and have given permission.");
        return;
      }

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsLiveActive(true);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              audioSourcesRef.current.add(source);
              source.onended = () => audioSourcesRef.current.delete(source);
            }
            if (message.serverContent?.outputTranscription) {
              setCurrentAiText(prev => prev + message.serverContent!.outputTranscription!.text);
            } else if (message.serverContent?.inputTranscription) {
              setCurrentUserText(prev => prev + message.serverContent!.inputTranscription!.text);
            }
            if (message.serverContent?.turnComplete) {
              setLiveTranscription(prev => [...prev, { 
                user: currentUserText || "(Spoken)", 
                ai: currentAiText || "(Response)" 
              }]);
              setCurrentAiText('');
              setCurrentUserText('');
            }
            if (message.serverContent?.interrupted) {
              audioSourcesRef.current.forEach(s => s.stop());
              audioSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => setIsLiveActive(false)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: `You are AgroAssist, a helpful agricultural expert. The current language is ${language}. You are helping ${user?.name}, who grows ${user?.mainCrops.join(', ')} on ${user?.landSize} acres.`,
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Failed to start Live Assistant", err);
    }
  };

  const stopLiveAssistant = () => {
    if (sessionRef.current) sessionRef.current.close();
    if (audioContextsRef.current) {
      audioContextsRef.current.input.close();
      audioContextsRef.current.output.close();
    }
    setIsLiveActive(false);
  };

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    if (currentPage !== 'health' && currentPage !== 'drone' && isCameraActive) {
      stopCamera();
    }
  }, [currentPage, isCameraActive]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      ...authForm,
      id: Math.random().toString(36).substr(2, 9),
      language
    };
    setUser(newUser);
    
    const initialFields: Field[] = authForm.mainCrops.map((crop, i) => ({
      id: `f-${i}`,
      name: `${crop} Block`,
      size: Number((authForm.landSize / authForm.mainCrops.length).toFixed(1)),
      cropType: crop,
      healthScore: 80 + Math.floor(Math.random() * 20),
      lastAnalysis: new Date().toISOString().split('T')[0],
      location: { lat: 17.3854, lng: 78.4867 }
    }));
    setFields(initialFields);
    setIsLoggedIn(true);
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      const updatedFields: Field[] = authForm.mainCrops.map((crop, i) => {
        const existing = fields.find(f => f.cropType === crop);
        return {
          id: existing?.id || `f-${Date.now()}-${i}`,
          name: existing?.name || `${crop} Block`,
          size: Number((authForm.landSize / authForm.mainCrops.length).toFixed(1)),
          cropType: crop,
          healthScore: existing?.healthScore || 85,
          lastAnalysis: existing?.lastAnalysis || new Date().toISOString().split('T')[0],
          location: existing?.location || { lat: 17.3854, lng: 78.4867 }
        };
      });
      setFields(updatedFields);
      setUser({ ...user, ...authForm, language });
      setCurrentPage('dashboard');
    }
  };

  /**
   * Fix: Implement missing handleDroneConnect function for UI control.
   */
  const handleChatImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setChatImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() && !chatImage) return;

    const userMessage: ChatMessage = {
      role: 'user',
      text: chatInput,
      imageUrl: chatImage || undefined,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    const currentImage = chatImage;
    setChatImage(null);
    setIsSendingChat(true);

    try {
      // Prepare history for Gemini
      const history = chatMessages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      const response = await geminiService.askAi(
        userMessage.text,
        language,
        history,
        currentImage ? currentImage.split(',')[1] : undefined
      );

      const aiMessage: ChatMessage = {
        role: 'model',
        text: response || "I'm sorry, I couldn't process that request.",
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages(prev => [...prev, {
        role: 'model',
        text: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleDroneConnect = () => {
    setIsWifiModalOpen(true);
  };

  const connectWifi = (network: string) => {
    setWifiNetwork(network);
    setIsWifiModalOpen(false);
    setIsPreFlightModalOpen(true);
  };

  const confirmPreFlight = () => {
    setIsPreFlightModalOpen(false);
    setDroneStatus('connecting');
    setTimeout(() => {
      setDroneStatus('connected');
    }, 2000);
  };

  const startCamera = async () => {
    try {
      let stream;
      try {
        // Try environment camera first (back camera on mobile)
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      } catch (e) {
        // Fallback to any available camera
        console.warn("Environment camera not found, falling back to default camera", e);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please ensure you have a camera connected and have given permission.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 150);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        const base64 = dataUrl.split(',')[1];
        processImageAnalysis(base64, dataUrl);
      }
    }
  };

  const processImageAnalysis = async (base64: string, dataUrl: string) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    const cropType = user?.mainCrops[0] || 'Rice';
    
    const result = await geminiService.analyzeCropImage(base64, cropType, analysisSettings);
    if (result) {
      setAnalysisResult({
        id: Date.now().toString(),
        fieldId: fields[0]?.id || 'default',
        timestamp: new Date().toISOString(),
        imageUrl: dataUrl,
        ...result
      });
      
      if (result.status !== 'healthy') {
        setAlerts(prev => [{
          id: Date.now().toString(),
          type: 'disease',
          severity: result.severity.toLowerCase() as any,
          message: `${result.disease} detected in ${cropType}. Check analysis for details.`,
          timestamp: new Date().toISOString(),
          read: false
        }, ...prev]);
      }
    }
    setIsAnalyzing(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      processImageAnalysis(base64, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const navigateTo = (page: string) => {
    if (isCameraActive) {
      stopCamera();
    }
    setCurrentPage(page);
    setIsOptionsMenuOpen(false);
    if (page === 'profile' && user) {
      setAuthForm({
        name: user.name,
        email: user.email,
        phone: user.phone,
        farmName: user.farmName,
        experience: user.experience,
        landSize: user.landSize,
        mainCrops: user.mainCrops
      });
    }
  };

  // Quadrant Data Generation
  const quadrantData = useMemo(() => {
    if (!selectedFieldForDetail) return [];
    return [
      { name: 'NW Sector', health: selectedFieldForDetail.healthScore + (Math.random() * 10 - 5), water: 40 + Math.random() * 20 },
      { name: 'NE Sector', health: selectedFieldForDetail.healthScore + (Math.random() * 10 - 5), water: 45 + Math.random() * 20 },
      { name: 'SW Sector', health: selectedFieldForDetail.healthScore + (Math.random() * 10 - 5), water: 35 + Math.random() * 20 },
      { name: 'SE Sector', health: selectedFieldForDetail.healthScore + (Math.random() * 10 - 5), water: 50 + Math.random() * 20 }
    ].map(q => ({ ...q, health: Math.min(100, Math.max(0, Math.round(q.health))), water: Math.min(100, Math.max(0, Math.round(q.water))) }));
  }, [selectedFieldForDetail]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative flex items-center justify-center p-4 sm:p-6 overflow-hidden">
        <div className="absolute inset-0 tech-grid opacity-20"></div>
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 bg-white dark:bg-slate-900 rounded-4xl shadow-2xl overflow-hidden relative z-10 border dark:border-slate-800">
          <div className="hidden lg:flex flex-col justify-between p-12 bg-primary-800 text-white relative">
            <div>
              <div className="flex items-center gap-3 mb-10">
                <Zap className="text-accent w-8 h-8" />
                <h1 className="text-3xl font-bold tracking-tight">AgroLife</h1>
              </div>
              <h2 className="text-5xl font-bold leading-tight mb-6">Smarter Data. <br/> Better Yields.</h2>
              <p className="text-primary-100 text-lg max-w-sm opacity-80">Empowering farmers with high-resolution drone analysis and personalized AI insights.</p>
            </div>
            <div className="space-y-6">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                     <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                     <p className="font-bold">Localized Mandi Prices</p>
                     <p className="text-sm opacity-60">Real-time data from 500+ regional markets.</p>
                  </div>
               </div>
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                     <MonitorSmartphone className="w-6 h-6" />
                  </div>
                  <div>
                     <p className="font-bold">UAV Mission Control</p>
                     <p className="text-sm opacity-60">Control multi-spectral scans from your pocket.</p>
                  </div>
               </div>
            </div>
            <div className="absolute inset-0 tech-grid opacity-10 pointer-events-none"></div>
          </div>
          <div className="p-8 sm:p-12 overflow-y-auto max-h-screen">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-3xl font-bold dark:text-white">
                 {authStep === 1 ? 'Farmer Details' : 'Farm Details'}
               </h3>
               <div className="flex items-center gap-3">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Step {authStep}/2</span>
                 <select 
                    className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-xl border-none font-bold text-xs" 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value as Language)}
                 >
                    <option value={Language.ENGLISH}>EN</option>
                    <option value={Language.TELUGU}>TE</option>
                    <option value={Language.HINDI}>HI</option>
                 </select>
               </div>
            </div>
            <form onSubmit={authStep === 1 ? (e) => { e.preventDefault(); setAuthStep(2); } : handleAuth} className="space-y-5">
              {authStep === 1 ? (
                <div className="space-y-5 animate-in slide-in-from-right-5 duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <Input label="Full Name" icon={<UserIcon className="w-4 h-4" />} placeholder="Enter name" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} required />
                     <Input label="Phone Number" icon={<Smartphone className="w-4 h-4" />} placeholder="+91" value={authForm.phone} onChange={e => setAuthForm({...authForm, phone: e.target.value})} required />
                  </div>
                  <Input label="Email Address" icon={<Mail className="w-4 h-4" />} type="email" placeholder="farmer@example.com" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} required />
                  <Input label="Years of Experience" icon={<Star className="w-4 h-4" />} type="number" placeholder="0" value={authForm.experience} onChange={e => setAuthForm({...authForm, experience: Math.max(0, Number(e.target.value))})} required min="0" />
                  <Button type="submit" className="w-full mt-6 py-4">Next: Farm Details <ChevronRight className="w-4 h-4" /></Button>
                </div>
              ) : (
                <div className="space-y-5 animate-in slide-in-from-right-5 duration-300">
                  <Input label="Farm Name" icon={<Tractor className="w-4 h-4" />} placeholder="e.g. Golden Harvest Farm" value={authForm.farmName} onChange={e => setAuthForm({...authForm, farmName: e.target.value})} required />
                  <Input label="Total Land Size (Acres)" icon={<MapIcon className="w-4 h-4" />} type="number" placeholder="1" value={authForm.landSize} onChange={e => setAuthForm({...authForm, landSize: Math.max(1, Number(e.target.value))})} required min="1" />
                  
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Main Crops Grown</label>
                     <div className="flex flex-wrap gap-2">
                        {availableCrops.map(crop => (
                           <button key={crop} type="button" onClick={() => {
                                 const crops = authForm.mainCrops.includes(crop) ? authForm.mainCrops.filter(c => c !== crop) : [...authForm.mainCrops, crop];
                                 setAuthForm({...authForm, mainCrops: crops});
                              }}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${authForm.mainCrops.includes(crop) ? 'bg-primary-600 border-primary-600 text-white' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                           > {crop} </button>
                        ))}
                     </div>
                  </div>
                  <div className="flex gap-4 mt-6">
                    <Button variant="outline" onClick={() => setAuthStep(1)} className="flex-1 py-4">Back</Button>
                    <Button type="submit" className="flex-[2] py-4">Create Farmer ID</Button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc] dark:bg-slate-950 transition-colors duration-300">
      <aside className="hidden md:flex flex-col w-80 bg-white dark:bg-slate-900 shadow-2xl z-[70] border-r dark:border-slate-800">
        <div className="p-8 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-12">
            <Zap className="text-primary-700 w-8 h-8" />
            <span className="text-2xl font-bold dark:text-white">AgroLife</span>
          </div>
          <div className="space-y-1.5 flex-grow">
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => navigateTo(item.id)} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${currentPage === item.id ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-bold' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400'}`}>
                {React.cloneElement(item.icon as React.ReactElement<any>, { className: 'w-5 h-5' })}
                <span>{t[item.label as keyof typeof t]}</span>
              </button>
            ))}
          </div>
          <div className="pt-8 border-t dark:border-slate-800 space-y-1.5">
            {SECONDARY_NAV.map(item => (
              <button key={item.id} onClick={() => navigateTo(item.id)} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all text-sm ${currentPage === item.id ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                {React.cloneElement(item.icon as React.ReactElement<any>, { className: 'w-5 h-5' })}
                <span>{t[item.label as keyof typeof t]}</span>
              </button>
            ))}
            <button onClick={() => setIsLoggedIn(false)} className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10">
               <LogOut className="w-5 h-5" />
               <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-grow flex flex-col min-w-0 h-screen overflow-hidden pb-24 md:pb-0">
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 sm:px-8 py-5 flex items-center justify-between border-b dark:border-slate-800 relative z-50">
          <div>
             <h2 className="text-xl sm:text-2xl font-bold dark:text-white capitalize leading-none">{t[currentPage as keyof typeof t] || currentPage}</h2>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{user?.farmName}</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="hidden sm:block p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {theme === 'light' ? <Moon className="w-5 h-5 text-slate-600" /> : <Sun className="w-5 h-5 text-amber-400" />}
            </button>
            
            <select 
               className="bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 px-3 py-1.5 rounded-xl border-none font-bold text-xs outline-none focus:ring-2 focus:ring-primary-500" 
               value={language} 
               onChange={(e) => setLanguage(e.target.value as Language)}
            >
               <option value={Language.ENGLISH}>EN</option>
               <option value={Language.TELUGU}>TE</option>
               <option value={Language.HINDI}>HI</option>
            </select>

            <div className="w-10 h-10 rounded-xl bg-primary-100 overflow-hidden border border-primary-200 cursor-pointer" onClick={() => navigateTo('profile')}>
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} alt="Profile" />
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-8 space-y-8 overflow-y-auto flex-grow tech-grid dark:opacity-90">
          {/* Dashboard View */}
          {currentPage === 'dashboard' && (
            <div className="space-y-8 max-w-7xl mx-auto pb-10">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-gradient-to-br from-primary-900 to-primary-700 rounded-4xl p-6 sm:p-10 text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-white/10 transition-colors" />
                  <div className="relative z-10">
                    <h3 className="text-2xl sm:text-4xl font-bold mb-3">{t.welcome} {user?.name.split(' ')[0]}</h3>
                    <p className="opacity-80 max-w-md text-sm sm:text-base">Your {user?.landSize}-acre farm is being monitored. Based on market trends, we have some personalized suggestions for you.</p>
                  </div>
                  <div className="absolute bottom-10 right-10 opacity-10 group-hover:opacity-20 transition-opacity hidden sm:block">
                     <Tractor className="w-32 h-32" />
                  </div>
                </div>
                <Card className="flex flex-col border-primary-100 dark:border-primary-900/40">
                  <h4 className="font-bold text-primary-700 dark:text-primary-400 text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
                     <Sparkles className="w-4 h-4" /> Smart Suggestions
                  </h4>
                  <div className="space-y-4 flex-grow">
                    {suggestions.map((s, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex gap-3 border border-slate-100 dark:border-slate-800">
                        <div className="p-2 bg-white dark:bg-slate-700 rounded-xl shrink-0 shadow-sm">{s.icon}</div>
                        <div>
                           <p className="text-sm font-bold dark:text-slate-200">{s.title}</p>
                           <p className="text-[10px] text-slate-500 leading-relaxed">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="group cursor-pointer hover:border-primary-500 transition-all" onClick={() => navigateTo('drone')}>
                  <Plane className="w-8 h-8 text-primary-600 mb-4" />
                  <h5 className="font-bold dark:text-white">Drone Mission</h5>
                  <p className="text-xs text-slate-500">Scan your {user?.landSize} acres.</p>
                </Card>
                <Card className="group cursor-pointer hover:border-sky-500 transition-all" onClick={() => navigateTo('health')}>
                  <Activity className="w-8 h-8 text-sky-600 mb-4" />
                  <h5 className="font-bold dark:text-white">Field Health</h5>
                  <p className="text-xs text-slate-500">NDVI Analysis for {user?.mainCrops[0]}.</p>
                </Card>
                <Card className="group cursor-pointer hover:border-amber-500 transition-all" onClick={() => navigateTo('assistant')}>
                  <Sparkles className="w-8 h-8 text-amber-600 mb-4" />
                  <h5 className="font-bold dark:text-white">AI Assistant</h5>
                  <p className="text-xs text-slate-500">Contextual Farm Advice.</p>
                </Card>
                <Card className="group cursor-pointer hover:border-slate-500 transition-all" onClick={() => navigateTo('alerts')}>
                  <Bell className="w-8 h-8 text-slate-600 mb-4" />
                  <h5 className="font-bold dark:text-white">Recent Alerts</h5>
                  <p className="text-xs text-slate-500">Weather & Market updates.</p>
                </Card>
              </div>
            </div>
          )}

          {/* Help View */}
          {currentPage === 'help' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
              <div className="text-center space-y-4">
                 <div className="w-20 h-20 bg-primary-100 rounded-3xl flex items-center justify-center mx-auto text-primary-600 shadow-xl">
                    <HelpCircle className="w-10 h-10" />
                 </div>
                 <h3 className="text-3xl font-bold dark:text-white">User Manual & Support</h3>
                 <p className="text-slate-500">Everything you need to know about navigating AgroLife.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-8">
                  <h4 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2">
                    <Plane className="w-5 h-5 text-primary-600" /> Drone Missions
                  </h4>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Connect your UAV via the Command Interface. We support multispectral cameras for chlorophyll analysis. Launch a mission to scan your land, and our AI will process the optical data into a health score.
                  </p>
                </Card>
                <Card className="p-8">
                  <h4 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" /> AI Assistant
                  </h4>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    AgroAssist is your 24/7 agricultural expert. Use voice commands or text to ask about pest control, weather impact, or planting schedules. It remembers your farm context for better advice.
                  </p>
                </Card>
                <Card className="p-8">
                  <h4 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-sky-600" /> Market Intelligence
                  </h4>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Monitor live Mandi prices across regional centers. We categorize trends into "Growing", "Stable", or "Declining" to help you decide the best time to sell your harvest.
                  </p>
                </Card>
                <Card className="p-8">
                  <h4 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-red-500" /> Safety Alerts
                  </h4>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Receive critical notifications regarding severe weather patterns, disease outbreaks in your region, or significant market shifts directly on your dashboard.
                  </p>
                </Card>
              </div>

              <Card className="bg-slate-900 text-white p-8 !border-none">
                <h4 className="font-bold mb-4">Frequently Asked Questions</h4>
                <div className="space-y-4">
                  {[
                    { q: "How do I add a new field?", a: "Go to the Fields page and click 'Register New Plot'. Follow the steps to define acreage and crop type." },
                    { q: "Can I use the app offline?", a: "Basic field tracking is available, but Live AI Assistant and Market Data require an internet connection." }
                  ].map((faq, i) => (
                    <div key={i} className="border-b border-white/10 pb-4">
                      <p className="font-bold text-sm mb-1">{faq.q}</p>
                      <p className="text-xs opacity-60">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Alerts View */}
          {currentPage === 'alerts' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold dark:text-white">Notifications Center</h3>
                <Button variant="ghost" className="text-xs" onClick={() => setAlerts(alerts.map(a => ({...a, read: true})))}>Mark all as read</Button>
              </div>

              <div className="space-y-4">
                {alerts.map(alert => (
                  <div 
                    key={alert.id}
                    className={`p-5 rounded-3xl border flex gap-5 transition-all group ${alert.read ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800' : 'bg-primary-50 dark:bg-primary-900/10 border-primary-200'}`}
                  >
                    <div className={`w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center ${
                      alert.type === 'weather' ? 'bg-sky-100 text-sky-600' :
                      alert.type === 'market' ? 'bg-amber-100 text-amber-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {alert.type === 'weather' ? <CloudRain className="w-7 h-7" /> :
                       alert.type === 'market' ? <TrendingUp className="w-7 h-7" /> :
                       <Activity className="w-7 h-7" />}
                    </div>
                    <div className="flex-grow space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{alert.type} Alert</span>
                        <span className="text-[10px] text-slate-400">{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className={`text-sm font-bold ${alert.read ? 'text-slate-600 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>{alert.message}</p>
                    </div>
                    <div className="flex items-center">
                      {!alert.read && <div className="w-3 h-3 bg-primary-600 rounded-full animate-pulse" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings View */}
          {currentPage === 'settings' && (
            <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
               <h3 className="text-2xl font-bold dark:text-white">App Configuration</h3>
               
               <Card className="p-8 space-y-8">
                  <section className="space-y-4">
                     <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">System Preferences</h4>
                     <div className="space-y-2">
                        <Toggle 
                          label="Push Notifications" 
                          enabled={appSettings.pushNotifications} 
                          onChange={(v) => setAppSettings({...appSettings, pushNotifications: v})} 
                        />
                        <Toggle 
                          label="Use Metric Units (m, kg, ha)" 
                          enabled={appSettings.metricUnits} 
                          onChange={(v) => setAppSettings({...appSettings, metricUnits: v})} 
                        />
                        <Toggle 
                          label="High Resolution Data Upload" 
                          enabled={appSettings.highResUpload} 
                          onChange={(v) => setAppSettings({...appSettings, highResUpload: v})} 
                        />
                     </div>
                  </section>

                  <section className="space-y-4 pt-8 border-t dark:border-slate-800">
                     <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Drone Safety Configuration</h4>
                     <div className="space-y-6">
                        <Toggle 
                          label="Automated Flight Analysis" 
                          enabled={appSettings.autoAnalysis} 
                          onChange={(v) => setAppSettings({...appSettings, autoAnalysis: v})} 
                        />
                        <div className="space-y-2">
                           <label className="text-sm font-medium dark:text-slate-300">Minimum Return-to-Home Height: {appSettings.droneSafetyHeight}m</label>
                           <input 
                             type="range" 
                             min="10" 
                             max="100" 
                             value={appSettings.droneSafetyHeight}
                             onChange={(e) => setAppSettings({...appSettings, droneSafetyHeight: parseInt(e.target.value)})}
                             className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                           />
                        </div>
                     </div>
                  </section>

                  <div className="pt-8 border-t dark:border-slate-800">
                     <Button variant="danger" className="w-full">Reset to Factory Settings</Button>
                  </div>
               </Card>
            </div>
          )}

          {currentPage === 'fields' && (
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
               {/* Register New Field Modal */}
               {isRegisterFieldModalOpen && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
                     <Card className="w-full max-w-lg p-8 space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-primary-600" />
                        <div className="flex justify-between items-center">
                           <h3 className="text-2xl font-bold dark:text-white">Register New Plot</h3>
                           <button onClick={() => setIsRegisterFieldModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                              <X className="w-5 h-5 text-slate-400" />
                           </button>
                        </div>
                        <div className="space-y-4">
                           <Input 
                              label="Plot Name" 
                              placeholder="e.g. North Ridge Block" 
                              icon={<MapIcon className="w-4 h-4" />}
                              value={newFieldForm.name}
                              onChange={(e) => setNewFieldForm({...newFieldForm, name: e.target.value})}
                           />
                           <div className="grid grid-cols-2 gap-4">
                              <Input 
                                 label="Size (Acres)" 
                                 type="number" 
                                 placeholder="1.0" 
                                 icon={<Maximize2 className="w-4 h-4" />}
                                 value={newFieldForm.size}
                                 onChange={(e) => setNewFieldForm({...newFieldForm, size: Math.max(0.1, Number(e.target.value))})}
                                 min="0.1"
                              />
                              <div className="space-y-1.5">
                                 <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Crop Type</label>
                                 <select 
                                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-600 outline-none transition-all text-sm dark:text-slate-100"
                                    value={newFieldForm.cropType}
                                    onChange={(e) => setNewFieldForm({...newFieldForm, cropType: e.target.value})}
                                 >
                                    {availableCrops.map(c => <option key={c} value={c}>{c}</option>)}
                                 </select>
                              </div>
                           </div>
                           <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Geographical Coordinates</p>
                              <div className="grid grid-cols-2 gap-4">
                                 <Input 
                                    label="Latitude" 
                                    type="number" 
                                    placeholder="17.3850" 
                                    icon={<Navigation className="w-4 h-4" />}
                                    value={newFieldForm.lat}
                                    onChange={(e) => setNewFieldForm({...newFieldForm, lat: Number(e.target.value)})}
                                 />
                                 <Input 
                                    label="Longitude" 
                                    type="number" 
                                    placeholder="78.4867" 
                                    icon={<Compass className="w-4 h-4" />}
                                    value={newFieldForm.lng}
                                    onChange={(e) => setNewFieldForm({...newFieldForm, lng: Number(e.target.value)})}
                                 />
                              </div>
                           </div>
                        </div>
                        <div className="flex gap-4 pt-4">
                           <Button variant="ghost" className="flex-1" onClick={() => setIsRegisterFieldModalOpen(false)}>Cancel</Button>
                           <Button variant="primary" className="flex-1" onClick={() => {
                              const newField: Field = {
                                 id: `field-${Date.now()}`,
                                 name: newFieldForm.name || 'Untitled Plot',
                                 size: newFieldForm.size,
                                 cropType: newFieldForm.cropType,
                                 healthScore: 100,
                                 lastAnalysis: new Date().toISOString().split('T')[0],
                                 location: { lat: newFieldForm.lat, lng: newFieldForm.lng }
                              };
                              setFields([...fields, newField]);
                              setIsRegisterFieldModalOpen(false);
                              setNewFieldForm({ name: '', size: 0, cropType: 'Rice', lat: 17.3850, lng: 78.4867 });
                           }}>Register Plot</Button>
                        </div>
                     </Card>
                  </div>
               )}

               {/* Edit Coordinates Modal */}
               {isEditingCoordinates && selectedFieldForDetail && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
                     <Card className="w-full max-w-md p-8 space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
                        <div className="flex justify-between items-center">
                           <h3 className="text-2xl font-bold dark:text-white">Update Location</h3>
                           <button onClick={() => setIsEditingCoordinates(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                              <X className="w-5 h-5 text-slate-400" />
                           </button>
                        </div>
                        <p className="text-sm text-slate-500">Adjust the geographical center point for {selectedFieldForDetail.name}.</p>
                        <div className="grid grid-cols-1 gap-4">
                           <Input 
                              label="Latitude" 
                              type="number" 
                              icon={<Navigation className="w-4 h-4" />}
                              value={selectedFieldForDetail.location.lat}
                              onChange={(e) => setSelectedFieldForDetail({
                                 ...selectedFieldForDetail,
                                 location: { ...selectedFieldForDetail.location, lat: Number(e.target.value) }
                              })}
                           />
                           <Input 
                              label="Longitude" 
                              type="number" 
                              icon={<Compass className="w-4 h-4" />}
                              value={selectedFieldForDetail.location.lng}
                              onChange={(e) => setSelectedFieldForDetail({
                                 ...selectedFieldForDetail,
                                 location: { ...selectedFieldForDetail.location, lng: Number(e.target.value) }
                              })}
                           />
                        </div>
                        <div className="flex gap-4 pt-4">
                           <Button variant="ghost" className="flex-1" onClick={() => setIsEditingCoordinates(false)}>Cancel</Button>
                           <Button variant="primary" className="flex-1" onClick={() => {
                              setFields(fields.map(f => f.id === selectedFieldForDetail.id ? selectedFieldForDetail : f));
                              setIsEditingCoordinates(false);
                           }}>Save Changes</Button>
                        </div>
                     </Card>
                  </div>
               )}
               <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold dark:text-white">Plot Management</h3>
                  {selectedFieldForDetail && (
                     <Button variant="ghost" onClick={() => setSelectedFieldForDetail(null)} className="py-2 px-4 text-xs">
                        <ChevronLeft className="w-4 h-4" /> Back to Plots
                     </Button>
                  )}
               </div>

               {!selectedFieldForDetail ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                     <div className="lg:col-span-2 space-y-4">
                        {fields.map(f => (
                           <Card 
                             key={f.id} 
                             onClick={() => setSelectedFieldForDetail(f)}
                             className="cursor-pointer hover:border-primary-200 dark:hover:border-primary-800 transition-all flex justify-between items-center group"
                           >
                              <div className="flex gap-4 items-center">
                                 <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/30 text-primary-600 rounded-2xl flex items-center justify-center">
                                    <MapIcon className="w-6 h-6" />
                                 </div>
                                 <div>
                                    <p className="font-bold dark:text-white text-lg">{f.name}</p>
                                    <p className="text-xs text-slate-500">{f.size} Acres • {f.cropType}</p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-4">
                                 <div className="text-right hidden sm:block">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Avg Health</p>
                                    <p className={`text-lg font-mono font-bold ${f.healthScore > 85 ? 'text-green-500' : 'text-amber-500'}`}>{f.healthScore}%</p>
                                 </div>
                                 <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                              </div>
                           </Card>
                        ))}
                     </div>
                     <Card className="bg-primary-900 text-white !border-none relative overflow-hidden h-fit">
                        <div className="relative z-10">
                           <h4 className="text-lg font-bold mb-4">Farm Usage Insight</h4>
                           <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md mb-6">
                              <p className="text-[10px] uppercase font-black tracking-widest text-accent mb-2">Efficiency Rating</p>
                              <p className="text-3xl font-bold">94%</p>
                           </div>
                           <p className="text-sm text-primary-100 opacity-80 leading-relaxed mb-6">
                              Based on your total {user?.landSize} acres, your blocks are optimized for water distribution. Click a plot to see detailed sector analytics.
                           </p>
                           <Button variant="glass" className="w-full text-xs" onClick={() => setIsRegisterFieldModalOpen(true)}>Register New Plot</Button>
                        </div>
                        <Globe className="absolute -bottom-10 -right-10 w-48 h-48 opacity-10" />
                     </Card>
                  </div>
               ) : (
                  <div className="space-y-8 animate-in slide-in-from-right-10 duration-500">
                     <Card className="p-8 border-primary-100 dark:border-primary-900/30">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                           <div>
                              <h4 className="text-2xl font-bold dark:text-white">{selectedFieldForDetail.name} Quadrant Breakdown</h4>
                              <p className="text-sm text-slate-500">Divisional analysis based on recent drone optical telemetry across {selectedFieldForDetail.size} acres.</p>
                           </div>
                           <div className="flex items-center gap-3">
                              <div className="glass bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700">
                                 <div className="flex items-center gap-4">
                                    <div className="flex flex-col">
                                       <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Latitude</span>
                                       <span className="text-xs font-mono font-bold dark:text-slate-200">{selectedFieldForDetail.location.lat.toFixed(4)}</span>
                                    </div>
                                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                                    <div className="flex flex-col">
                                       <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Longitude</span>
                                       <span className="text-xs font-mono font-bold dark:text-slate-200">{selectedFieldForDetail.location.lng.toFixed(4)}</span>
                                    </div>
                                 </div>
                              </div>
                              <Button 
                                 variant="outline" 
                                 className="py-2 px-4 text-xs"
                                 onClick={() => setIsEditingCoordinates(true)}
                              >
                                 <Edit2 className="w-3 h-3" /> Edit Coordinates
                              </Button>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                           {quadrantData.map((q, idx) => (
                              <div key={idx} className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-primary-300 transition-colors group">
                                 <div className="flex justify-between items-center mb-6">
                                    <h5 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                       <Target className="w-4 h-4 text-primary-600" />
                                       {q.name}
                                    </h5>
                                 </div>
                                 <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                       <div className="flex justify-between text-xs font-bold">
                                          <span className="text-slate-500">Health</span>
                                          <span className={q.health > 85 ? 'text-green-500' : 'text-amber-500'}>{q.health}%</span>
                                       </div>
                                       <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                          <div className={`h-full transition-all duration-1000 ${q.health > 85 ? 'bg-green-500' : 'bg-amber-500'}`} style={{width: `${q.health}%`}} />
                                       </div>
                                    </div>
                                    <div className="space-y-2">
                                       <div className="flex justify-between text-xs font-bold">
                                          <span className="text-slate-500">Water</span>
                                          <span className="text-sky-500">{q.water}%</span>
                                       </div>
                                       <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                          <div className="h-full bg-sky-500 transition-all duration-1000" style={{width: `${q.water}%`}} />
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </Card>
                  </div>
               )}
            </div>
          )}

          {currentPage === 'drone' && (
            <div className="max-w-[1600px] mx-auto pb-24 animate-in fade-in duration-700">
               {/* Mission Header */}
               <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 bg-white dark:bg-slate-900 p-6 rounded-3xl border dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${droneStatus === 'connected' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                      <Plane className={`w-6 h-6 ${droneStatus === 'connected' ? 'animate-bounce' : ''}`} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold dark:text-white">UAV Mission Control</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`w-2 h-2 rounded-full ${droneStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          {droneStatus === 'connected' ? 'System Online' : droneStatus === 'connecting' ? 'Establishing Link...' : 'System Offline'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {droneStatus === 'connected' && (
                      <div className="hidden sm:flex items-center gap-6 px-6 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 mr-4">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Battery</span>
                          <div className="flex items-center gap-2">
                            <Battery className={`w-3 h-3 ${batteryLevel > 20 ? 'text-green-500' : 'text-red-500'}`} />
                            <span className="text-xs font-mono font-bold dark:text-slate-200">{Math.round(batteryLevel)}%</span>
                          </div>
                        </div>
                        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Signal</span>
                          <div className="flex items-center gap-2">
                            <Wifi className="w-3 h-3 text-primary-500" />
                            <span className="text-xs font-mono font-bold dark:text-slate-200">98%</span>
                          </div>
                        </div>
                        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">GPS</span>
                          <div className="flex items-center gap-2">
                            <Globe className="w-3 h-3 text-emerald-500" />
                            <span className="text-xs font-mono font-bold dark:text-slate-200">12 Sats</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {droneStatus === 'disconnected' ? (
                       <Button variant="primary" onClick={handleDroneConnect} className="px-8 py-3 text-sm">
                         Launch Mission
                       </Button>
                    ) : droneStatus === 'connecting' ? (
                       <Button variant="accent" disabled className="px-8 py-3 text-sm">
                         Connecting...
                       </Button>
                    ) : (
                      <Button variant="danger" onClick={() => setDroneStatus('disconnected')} className="px-8 py-3 text-sm">
                        Abort Mission
                      </Button>
                    )}
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Main Viewport */}
                  <div className="lg:col-span-8 space-y-8">
                    <Card className="aspect-video relative overflow-hidden bg-black !p-0 shadow-2xl rounded-[2.5rem] group border-4 border-slate-200 dark:border-slate-800">
                       {droneStatus === 'connected' ? (
                          <div className="w-full h-full relative">
                             {isCameraActive ? (
                               <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                             ) : (
                               <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900">
                                 <Camera className="w-12 h-12 text-slate-700 mb-4" />
                                 <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Camera Standby</p>
                                 <Button variant="outline" className="mt-6 border-slate-700 text-slate-300 hover:bg-slate-800" onClick={startCamera}>Initialize Feed</Button>
                               </div>
                             )}
                             <canvas ref={canvasRef} className="hidden" />
                             
                             {/* HUD Overlays */}
                             <div className="absolute inset-0 pointer-events-none">
                                {/* Corner Accents */}
                                <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-primary-500/50 rounded-tl-xl" />
                                <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-primary-500/50 rounded-tr-xl" />
                                <div className="absolute bottom-8 left-8 w-12 h-12 border-b-2 border-l-2 border-primary-500/50 rounded-bl-xl" />
                                <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-primary-500/50 rounded-br-xl" />

                                {/* Center Crosshair */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                                   <div className="w-12 h-12 border border-primary-500/30 rounded-full flex items-center justify-center">
                                      <div className="w-1 h-1 bg-primary-500 rounded-full" />
                                   </div>
                                   <div className="absolute w-20 h-px bg-primary-500/20" />
                                   <div className="absolute h-20 w-px bg-primary-500/20" />
                                </div>

                                {/* Telemetry HUD */}
                                <div className="absolute top-10 right-10 flex flex-col gap-3">
                                   {/* Weather Overlay */}
                                   <div className="glass bg-black/60 backdrop-blur-xl px-4 py-3 rounded-2xl border border-white/20 min-w-[160px] shadow-2xl animate-in slide-in-from-right-5 duration-700">
                                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                                         <Cloud className="w-3 h-3 text-sky-400" />
                                         <span className="text-[8px] font-black text-white uppercase tracking-widest">Local Weather</span>
                                      </div>
                                      <div className="space-y-2">
                                         <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-1.5">
                                               <Thermometer className="w-3 h-3 text-rose-400" />
                                               <span className="text-[9px] text-slate-300">Temp</span>
                                            </div>
                                            <span className="text-xs font-mono font-bold text-white">{weather.temp}°C</span>
                                         </div>
                                         <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-1.5">
                                               <Wind className="w-3 h-3 text-emerald-400" />
                                               <span className="text-[9px] text-slate-300">Wind</span>
                                            </div>
                                            <span className="text-xs font-mono font-bold text-white">{weather.windSpeed} km/h</span>
                                         </div>
                                         <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-1.5">
                                               <CloudRain className="w-3 h-3 text-sky-400" />
                                               <span className="text-[9px] text-slate-300">Precip</span>
                                            </div>
                                            <span className="text-xs font-mono font-bold text-white">{weather.precipProb}%</span>
                                         </div>
                                      </div>
                                   </div>
                                   <div className="glass bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 min-w-[140px]">
                                      <div className="flex justify-between items-center">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Altitude</span>
                                        <span className="text-xs font-mono font-bold text-white">{droneTelemetry.altitude.toFixed(1)}m</span>
                                      </div>
                                      <div className="h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                                        <div className="h-full bg-primary-500" style={{width: `${(droneTelemetry.altitude / 120) * 100}%`}} />
                                      </div>
                                   </div>
                                   <div className="glass bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 min-w-[140px]">
                                      <div className="flex justify-between items-center">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Speed</span>
                                        <span className="text-xs font-mono font-bold text-white">{droneTelemetry.speed.toFixed(1)}km/h</span>
                                      </div>
                                      <div className="h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                                        <div className="h-full bg-accent-500" style={{width: `${(droneTelemetry.speed / 25) * 100}%`}} />
                                      </div>
                                   </div>
                                   <div className="glass bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 min-w-[140px]">
                                      <div className="flex justify-between items-center">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Heading</span>
                                        <span className="text-xs font-mono font-bold text-white">{Math.round(droneTelemetry.heading)}°</span>
                                      </div>
                                      <div className="flex gap-0.5 mt-1.5">
                                        {Array.from({length: 12}).map((_, i) => (
                                          <div key={i} className={`flex-grow h-1 rounded-full ${Math.floor(droneTelemetry.heading / 30) === i ? 'bg-primary-500' : 'bg-white/10'}`} />
                                        ))}
                                      </div>
                                   </div>
                                </div>

                                {/* Bottom Status */}
                                <div className="absolute bottom-10 left-10 flex items-center gap-4">
                                   <div className="glass bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center gap-3">
                                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Live Feed</span>
                                   </div>
                                   <div className="glass bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                                      <span className="text-[10px] font-mono text-slate-400">{new Date().toLocaleTimeString()}</span>
                                   </div>
                                </div>
                             </div>

                             {/* Camera Controls */}
                             <div className="absolute bottom-10 right-10 flex gap-4 pointer-events-auto">
                               {isCameraActive && (
                                 <>
                                   <button onClick={captureImage} className="w-14 h-14 rounded-full bg-primary-600 hover:bg-primary-500 text-white flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 border-4 border-white/20">
                                     <Crosshair className="w-6 h-6" />
                                   </button>
                                   <button onClick={stopCamera} className="w-14 h-14 rounded-full bg-slate-800/80 hover:bg-red-600 text-white flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 border-4 border-white/10 backdrop-blur-md">
                                     <X className="w-6 h-6" />
                                   </button>
                                 </>
                               )}
                             </div>
                          </div>
                       ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-sm">
                             {droneStatus === 'connecting' ? (
                               <div className="text-center">
                                 <RefreshCw className="w-16 h-16 text-primary-500 animate-spin mb-6 mx-auto" />
                                 <h4 className="text-white font-bold text-lg">Syncing Telemetry...</h4>
                                 <p className="text-slate-500 text-sm mt-2">Establishing secure AES-256 uplink</p>
                               </div>
                             ) : (
                               <div className="text-center opacity-40">
                                 <Plane className="w-24 h-24 text-slate-700 mb-6 mx-auto" />
                                 <h4 className="text-slate-400 font-bold text-lg uppercase tracking-[0.2em]">Link Required</h4>
                               </div>
                             )}
                          </div>
                       )}
                    </Card>

                    {/* Analysis Section */}
                    <div className="space-y-6">
                      {isAnalyzing && (
                        <Card className="p-12 flex flex-col items-center justify-center text-center space-y-4 animate-pulse border-2 border-dashed border-primary-200 dark:border-primary-900/30">
                          <div className="w-20 h-20 bg-primary-50 dark:bg-primary-900/20 rounded-3xl flex items-center justify-center text-primary-600">
                            <RefreshCw className="w-10 h-10 animate-spin" />
                          </div>
                          <div>
                            <h4 className="text-2xl font-bold dark:text-white">Processing Multispectral Data</h4>
                            <p className="text-sm text-slate-500 mt-2">Gemini AI is identifying crop stress patterns and disease vectors...</p>
                          </div>
                        </Card>
                      )}

                      {analysisResult && (
                        <Card className="p-0 overflow-hidden animate-in slide-in-from-bottom-5 duration-500 border-2 border-primary-100 dark:border-primary-900/20">
                          <div className="grid grid-cols-1 md:grid-cols-12">
                            <div className="md:col-span-4 aspect-square">
                              <img src={analysisResult.imageUrl} className="w-full h-full object-cover" alt="Analyzed Crop" />
                            </div>
                            <div className="md:col-span-8 p-8 flex flex-col justify-between">
                              <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${analysisResult.status === 'healthy' ? 'bg-green-500' : analysisResult.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`} />
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-500">{analysisResult.status} Analysis</span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">{new Date(analysisResult.timestamp).toLocaleString()}</span>
                                </div>
                                
                                <div>
                                  <h4 className="text-3xl font-bold dark:text-white">{analysisResult.disease !== 'none' ? analysisResult.disease : 'Optimal Health Detected'}</h4>
                                  <p className="text-sm text-slate-500 mt-2">Confidence Score: <span className="font-mono font-bold text-primary-600">{(analysisResult.confidence * 100).toFixed(1)}%</span></p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                  <div className="space-y-4">
                                    <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Action Plan</h5>
                                    <ul className="space-y-3">
                                      {analysisResult.recommendations.map((rec, i) => (
                                        <li key={i} className="text-sm text-slate-600 dark:text-slate-300 flex gap-3 items-start">
                                          <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                          {rec}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>

                                  {analysisResult.youtubeLinks && analysisResult.youtubeLinks.length > 0 && (
                                    <div className="space-y-4">
                                      <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Educational Resources</h5>
                                      <div className="space-y-2">
                                        {analysisResult.youtubeLinks.map((link, i) => (
                                          <button 
                                            key={i} 
                                            onClick={() => setPlayingVideoUrl(link.url)}
                                            className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-transparent hover:border-red-200 transition-all group text-left"
                                          >
                                            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
                                              <Video className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs font-bold dark:text-slate-200 truncate flex-grow">{link.title}</span>
                                            <Play className="w-3 h-3 text-slate-300 group-hover:text-red-500" />
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="mt-8 pt-6 border-t dark:border-slate-800">
                                <Button variant="outline" className="w-full py-3" onClick={() => setAnalysisResult(null)}>Dismiss Analysis</Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      )}
                    </div>
                  </div>

                  {/* Side Controls */}
                  <div className="lg:col-span-4 space-y-8">
                     {droneStatus === 'connected' ? (
                       <div className="space-y-8">
                          {/* Flight Controller Card */}
                          <Card className="p-8 bg-slate-900 border-slate-800 text-white shadow-2xl relative overflow-hidden">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary-500/5 rounded-full blur-3xl" />
                            
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-500 mb-8 flex items-center gap-2">
                              <Navigation className="w-4 h-4" /> Flight Deck
                            </h4>
                            
                            <div className="space-y-12">
                               {/* Left Stick */}
                               <div className="flex flex-col items-center gap-6">
                                  <div className="grid grid-cols-3 gap-3">
                                     <div />
                                     <button onMouseDown={() => moveDrone('up')} className="w-16 h-16 rounded-2xl bg-slate-800 hover:bg-primary-600 flex items-center justify-center transition-all shadow-lg border border-slate-700 active:scale-90">
                                        <ChevronUp className="w-8 h-8" />
                                     </button>
                                     <div />
                                     
                                     <button onMouseDown={() => moveDrone('rotateLeft')} className="w-16 h-16 rounded-2xl bg-slate-800 hover:bg-primary-600 flex items-center justify-center transition-all shadow-lg border border-slate-700 active:scale-90">
                                        <RotateCw className="w-8 h-8 scale-x-[-1]" />
                                     </button>
                                     <div className="w-16 h-16 rounded-full border-2 border-slate-800 flex items-center justify-center">
                                        <div className="w-3 h-3 bg-primary-500 rounded-full animate-pulse" />
                                     </div>
                                     <button onMouseDown={() => moveDrone('rotateRight')} className="w-16 h-16 rounded-2xl bg-slate-800 hover:bg-primary-600 flex items-center justify-center transition-all shadow-lg border border-slate-700 active:scale-90">
                                        <RotateCw className="w-8 h-8" />
                                     </button>
                                     
                                     <div />
                                     <button onMouseDown={() => moveDrone('down')} className="w-16 h-16 rounded-2xl bg-slate-800 hover:bg-primary-600 flex items-center justify-center transition-all shadow-lg border border-slate-700 active:scale-90">
                                        <ChevronDown className="w-8 h-8" />
                                     </button>
                                     <div />
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Altitude & Yaw</span>
                               </div>

                               {/* Right Stick */}
                               <div className="flex flex-col items-center gap-6">
                                  <div className="grid grid-cols-3 gap-3">
                                     <div />
                                     <button onMouseDown={() => moveDrone('forward')} className="w-16 h-16 rounded-2xl bg-slate-800 hover:bg-primary-600 flex items-center justify-center transition-all shadow-lg border border-slate-700 active:scale-90">
                                        <ChevronUp className="w-8 h-8" />
                                     </button>
                                     <div />
                                     
                                     <button onMouseDown={() => moveDrone('left')} className="w-16 h-16 rounded-2xl bg-slate-800 hover:bg-primary-600 flex items-center justify-center transition-all shadow-lg border border-slate-700 active:scale-90">
                                        <ChevronLeft className="w-8 h-8" />
                                     </button>
                                     <div className="w-16 h-16 rounded-full border-2 border-slate-800 flex items-center justify-center">
                                        <div className="w-3 h-3 bg-accent-500 rounded-full animate-pulse" />
                                     </div>
                                     <button onMouseDown={() => moveDrone('right')} className="w-16 h-16 rounded-2xl bg-slate-800 hover:bg-primary-600 flex items-center justify-center transition-all shadow-lg border border-slate-700 active:scale-90">
                                        <ChevronRight className="w-8 h-8" />
                                     </button>
                                     
                                     <div />
                                     <button onMouseDown={() => moveDrone('backward')} className="w-16 h-16 rounded-2xl bg-slate-800 hover:bg-primary-600 flex items-center justify-center transition-all shadow-lg border border-slate-700 active:scale-90">
                                        <ChevronDown className="w-8 h-8" />
                                     </button>
                                     <div />
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pitch & Roll</span>
                               </div>
                            </div>

                            <div className="mt-12 pt-8 border-t border-slate-800 flex justify-between items-center">
                               <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Remote Link Active</span>
                               </div>
                               <span className="text-[10px] font-mono text-primary-500">24ms</span>
                            </div>
                          </Card>

                          {/* Quick Actions */}
                          <Card className="p-6 space-y-4">
                             <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Mission Actions</h4>
                             <Button 
                               variant={isCameraActive ? "primary" : "outline"} 
                               className="w-full justify-start gap-3 py-4" 
                               onClick={() => {
                                 if (!isCameraActive) {
                                   startCamera();
                                 } else {
                                   captureImage();
                                 }
                               }}
                             >
                                <Camera className={`w-5 h-5 ${isCameraActive ? 'text-white' : 'text-primary-600'}`} />
                                <div className="text-left">
                                  <p className="text-sm font-bold">{isCameraActive ? 'Capture Frame' : t.take_photo}</p>
                                  <p className="text-[10px] text-slate-500">{isCameraActive ? 'Save current live view' : 'Open live camera feed'}</p>
                                </div>
                             </Button>
                             <Button variant="outline" className="w-full justify-start gap-3 py-4" onClick={() => fileInputRef.current?.click()}>
                                <Upload className="w-5 h-5 text-accent-600" />
                                <div className="text-left">
                                  <p className="text-sm font-bold">{t.upload_img}</p>
                                  <p className="text-[10px] text-slate-500">Analyze existing photo</p>
                                </div>
                             </Button>
                          </Card>
                       </div>
                     ) : (
                       <Card className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                          <Radio className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                          <h4 className="text-sm font-bold dark:text-slate-300">Awaiting Connection</h4>
                          <p className="text-xs text-slate-500 mt-2">Connect to the UAV WiFi network to enable remote flight controls and live telemetry.</p>
                          <Button variant="primary" className="w-full mt-6" onClick={handleDroneConnect}>Connect Now</Button>
                       </Card>
                     )}
                  </div>
               </div>
            </div>
          )}

          {currentPage === 'profile' && user && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
               <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold dark:text-white">Farmer Settings</h3>
                  <Button variant="outline" className="py-2 px-4 text-xs" onClick={() => setIsLoggedIn(false)}>
                     <LogOut className="w-4 h-4" /> Sign Out
                  </Button>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1 space-y-6">
                     <Card className="text-center p-8">
                        <div className="w-24 h-24 rounded-full bg-primary-100 mx-auto overflow-hidden border-4 border-white shadow-xl mb-4 relative group">
                           <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt="Farmer" />
                        </div>
                        <h4 className="font-bold text-xl dark:text-white">{user.name}</h4>
                        <p className="text-sm text-slate-500">{user.farmName}</p>
                     </Card>

                     <Card className="p-6">
                        <h5 className="font-bold text-xs dark:text-white mb-6 uppercase tracking-widest text-slate-400">Language Options</h5>
                        <div className="space-y-2">
                           {[
                              { id: Language.ENGLISH, label: 'English', icon: '🇺🇸' },
                              { id: Language.TELUGU, label: 'తెలుగు', icon: '🇮🇳' },
                              { id: Language.HINDI, label: 'हिन्दी', icon: '🇮🇳' }
                           ].map(lang => (
                              <button 
                                 key={lang.id}
                                 onClick={() => setLanguage(lang.id)}
                                 className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${language === lang.id ? 'bg-primary-50 border-primary-500 text-primary-700' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400'}`}
                              >
                                 <span className="font-bold">{lang.label}</span>
                                 <span className="text-lg">{lang.icon}</span>
                              </button>
                           ))}
                        </div>
                     </Card>
                  </div>

                  <div className="lg:col-span-2">
                     <Card className="p-8">
                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <Input label="Farmer Name" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} icon={<UserIcon className="w-4 h-4" />} required />
                              <Input label="Phone Number" value={authForm.phone} onChange={e => setAuthForm({...authForm, phone: e.target.value})} icon={<Smartphone className="w-4 h-4" />} required />
                           </div>
                           <Input label="Email Address" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} icon={<Mail className="w-4 h-4" />} required />
                           <Input label="Farm Name" value={authForm.farmName} onChange={e => setAuthForm({...authForm, farmName: e.target.value})} icon={<Tractor className="w-4 h-4" />} required />
                           
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <Input label="Total Acreage" type="number" value={authForm.landSize} onChange={e => setAuthForm({...authForm, landSize: Math.max(1, Number(e.target.value))})} icon={<MapIcon className="w-4 h-4" />} required min="1" />
                           </div>

                           <div className="space-y-3">
                              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Crop Preferences</label>
                              <div className="flex flex-wrap gap-2">
                                 {availableCrops.map(crop => (
                                    <button key={crop} type="button" onClick={() => {
                                          const crops = authForm.mainCrops.includes(crop) ? authForm.mainCrops.filter(c => c !== crop) : [...authForm.mainCrops, crop];
                                          setAuthForm({...authForm, mainCrops: crops});
                                       }}
                                       className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${authForm.mainCrops.includes(crop) ? 'bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-500/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                                    > {crop} </button>
                                 ))}
                              </div>
                           </div>

                           <div className="pt-6 border-t dark:border-slate-800 flex gap-4">
                              <Button type="submit" variant="primary" className="flex-grow">
                                 <Save className="w-5 h-5" /> Update Profile
                              </Button>
                           </div>
                        </form>
                     </Card>
                  </div>
               </div>

               {isPreFlightModalOpen && (
                 <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
                   <Card className="max-w-md w-full p-8 space-y-6 animate-in zoom-in-95 duration-300">
                     <div className="flex items-center justify-between">
                       <h3 className="text-2xl font-bold dark:text-white">Pre-Flight Checklist</h3>
                       <button onClick={() => setIsPreFlightModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                         <X className="w-5 h-5 text-slate-500" />
                       </button>
                     </div>
                     <p className="text-sm text-slate-500">Ensure all systems are operational before launching the UAV mission.</p>
                     
                     <div className="space-y-3">
                       {[
                         { id: 'battery', label: 'Battery Level > 20%', icon: <Battery className="w-4 h-4" /> },
                         { id: 'gps', label: 'GPS Signal Locked', icon: <Signal className="w-4 h-4" /> },
                         { id: 'camera', label: 'Camera Calibrated', icon: <Camera className="w-4 h-4" /> },
                         { id: 'motors', label: 'Motors Status OK', icon: <Cpu className="w-4 h-4" /> }
                       ].map(item => (
                         <button 
                           key={item.id}
                           onClick={() => setPreFlightChecklist(prev => ({ ...prev, [item.id]: !prev[item.id as keyof typeof preFlightChecklist] }))}
                           className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${preFlightChecklist[item.id as keyof typeof preFlightChecklist] ? 'bg-primary-50 border-primary-500 text-primary-700' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400'}`}
                         >
                           <div className="flex items-center gap-3">
                             {item.icon}
                             <span className="font-bold text-sm">{item.label}</span>
                           </div>
                           {preFlightChecklist[item.id as keyof typeof preFlightChecklist] ? <Check className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-700" />}
                         </button>
                       ))}
                     </div>

                     <Button 
                       disabled={!Object.values(preFlightChecklist).every(v => v)} 
                       onClick={confirmPreFlight} 
                       className="w-full py-4"
                     >
                       Confirm & Launch Mission
                     </Button>
                   </Card>
                 </div>
               )}
            </div>
          )}

          {/* Market Intelligence View */}
          {currentPage === 'market' && (
            <div className="space-y-8 max-w-7xl mx-auto pb-24 animate-in fade-in duration-500">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                     <h3 className="text-3xl font-bold dark:text-white">Market Intelligence</h3>
                     <p className="text-slate-500 text-sm mt-1">Real-time prices and trusted dealer network</p>
                  </div>
                  <Button variant="primary" className="gap-2 px-8 py-4 rounded-2xl shadow-xl shadow-primary-500/20" onClick={() => setIsSellModalOpen(true)}>
                     <ShoppingBag className="w-5 h-5" />
                     Sell Your Crop
                  </Button>
               </div>

               {/* Sell Crop Modal */}
               {isSellModalOpen && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
                     <Card className="w-full max-w-lg p-8 space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-primary-600" />
                        <div className="flex justify-between items-center">
                           <h3 className="text-2xl font-bold dark:text-white">Sell Your Harvest</h3>
                           <button onClick={() => setIsSellModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                              <X className="w-5 h-5 text-slate-400" />
                           </button>
                        </div>
                        <div className="space-y-4">
                           <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Select Crop</label>
                              <select 
                                 className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-600 outline-none transition-all text-sm dark:text-slate-100"
                                 value={sellCropForm.crop}
                                 onChange={(e) => setSellCropForm({...sellCropForm, crop: e.target.value})}
                              >
                                 {availableCrops.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <Input 
                                 label="Quantity" 
                                 type="number" 
                                 placeholder="1" 
                                 value={sellCropForm.quantity}
                                 onChange={(e) => setSellCropForm({...sellCropForm, quantity: Math.max(1, Number(e.target.value))})}
                                 min="1"
                              />
                              <div className="space-y-1.5">
                                 <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Unit</label>
                                 <select 
                                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-600 outline-none transition-all text-sm dark:text-slate-100"
                                    value={sellCropForm.unit}
                                    onChange={(e) => setSellCropForm({...sellCropForm, unit: e.target.value})}
                                 >
                                    <option value="Quintals">Quintals</option>
                                    <option value="Tons">Tons</option>
                                    <option value="Kgs">Kgs</option>
                                 </select>
                              </div>
                           </div>
                           <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-2xl border border-primary-100 dark:border-primary-900/30">
                              <div className="flex items-center gap-3 text-primary-600 mb-2">
                                 <Info className="w-4 h-4" />
                                 <p className="text-xs font-bold uppercase tracking-wider">Estimated Value</p>
                              </div>
                              <p className="text-2xl font-bold dark:text-white">
                                 ₹{(sellCropForm.quantity * (marketPrices.find(p => p.crop === sellCropForm.crop)?.price || 0)).toLocaleString()}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-1">Based on current {sellCropForm.crop} market price of ₹{marketPrices.find(p => p.crop === sellCropForm.crop)?.price}/Quintal</p>
                           </div>
                        </div>
                        <div className="flex gap-4 pt-4">
                           <Button variant="ghost" className="flex-1" onClick={() => setIsSellModalOpen(false)}>Cancel</Button>
                           <Button variant="primary" className="flex-1" onClick={() => {
                              alert(`Offer submitted for ${sellCropForm.quantity} ${sellCropForm.unit} of ${sellCropForm.crop}. Local dealers will contact you soon.`);
                              setIsSellModalOpen(false);
                           }}>Post Offer</Button>
                        </div>
                     </Card>
                  </div>
               )}

               <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-8 space-y-8">
                     {/* Price Ticker */}
                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {marketPrices.map((item, idx) => (
                           <Card 
                              key={idx} 
                              className={`cursor-pointer transition-all border-2 ${selectedMarketCrop === item.crop ? 'border-primary-500 bg-primary-50/30 dark:bg-primary-900/10' : 'border-transparent'} p-5 group`}
                              onClick={() => setSelectedMarketCrop(item.crop)}
                           >
                              <div className="flex justify-between items-start mb-3">
                                 <p className="text-xs font-black uppercase tracking-widest text-slate-400">{item.crop}</p>
                                 {item.trend === 'up' ? <ChevronUp className="w-4 h-4 text-emerald-500" /> : <ChevronDown className="w-4 h-4 text-rose-500" />}
                              </div>
                              <p className="text-xl font-bold dark:text-white">₹{item.price}</p>
                              <p className={`text-[10px] font-bold mt-1 ${item.change > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                 {item.change > 0 ? '+' : ''}{item.change}%
                              </p>
                           </Card>
                        ))}
                     </div>

                     {/* Price Chart */}
                     <Card className="p-8">
                        <div className="flex items-center justify-between mb-8">
                           <div>
                              <h4 className="text-xl font-bold dark:text-white">{selectedMarketCrop} Price Trend</h4>
                              <p className="text-xs text-slate-500">7-day historical analysis</p>
                           </div>
                           <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                              <TrendingUp className="w-3 h-3" />
                              Bullish
                           </div>
                        </div>
                        <div className="h-[300px] w-full">
                           <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={marketPriceHistory[selectedMarketCrop as keyof typeof marketPriceHistory] || []}>
                                 <defs>
                                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                       <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                                       <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                                    </linearGradient>
                                 </defs>
                                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                 <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                                 <YAxis hide domain={['auto', 'auto']} />
                                 <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                 />
                                 <Area type="monotone" dataKey="price" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" />
                              </AreaChart>
                           </ResponsiveContainer>
                        </div>
                     </Card>
                  </div>

                  <div className="lg:col-span-4 space-y-8">
                     {/* Dealers Section */}
                     <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                           <h4 className="text-lg font-bold dark:text-white">Trusted Dealers</h4>
                           <Button variant="ghost" className="text-[10px] uppercase font-black tracking-widest text-primary-600">View All</Button>
                        </div>
                        <div className="space-y-4">
                           {dealers.map(dealer => (
                              <Card key={dealer.id} className="p-5 hover:border-primary-200 transition-all group">
                                 <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-4">
                                       <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                                          <Store className="w-6 h-6" />
                                       </div>
                                       <div>
                                          <h5 className="font-bold dark:text-white group-hover:text-primary-600 transition-colors">{dealer.name}</h5>
                                          <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                             <Locate className="w-3 h-3" /> {dealer.location}
                                          </p>
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg text-[10px] font-bold">
                                       <Star className="w-3 h-3 fill-current" />
                                       {dealer.rating}
                                    </div>
                                 </div>
                                 <div className="flex flex-wrap gap-2 mb-4">
                                    {dealer.specialization.map(s => (
                                       <span key={s} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-500 rounded-md">{s}</span>
                                    ))}
                                 </div>
                                 <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1 py-2.5 rounded-xl gap-2 text-xs" onClick={() => window.location.href = `tel:${dealer.phone}`}>
                                       <Phone className="w-3.5 h-3.5" />
                                       Call
                                    </Button>
                                    <Button variant="ghost" className="w-10 h-10 p-0 rounded-xl">
                                       <MessageSquareText className="w-4 h-4" />
                                    </Button>
                                 </div>
                              </Card>
                           ))}
                        </div>
                     </div>

                     {/* Market News */}
                     <Card className="p-6 bg-slate-900 text-white !border-none relative overflow-hidden">
                        <div className="relative z-10">
                           <h4 className="font-bold mb-4">Market Alert</h4>
                           <p className="text-sm text-slate-400 leading-relaxed mb-6">
                              Rice prices expected to rise by 5-8% in the coming week due to increased export demand. Consider holding stock for better margins.
                           </p>
                           <Button variant="glass" className="w-full text-xs">Read Full Report</Button>
                        </div>
                        <Zap className="absolute -bottom-6 -right-6 w-32 h-32 opacity-10 text-primary-500" />
                     </Card>
                  </div>
               </div>
            </div>
          )}

          {/* Health Analysis View */}
          {currentPage === 'health' && (
             <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold dark:text-white">Health Monitoring</h3>
                    <p className="text-sm text-slate-500">Real-time crop diagnosis and health tracking</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="outline" 
                      className="gap-2 py-2 px-4 text-xs"
                      onClick={() => setIsAnalysisSettingsOpen(true)}
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      Settings
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-8">
                    <Card className="aspect-video relative overflow-hidden bg-black !p-0 rounded-[2.5rem] border-4 border-primary-500/20 shadow-2xl">
                      <div className={`w-full h-full transition-opacity duration-500 ${isCameraActive ? 'opacity-100' : 'opacity-0'}`}>
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        {isFlashing && <div className="absolute inset-0 bg-white z-[60] animate-out fade-out duration-150" />}
                        {/* HUD elements */}
                        <div className="absolute inset-0 pointer-events-none border-[20px] border-white/5" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-primary-500/30 rounded-full animate-pulse pointer-events-none" />
                        <div className="absolute top-8 left-8 flex items-center gap-2 px-3 py-1.5 bg-red-600/80 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-white animate-pulse">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          Live Feed
                        </div>
                        
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 pointer-events-auto">
                          <Button variant="danger" className="rounded-full w-14 h-14 p-0 shadow-xl" onClick={stopCamera}>
                            <X className="w-7 h-7" />
                          </Button>
                          <Button variant="primary" className="rounded-full w-20 h-20 p-0 shadow-2xl shadow-primary-500/50 border-4 border-white/20" onClick={captureImage}>
                            <Camera className="w-10 h-10" />
                          </Button>
                        </div>
                      </div>

                      {!isCameraActive && (
                        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-slate-900 text-center p-8 z-10">
                          <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-8 border-2 border-slate-700">
                            <Camera className="w-12 h-12 text-slate-600" />
                          </div>
                          <h4 className="text-2xl font-bold text-white mb-3">Live Scanner Standby</h4>
                          <p className="text-slate-500 text-sm max-w-sm mb-10 leading-relaxed">Initialize your camera to start real-time crop health analysis and disease detection using our advanced AI models.</p>
                          <Button variant="primary" className="px-10 py-5 rounded-2xl shadow-2xl shadow-primary-500/30 text-lg font-bold" onClick={startCamera}>
                            Start Live Feed
                          </Button>
                        </div>
                      )}
                      <canvas ref={canvasRef} className="hidden" />
                    </Card>
                  </div>

                  <div className="lg:col-span-4 space-y-6">
                    <Card className="p-8 bg-primary-50/50 dark:bg-primary-900/10 border-primary-100 dark:border-primary-900/20 rounded-[2rem]">
                       <div className="flex items-center gap-4 mb-6">
                          <div className="p-3 bg-primary-100 dark:bg-primary-900/40 rounded-2xl text-primary-600">
                             <Upload className="w-6 h-6" />
                          </div>
                          <div>
                             <h4 className="font-bold dark:text-white">Quick Upload</h4>
                             <p className="text-xs text-slate-500">Analyze gallery photos</p>
                          </div>
                       </div>
                       <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">Already have a photo? Upload it here for instant diagnosis without using the live camera.</p>
                       <Button variant="outline" className="w-full py-4 rounded-2xl gap-3 border-2 hover:bg-white dark:hover:bg-slate-800" onClick={() => fileInputRef.current?.click()}>
                         {t.upload_img}
                       </Button>
                    </Card>

                    <Card className="p-8 rounded-[2rem]">
                       <div className="flex items-center justify-between mb-8">
                          <h4 className="font-bold dark:text-white">Health Stats</h4>
                          <Activity className="w-5 h-5 text-primary-600" />
                       </div>
                       <div className="space-y-6">
                          <div className="flex justify-between items-center">
                             <span className="text-sm text-slate-500">Average Health</span>
                             <span className="text-sm font-bold text-emerald-500">92%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                             <div className="h-full bg-emerald-500 rounded-full" style={{ width: '92%' }} />
                          </div>
                          <div className="grid grid-cols-2 gap-4 pt-4">
                             <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-center">
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Scans</p>
                                <p className="text-xl font-bold dark:text-white">124</p>
                             </div>
                             <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-center">
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Issues</p>
                                <p className="text-xl font-bold text-rose-500">3</p>
                             </div>
                          </div>
                       </div>
                    </Card>
                  </div>
                </div>

                {isAnalyzing && (
                  <Card className="p-12 flex flex-col items-center justify-center text-center space-y-6 bg-primary-50/50 dark:bg-primary-900/10 border-2 border-dashed border-primary-200 dark:border-primary-800">
                    <div className="relative">
                      <div className="w-20 h-20 border-4 border-primary-200 dark:border-primary-800 rounded-full border-t-primary-600 animate-spin" />
                      <Sparkles className="w-8 h-8 text-primary-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold dark:text-white">Analyzing Crop Health</h4>
                      <p className="text-sm text-slate-500 mt-2">Our AI is scanning for pests, diseases, and nutrient deficiencies...</p>
                    </div>
                  </Card>
                )}

                {analysisResult && (
                  <Card className="p-0 overflow-hidden animate-in slide-in-from-bottom-5 duration-500 border-2 border-primary-100 dark:border-primary-900/20">
                    <div className="grid grid-cols-1 md:grid-cols-12">
                      <div className="md:col-span-4 aspect-square">
                        <img src={analysisResult.imageUrl} className="w-full h-full object-cover" alt="Analyzed Crop" />
                      </div>
                      <div className="md:col-span-8 p-8 flex flex-col justify-between">
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${analysisResult.status === 'healthy' ? 'bg-green-500' : analysisResult.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`} />
                              <span className="text-xs font-black uppercase tracking-widest text-slate-500">{analysisResult.status} Analysis</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">{new Date(analysisResult.timestamp).toLocaleString()}</span>
                          </div>
                          
                          <div>
                            <h4 className="text-3xl font-bold dark:text-white">{analysisResult.disease !== 'none' ? analysisResult.disease : 'Optimal Health Detected'}</h4>
                            <p className="text-sm text-slate-500 mt-2">Confidence Score: <span className="font-mono font-bold text-primary-600">{(analysisResult.confidence * 100).toFixed(1)}%</span></p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="space-y-4">
                              <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Action Plan</h5>
                              <ul className="space-y-3">
                                {analysisResult.recommendations.map((rec, i) => (
                                  <li key={i} className="text-sm text-slate-600 dark:text-slate-300 flex gap-3 items-start">
                                    <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {analysisResult.youtubeLinks && analysisResult.youtubeLinks.length > 0 && (
                              <div className="space-y-4">
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Educational Resources</h5>
                                <div className="space-y-2">
                                  {analysisResult.youtubeLinks.map((link, i) => (
                                    <button 
                                      key={i} 
                                      onClick={() => setPlayingVideoUrl(link.url)}
                                      className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-transparent hover:border-red-200 transition-all group text-left"
                                    >
                                      <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
                                        <Video className="w-4 h-4" />
                                      </div>
                                      <span className="text-xs font-bold dark:text-slate-200 truncate flex-grow">{link.title}</span>
                                      <Play className="w-3 h-3 text-slate-300 group-hover:text-red-500" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-8 pt-6 border-t dark:border-slate-800">
                          <Button variant="outline" className="w-full py-3" onClick={() => setAnalysisResult(null)}>Dismiss Analysis</Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   {fields.map(field => (
                      <Card key={field.id} className="relative overflow-hidden group">
                         <div className={`absolute top-0 right-0 h-1 w-full ${field.healthScore > 85 ? 'bg-green-500' : 'bg-amber-500'}`} />
                         <div className="flex justify-between items-start mb-6">
                            <div>
                               <h4 className="font-bold text-lg dark:text-white">{field.name}</h4>
                            </div>
                         </div>
                      </Card>
                   ))}
                </div>

                {isAnalysisSettingsOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <Card className="w-full max-w-md p-8 bg-white dark:bg-slate-900 shadow-2xl animate-in zoom-in-95 duration-300">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl text-primary-600">
                            <SlidersHorizontal className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold dark:text-white">Analysis Settings</h3>
                            <p className="text-sm text-slate-500">Fine-tune AI detection</p>
                          </div>
                        </div>
                        <button onClick={() => setIsAnalysisSettingsOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                          <X className="w-6 h-6 dark:text-slate-400" />
                        </button>
                      </div>

                      <div className="space-y-8">
                        <div className="space-y-4">
                          <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Detection Sensitivity</label>
                          <div className="grid grid-cols-3 gap-2">
                            {['standard', 'high', 'ultra'].map((s) => (
                              <button
                                key={s}
                                onClick={() => setAnalysisSettings(prev => ({ ...prev, sensitivity: s as any }))}
                                className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border-2 ${
                                  analysisSettings.sensitivity === s 
                                    ? 'bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-500/30' 
                                    : 'border-slate-200 dark:border-slate-800 dark:text-slate-400 hover:border-primary-500/50'
                                }`}
                              >
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-slate-500">Higher sensitivity detects earlier signs but may increase false positives.</p>
                        </div>

                        <div className="space-y-4">
                          <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Detail Level</label>
                          <div className="grid grid-cols-3 gap-2">
                            {['basic', 'standard', 'comprehensive'].map((d) => (
                              <button
                                key={d}
                                onClick={() => setAnalysisSettings(prev => ({ ...prev, detailLevel: d as any }))}
                                className={`py-3 px-2 rounded-xl text-xs font-bold transition-all border-2 ${
                                  analysisSettings.detailLevel === d 
                                    ? 'bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-500/30' 
                                    : 'border-slate-200 dark:border-slate-800 dark:text-slate-400 hover:border-primary-500/50'
                                }`}
                              >
                                {d.charAt(0).toUpperCase() + d.slice(1)}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-slate-500">Comprehensive mode provides deeper scientific insights and technical data.</p>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                          <div className="flex items-center gap-3">
                            <BookOpen className="w-5 h-5 text-primary-600" />
                            <div>
                              <p className="text-sm font-bold dark:text-white">Include Research</p>
                              <p className="text-xs text-slate-500">Add latest scientific findings</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setAnalysisSettings(prev => ({ ...prev, includeResearch: !prev.includeResearch }))}
                            className={`w-12 h-6 rounded-full transition-colors relative ${analysisSettings.includeResearch ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${analysisSettings.includeResearch ? 'left-7' : 'left-1'}`} />
                          </button>
                        </div>

                        <Button variant="primary" className="w-full py-4 rounded-2xl shadow-xl shadow-primary-500/20" onClick={() => setIsAnalysisSettingsOpen(false)}>
                          Save Configuration
                        </Button>
                      </div>
                    </Card>
                  </div>
                )}
             </div>

          )}

          {/* AI Assistant View */}
          {currentPage === 'assistant' && (
            <div className="max-w-4xl mx-auto h-full flex flex-col gap-6 pb-20">
               <Card className="flex-grow flex flex-col !p-0 overflow-hidden bg-slate-50 dark:bg-slate-900/50 min-h-[600px]">
                  <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 border-b dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                     <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="p-3 bg-primary-100 dark:bg-primary-900/40 rounded-2xl text-primary-600"> <Sparkles className="w-6 h-6" /> </div>
                        <div>
                           <h3 className="text-lg sm:text-xl font-bold dark:text-white">AgroAssist</h3>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Your AI Farm Expert</p>
                        </div>
                     </div>
                     <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                        <button 
                          onClick={() => setAssistantMode('chat')}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${assistantMode === 'chat' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-500'}`}
                        >
                           <MessageSquareText className="w-4 h-4" /> Chat
                        </button>
                        <button 
                          onClick={() => setAssistantMode('live')}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${assistantMode === 'live' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-500'}`}
                        >
                           <Mic className="w-4 h-4" /> Live
                        </button>
                     </div>
                  </div>

                  {assistantMode === 'live' ? (
                    <div className="flex-grow flex flex-col">
                      <div className="flex-grow p-6 sm:p-8 overflow-y-auto space-y-6 scroll-smooth">
                        <div className="flex items-center justify-between mb-4">
                           <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${isLiveActive ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                 {isLiveActive ? 'Live Session Active' : 'Voice Assistant Idle'}
                              </span>
                           </div>
                           {!isLiveActive ? (
                              <Button onClick={startLiveAssistant} className="py-2 px-4 text-xs">
                                 <Mic className="w-4 h-4" /> Start Voice
                              </Button>
                           ) : (
                              <Button onClick={stopLiveAssistant} variant="danger" className="py-2 px-4 text-xs">
                                 <MicOff className="w-4 h-4" /> Stop Session
                              </Button>
                           )}
                        </div>

                        {liveTranscription.length === 0 && (
                           <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                              <Mic className="w-16 h-16 mb-4" />
                              <p className="text-slate-500 font-medium">Speak with AgroAssist for real-time advice.</p>
                           </div>
                        )}
                        {liveTranscription.map((t, i) => (
                           <div key={i} className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                              <div className="flex justify-end">
                                 <div className="bg-primary-600 text-white p-4 rounded-2xl rounded-tr-none max-w-[80%] shadow-md">
                                    <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-1">You</p>
                                    <p className="text-sm">{t.user}</p>
                                 </div>
                              </div>
                              <div className="flex justify-start">
                                 <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none max-w-[80%] shadow-md border dark:border-slate-700">
                                    <p className="text-xs font-black uppercase tracking-widest text-primary-600 mb-1">AgroAssist</p>
                                    <p className="text-sm dark:text-slate-200">{t.ai}</p>
                                 </div>
                              </div>
                           </div>
                        ))}
                        {(currentUserText || currentAiText) && (
                           <div className="space-y-4 opacity-60">
                              {currentUserText && (
                                 <div className="flex justify-end">
                                    <div className="bg-primary-600/50 text-white p-4 rounded-2xl rounded-tr-none max-w-[80%]">
                                       <p className="text-sm italic">{currentUserText}...</p>
                                    </div>
                                 </div>
                              )}
                              {currentAiText && (
                                 <div className="flex justify-start">
                                    <div className="bg-white/50 dark:bg-slate-800/50 p-4 rounded-2xl rounded-tl-none max-w-[80%] border dark:border-slate-700">
                                       <p className="text-sm italic dark:text-slate-200">{currentAiText}...</p>
                                    </div>
                                 </div>
                              )}
                           </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-grow flex flex-col">
                      <div className="flex-grow p-6 sm:p-8 overflow-y-auto space-y-6 scroll-smooth">
                        {chatMessages.length === 0 && (
                           <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                              <MessageSquareText className="w-16 h-16 mb-4" />
                              <p className="text-slate-500 font-medium">Ask AgroAssist anything about your farm.</p>
                              <p className="text-xs text-slate-400 mt-2">You can also upload an image for analysis.</p>
                           </div>
                        )}
                        {chatMessages.map((msg, i) => (
                           <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                              <div className={`max-w-[85%] p-4 rounded-2xl shadow-md ${
                                msg.role === 'user' 
                                  ? 'bg-primary-600 text-white rounded-tr-none' 
                                  : 'bg-white dark:bg-slate-800 dark:text-slate-200 rounded-tl-none border dark:border-slate-700'
                              }`}>
                                 <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">
                                    {msg.role === 'user' ? 'You' : 'AgroAssist'} • {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                 </p>
                                 {msg.imageUrl && (
                                   <div className="mb-3 rounded-xl overflow-hidden border border-white/20">
                                     <img src={msg.imageUrl} alt="Uploaded" className="max-w-full h-auto max-h-60 object-cover" />
                                   </div>
                                 )}
                                 <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                              </div>
                           </div>
                        ))}
                        {isSendingChat && (
                          <div className="flex justify-start animate-pulse">
                             <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none shadow-md border dark:border-slate-700">
                                <div className="flex gap-1">
                                   <div className="w-1.5 h-1.5 bg-primary-600 rounded-full animate-bounce" />
                                   <div className="w-1.5 h-1.5 bg-primary-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                                   <div className="w-1.5 h-1.5 bg-primary-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                                </div>
                             </div>
                          </div>
                        )}
                      </div>

                      <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border-t dark:border-slate-800">
                         {chatImage && (
                           <div className="mb-4 relative inline-block">
                              <img src={chatImage} alt="Preview" className="w-20 h-20 object-cover rounded-xl border-2 border-primary-500" />
                              <button 
                                onClick={() => setChatImage(null)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"
                              >
                                 <X className="w-3 h-3" />
                              </button>
                           </div>
                         )}
                         <div className="flex items-center gap-3">
                            <button 
                              onClick={() => chatFileInputRef.current?.click()}
                              className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary-600 rounded-2xl transition-colors"
                            >
                               <Camera className="w-5 h-5" />
                            </button>
                            <input 
                              type="text" 
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                              placeholder="Type your question..."
                              className="flex-grow bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-3 text-sm dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                            <button 
                              onClick={handleSendChatMessage}
                              disabled={isSendingChat || (!chatInput.trim() && !chatImage)}
                              className="p-3 bg-primary-600 text-white rounded-2xl hover:bg-primary-700 disabled:opacity-50 transition-all shadow-lg shadow-primary-600/20"
                            >
                               <ChevronRight className="w-5 h-5" />
                            </button>
                         </div>
                         <input 
                           type="file" 
                           ref={chatFileInputRef} 
                           className="hidden" 
                           accept="image/*" 
                           onChange={handleChatImageUpload} 
                         />
                      </div>
                    </div>
                  )}
               </Card>
            </div>
          )}
        </div>
      </main>

      {isWifiModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <Card className="max-w-md w-full p-8 space-y-6 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold dark:text-white">UAV WiFi Connection</h3>
              <button onClick={() => setIsWifiModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-500">Select the drone's WiFi network to establish a secure telemetry link.</p>
            
            <div className="space-y-3">
              {[
                { id: 'AgroLife_X1_5G', label: 'AgroLife_X1_5G', signal: 'Strong' },
                { id: 'AgroLife_X1_2.4G', label: 'AgroLife_X1_2.4G', signal: 'Medium' },
                { id: 'Farm_Guest_WiFi', label: 'Farm_Guest_WiFi', signal: 'Weak' }
              ].map(net => (
                <button 
                  key={net.id}
                  onClick={() => connectWifi(net.id)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Wifi className="w-5 h-5 text-primary-600" />
                    <div className="text-left">
                      <p className="font-bold text-sm dark:text-slate-200">{net.label}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest">{net.signal} Signal</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t dark:border-slate-800 px-2 py-3 flex items-center justify-around z-[100] shadow-[0_-10px_30px_rgba(0,0,0,0.05)] h-20">
        {[
          { id: 'dashboard', icon: <Home className="w-5 h-5" />, label: 'Home' },
          { id: 'fields', icon: <MapIcon className="w-5 h-5" />, label: 'Fields' },
          { id: 'drone', icon: <Plane className="w-5 h-5" />, label: 'Drone' },
          { id: 'assistant', icon: <Sparkles className="w-5 h-5" />, label: 'AI' },
          { id: 'market', icon: <TrendingUp className="w-5 h-5" />, label: 'Market' },
          { id: 'options', icon: <MoreHorizontal className="w-5 h-5" />, label: 'More' }
        ].map(item => (
          <button key={item.id} onClick={() => item.id === 'options' ? setIsOptionsMenuOpen(!isOptionsMenuOpen) : navigateTo(item.id)} className={`flex flex-col items-center gap-1 transition-all flex-1 ${currentPage === item.id ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`}>
            <div className={`p-2 rounded-xl transition-all ${currentPage === item.id || (item.id === 'options' && isOptionsMenuOpen) ? 'bg-primary-50 dark:bg-primary-900/20 scale-110 shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-slate-800/40'}`}> {item.icon} </div>
            <span className="text-[9px] font-bold uppercase tracking-tight">{item.label}</span>
          </button>
        ))}
      </nav>

      {isOptionsMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] animate-in fade-in duration-300" onClick={() => setIsOptionsMenuOpen(false)}>
          <div className="absolute bottom-24 left-4 right-4 bg-white dark:bg-slate-900 rounded-4xl p-6 shadow-2xl border dark:border-slate-800 animate-in slide-in-from-bottom-10 duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg dark:text-white">Quick Options</h3>
              <button onClick={() => setIsOptionsMenuOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"> <X className="w-5 h-5 text-slate-500" /> </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {SECONDARY_NAV.map(item => (
                <button key={item.id} onClick={() => navigateTo(item.id)} className={`flex flex-col items-center gap-3 p-4 rounded-3xl transition-all border ${currentPage === item.id ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-100' : 'bg-slate-50 dark:bg-slate-800 border-transparent'}`}>
                  <div className="p-3 bg-white dark:bg-slate-700 rounded-2xl shadow-sm text-primary-600"> {item.icon} </div>
                  <span className="text-xs font-bold dark:text-slate-300 capitalize">{t[item.label as keyof typeof t]}</span>
                </button>
              ))}
              <button onClick={() => setIsLoggedIn(false)} className="flex flex-col items-center gap-3 p-4 bg-red-50 dark:bg-red-900/10 rounded-3xl col-span-2 border border-red-100 dark:border-red-900/20">
                 <div className="p-3 bg-white dark:bg-slate-700 rounded-2xl shadow-sm text-red-500"> <LogOut className="w-5 h-5" /> </div>
                 <span className="text-xs font-bold text-red-600">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {playingVideoUrl && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
          <div className="w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl relative">
            <button 
              onClick={() => setPlayingVideoUrl(null)}
              className="absolute top-4 right-4 z-10 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all"
            >
              <X className="w-6 h-6" />
            </button>
            {getYouTubeId(playingVideoUrl) ? (
              <>
                <iframe 
                  src={`https://www.youtube.com/embed/${getYouTubeId(playingVideoUrl)}?autoplay=1&rel=0&modestbranding=1&origin=${window.location.origin}`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
                  <a 
                    href={playingVideoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-bold flex items-center gap-2 transition-all border border-white/10"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Watch on YouTube
                  </a>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white gap-4">
                <Video className="w-16 h-16 opacity-20" />
                <p className="text-xl font-bold opacity-60">Unable to play this video format</p>
                <a href={playingVideoUrl} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-primary-600 rounded-full font-bold">Open in Browser</a>
              </div>
            )}
          </div>
        </div>
      )}

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
    </div>
  );
}
