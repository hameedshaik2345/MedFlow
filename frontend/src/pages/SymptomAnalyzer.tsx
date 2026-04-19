import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from '@tanstack/react-router';
import { Bot, FileText, Calendar, Building, Search, X, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const REAL_COORDS: Record<string, { lat: number; lng: number }> = {
  "AIIMS Mangalagiri": { lat: 16.4262, lng: 80.5976 },
  "NRI General Hospital": { lat: 16.4260, lng: 80.5694 },
  "Manipal Hospitals": { lat: 16.4475, lng: 80.6055 },
  "Vedanata Hospital": { lat: 16.3069, lng: 80.4365 },
  "Aster Ramesh Guntur": { lat: 16.3125, lng: 80.4429 },
  "Kamineni Hospital": { lat: 16.5029, lng: 80.6277 },
  "LV Prasad Eye Institute": { lat: 16.4447, lng: 80.6231 }
};

export default function SymptomAnalyzer() {
  const { token, user } = useAuth();
  const [symptoms, setSymptoms] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<{ specialties: string[], doctors: any[] } | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
        (error) => console.error("Error getting location", error)
      );
    }
  }, []);

  const normalizeHospitalName = (address?: string) => {
    if (!address) return "Other";
    const addr = address.toLowerCase();
    if (addr.includes("aiims")) return "AIIMS Mangalagiri";
    if (addr.includes("nri")) return "NRI General Hospital";
    if (addr.includes("manipal")) return "Manipal Hospitals";
    if (addr.includes("vedanata") || addr.includes("vedanta")) return "Vedanata Hospital"; 
    if (addr.includes("aster") || addr.includes("ramesh")) return "Aster Ramesh Guntur";
    if (addr.includes("kamineni")) return "Kamineni Hospital";
    if (addr.includes("lv prasad")) return "LV Prasad Eye Institute";
    return address; 
  };

  const getHospitalCoordinates = (hospitalName: string) => {
    return REAL_COORDS[hospitalName] || { lat: 16.3069, lng: 80.4365 };
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2); 
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim()) return;

    setIsAnalyzing(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/symptoms/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ symptoms })
      });
      const data = await res.json();
      if (res.ok) {
        setResults({ specialties: data.specialties, doctors: data.doctors });
      } else {
        toast.error(data.message || 'Analysis failed');
      }
    } catch (err) {
      toast.error('Network error during analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setResults(null);
    setSymptoms('');
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8 mt-2">
         <h1 className="text-3xl font-bold flex items-center gap-3">
           <div className="bg-blue-100 p-2 rounded-full">
             <Bot className="h-6 w-6 text-blue-600" />
           </div>
           Symptom Analyzer
         </h1>
         {results && <Button variant="outline" onClick={handleReset} className="flex items-center gap-2"><X className="w-4 h-4" /> Start Over</Button>}
      </div>

      {!results ? (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-4">What symptoms are you feeling?</h2>
            <p className="text-gray-500 mb-6">Describe your condition (e.g., "I have a sharp headache and fever") and we'll recommend the best specialists at the nearest hospitals.</p>
            
            <form onSubmit={handleAnalyze} className="space-y-6">
              <textarea 
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="w-full h-40 p-5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 transition-all text-lg"
                placeholder="Type your symptoms here..."
              />
              <Button 
                type="submit" 
                disabled={isAnalyzing || !symptoms.trim()}
                className="w-full bg-[#0066CC] hover:bg-[#0052A3] text-white py-6 text-xl rounded-xl"
              >
                {isAnalyzing ? (
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                    Analyzing your symptoms...
                  </div>
                ) : 'Analyze Symptoms'}
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 space-y-6">
               <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                  <h3 className="text-sm font-bold text-blue-900 uppercase tracking-widest mb-4">Recommendations</h3>
                  <div className="space-y-3">
                    {results.specialties.map(sp => (
                      <div key={sp} className="flex items-center gap-2 text-blue-700 bg-white px-3 py-2 rounded-lg border border-blue-100 shadow-sm font-medium">
                        <FileText className="h-4 w-4" /> {sp}
                      </div>
                    ))}
                  </div>
               </div>
               
               <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                  <p className="text-sm text-emerald-800 font-medium">We found {results.doctors.length} doctors matching your requirements across all affiliated hospitals.</p>
               </div>
            </div>

            <div className="lg:col-span-3">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {results.doctors.map(doc => {
                    const hospital = normalizeHospitalName(doc.address);
                    const coords = getHospitalCoordinates(hospital);
                    let distance: string | null = null;
                    if (userLocation) {
                      distance = calculateDistance(userLocation.lat, userLocation.lng, coords.lat, coords.lng);
                    }

                    return (
                      <div key={doc._id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col group">
                        <div className="p-6 flex-1">
                           <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                <div className="h-12 w-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                  <Search className="h-6 w-6" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-gray-900 text-lg">Dr. {doc.name?.replace(/^Dr\.\s+/i, '')}</h4>
                                  <p className="text-sm text-blue-600 font-medium uppercase tracking-tighter">{doc.specialty}</p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end">
                                 <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${
                                    doc.liveStatus === 'Surgery' ? 'text-red-600 bg-red-50' :
                                    doc.liveStatus === 'Break' ? 'text-amber-600 bg-amber-50' :
                                    doc.liveStatus === 'Offline' ? 'text-gray-500 bg-gray-50' :
                                    'text-emerald-600 bg-emerald-50'
                                 }`}>
                                    {doc.liveStatus || 'Live'}
                                 </span>
                                 <p className="text-[10px] text-gray-400 mt-1">Token: #{(doc as any).currentToken || 0}</p>
                              </div>
                           </div>
                           
                           <div className="space-y-3 text-sm text-gray-600 mb-6">
                              <div className="flex items-start gap-2">
                                 <Building className="h-4 w-4 text-gray-400" />
                                 <span className="font-medium text-gray-800">{hospital}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                 <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                                 <div className="flex flex-col">
                                    <span className="text-xs text-gray-500 line-clamp-1">{doc.address}</span>
                                    {distance && <span className="text-emerald-600 font-bold text-[10px] uppercase tracking-wider mt-0.5">{distance} km from your location</span>}
                                 </div>
                              </div>
                           </div>
                        </div>
                        
                        <div className="p-4 bg-gray-50 border-t flex items-center justify-end">
                           <Link 
                             to="/book-appointment" 
                             search={{ doctorId: doc._id, doctorName: doc.name }}
                             className="bg-[#0066CC] hover:bg-[#0052A3] text-white px-6 py-2 rounded-lg text-sm font-bold transition-all shadow-sm active:scale-95"
                           >
                             Book Visit
                           </Link>
                        </div>
                      </div>
                    );
                  })}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
