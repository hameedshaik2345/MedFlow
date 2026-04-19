import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearch } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MapPin, User, Calendar, CreditCard, CheckCircle, Download, Clock } from 'lucide-react';

interface Doctor {
  _id: string;
  name: string;
  specialty: string;
  department: string;
  experienceYears: number;
  address?: string; 
  currentToken?: number;
  liveStatus?: string;
}

const PREDEFINED_HOSPITALS = [
  "AIIMS Mangalagiri",
  "NRI General Hospital",
  "Manipal Hospitals",
  "Vedanata Hospital",
  "Aster Ramesh Guntur",
  "Kamineni Hospital",
  "LV Prasad Eye Institute"
];

const normalizeHospitalName = (address?: string) => {
  if (!address) return "Other";
  const addr = address.toLowerCase();
  
  if (addr.includes("aiims")) return "AIIMS Mangalagiri";
  if (addr.includes("nri") || addr.includes("n.r.i")) return "NRI General Hospital";
  if (addr.includes("manipal")) return "Manipal Hospitals";
  if (addr.includes("vedanata") || addr.includes("vedanta")) return "Vedanata Hospital"; 
  if (addr.includes("aster") || addr.includes("ramesh")) return "Aster Ramesh Guntur";
  if (addr.includes("kamineni")) return "Kamineni Hospital";
  if (addr.includes("lv prasad") || addr.includes("l.v") || addr.includes("l v")) return "LV Prasad Eye Institute";
  
  return address; 
};

const REAL_COORDS: Record<string, { lat: number; lng: number }> = {
  "AIIMS Mangalagiri": { lat: 16.4262, lng: 80.5976 },
  "NRI General Hospital": { lat: 16.4260, lng: 80.5694 },
  "Manipal Hospitals": { lat: 16.4475, lng: 80.6055 },
  "Vedanata Hospital": { lat: 16.3069, lng: 80.4365 },
  "Aster Ramesh Guntur": { lat: 16.3125, lng: 80.4429 },
  "Kamineni Hospital": { lat: 16.5029, lng: 80.6277 },
  "LV Prasad Eye Institute": { lat: 16.4447, lng: 80.6231 }
};

const getHospitalCoordinates = (hospitalName: string) => {
  return REAL_COORDS[hospitalName] || { lat: 16.3069, lng: 80.4365 };
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return (R * c).toFixed(1);
};

const getTokenInfo = (token: number) => {
  if (token <= 10) return { time: "09:00 AM - 09:30 AM", session: "Morning (Tokens 1-10)" };
  if (token <= 20) return { time: "09:40 AM - 10:20 AM", session: "Morning (Tokens 11-20)" };
  if (token <= 30) return { time: "10:30 AM - 11:10 AM", session: "Morning (Tokens 21-30)" };
  if (token <= 40) return { time: "11:20 AM - 12:00 PM", session: "Morning (Tokens 31-40)" };
  if (token <= 50) return { time: "12:10 PM - 12:50 PM", session: "Morning (Tokens 41-50)" };
  if (token <= 60) return { time: "04:00 PM - 04:40 PM", session: "Evening (Tokens 51-60)" };
  if (token <= 70) return { time: "04:50 PM - 05:30 PM", session: "Evening (Tokens 61-70)" };
  if (token <= 80) return { time: "05:40 PM - 06:20 PM", session: "Evening (Tokens 71-80)" };
  if (token <= 90) return { time: "06:30 PM - 07:10 PM", session: "Evening (Tokens 81-90)" };
  return { time: "07:20 PM - 08:00 PM", session: "Evening (Tokens 91-100)" };
};

export default function AppointmentBooking() {
  const { user } = useAuth();
  const search = useSearch({ strict: false }) as any;
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [step, setStep] = useState(1);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<string>('');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  
  // Appt State
  const [appointmentDate, setAppointmentDate] = useState('');
  const [selectedToken, setSelectedToken] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  
  // Payment Modal
  const [showQR, setShowQR] = useState(false);
  const [bookedTokens, setBookedTokens] = useState<number[]>([]);

  useEffect(() => {
    if (appointmentDate && selectedDoctor) {
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/medical-appointments/booked-tokens/${selectedDoctor._id}/${appointmentDate}`)
        .then(res => res.json())
        .then(data => setBookedTokens(data))
        .catch(err => console.error("Error fetching booked tokens", err));
    }
  }, [appointmentDate, selectedDoctor]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
        (error) => console.error("Error getting location", error)
      );
    }

    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/doctors/list`)
      .then(res => res.json())
      .then(data => {
        setDoctors(data);
        // If we have a doctorId in search, auto-select
        if (search?.doctorId) {
          const doc = data.find((d: any) => d._id === search.doctorId);
          if (doc) {
            setSelectedDoctor(doc);
            setStep(2);
          }
        }
      })
      .catch(err => console.error("Error fetching doctors", err));
  }, [search?.doctorId]);

  const handleBook = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/medical-appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          doctorId: selectedDoctor?._id,
          doctorName: selectedDoctor?.name,
          doctorSpecialty: selectedDoctor?.specialty || selectedDoctor?.department || 'General',
          appointmentDate: `${appointmentDate} ${selectedToken ? getTokenInfo(selectedToken).time.split(' - ')[0] : ''}`,
          reason: `Reason: ${reason} | Token: ${selectedToken}`,
          tokenNumber: selectedToken
        })
      });
      
      if (res.ok) {
        toast.success('Payment successful! Appointment confirmed.');
        setShowQR(false);
        setStep(5); // Receipt step
      } else {
        const data = await res.json();
        toast.error(data.message || 'Error booking appointment');
      }
    } catch (error) {
      toast.error('Failed to connect to server for booking');
    }
  };

  const handlePrint = () => {
    window.print();
  };


  const hospitals = PREDEFINED_HOSPITALS;
  const normalizedDoctors = doctors
    .map(doc => ({ ...doc, address: normalizeHospitalName(doc.address) }))
    .filter(doc => hospitals.includes(doc.address || ''));

  const filteredDoctors = selectedHospital ? normalizedDoctors.filter(d => d.address === selectedHospital) : normalizedDoctors;

  // Generate tokens logic
  const isTokenTaken = (t: number) => {
    return bookedTokens.includes(t); 
  };
  const isTokenBlockedForPatient = (t: number) => {
    return t % 10 === 0; // Admin only
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #receipt-section, #receipt-section * { visibility: visible; }
          #receipt-section { position: absolute; left: 0; top: 0; width: 100%; border: none; box-shadow: none; }
          .no-print { display: none !important; }
          ::-webkit-scrollbar { display: none; }
        }
      `}} />
      <div className="max-w-4xl mx-auto p-4 md:p-6 mt-4 md:mt-10 bg-white rounded-xl shadow-lg border border-gray-100">
        
        {step < 5 && (
          <div className="mb-8 p-4 bg-gray-50 rounded-lg no-print">
            <div className="flex flex-wrap justify-between items-center text-[10px] sm:text-sm font-medium text-gray-500 gap-2">
              <div className={`flex items-center ${step >= 1 ? 'text-primary' : ''}`}><User className="w-4 h-4 mr-1 sm:w-5 sm:h-5"/> 1. Doctor</div>
              <div className="hidden sm:block flex-1 border-t-2 border-gray-200 mx-1"></div>
              <div className={`flex items-center ${step >= 2 ? 'text-primary' : ''}`}><User className="w-4 h-4 mr-1 sm:w-5 sm:h-5"/> 2. Details</div>
              <div className="hidden sm:block flex-1 border-t-2 border-gray-200 mx-1"></div>
              <div className={`flex items-center ${step >= 3 ? 'text-primary' : ''}`}><Calendar className="w-4 h-4 mr-1 sm:w-5 sm:h-5"/> 3. Slot</div>
              <div className="hidden sm:block flex-1 border-t-2 border-gray-200 mx-1"></div>
              <div className={`flex items-center ${step >= 4 ? 'text-primary' : ''}`}><CreditCard className="w-4 h-4 mr-1 sm:w-5 sm:h-5"/> 4. Pay</div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2">
              <h2 className="text-xl font-bold mb-4 md:mb-0">Select a Doctor</h2>
              <div className="w-full md:w-64">
                <select 
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                  value={selectedHospital}
                  onChange={(e) => setSelectedHospital(e.target.value)}
                >
                  <option value="">All Hospitals</option>
                  {hospitals.map((hospital, idx) => (
                    <option key={idx} value={hospital}>{hospital}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
              {filteredDoctors.length === 0 ? <p className="text-gray-500">No doctors available.</p> : filteredDoctors.map(doc => {
                const coords = doc.address ? getHospitalCoordinates(doc.address) : null;
                const distance = userLocation && coords ? calculateDistance(userLocation.lat, userLocation.lng, coords.lat, coords.lng) : null;
                
                return (
                  <div 
                    key={doc._id} 
                    className={`p-4 border rounded-lg cursor-pointer transition-all flex flex-col justify-between ${selectedDoctor?._id === doc._id ? 'border-primary bg-primary/5 shadow-md ring-1 ring-primary' : 'border-gray-200 hover:border-primary/50 hover:shadow-sm'}`}
                    onClick={() => setSelectedDoctor(doc)}
                  >
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">Dr. {doc.name?.replace(/^Dr\.\s+/i, '')}</h3>
                      <p className="text-gray-600 font-medium">{doc.specialty || doc.department || 'General Practitioner'}</p>
                      <p className="text-sm text-gray-400 mt-1">{doc.experienceYears || 0} years experience</p>
                      {doc.address && (
                        <p className="text-sm text-gray-600 mt-3 font-medium bg-gray-50 inline-block px-2 py-1 rounded-md border border-gray-100 mb-2">
                          <span className="text-gray-400 mr-1">Hospital:</span> {doc.address}
                        </p>
                      )}
                      
                      <div className={`mt-2 text-xs font-bold px-2 py-1 rounded-md inline-block border ${
                        doc.liveStatus === 'Surgery' ? 'bg-red-50 text-red-700 border-red-100' :
                        doc.liveStatus === 'Break' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        doc.liveStatus === 'Offline' ? 'bg-gray-50 text-gray-400 border-gray-100' :
                        'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
                        <span className="mr-1">Live Token: #{doc.currentToken || 0}</span>
                        <span className="opacity-75">({doc.liveStatus || 'Live'})</span>
                      </div>
                    </div>
                    {doc.address && coords && (
                      <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                        <div className="flex items-center text-sm font-medium text-emerald-600">
                          <MapPin className="w-4 h-4 mr-1" />
                          {distance ? `${distance} km away` : 'Location available'}
                        </div>
                        <a 
                          href={userLocation ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${coords.lat},${coords.lng}` : `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs bg-white text-gray-700 border border-gray-200 px-3 py-1.5 rounded-full hover:bg-gray-50 hover:text-primary hover:border-primary/30 transition-all font-medium shadow-sm flex items-center"
                        >
                          <MapPin className="w-3 h-3 mr-1" /> Map Route
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-8 flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!selectedDoctor} className="px-8 shadow-md">Proceed to Patient Details</Button>
            </div>
          </div>
        )}

        {step === 2 && !user && (
          <div className="p-12 text-center bg-blue-50 rounded-xl border border-blue-100 animate-in fade-in duration-500">
             <div className="flex justify-center mb-6">
                <div className="bg-white p-4 rounded-full shadow-sm"><User className="w-12 h-12 text-[#0066CC]"/></div>
             </div>
             <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Required</h2>
             <p className="text-gray-600 mb-8 max-w-sm mx-auto">To secure this appointment, please sign in to your MedFlow patient account.</p>
             <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="outline" onClick={() => setStep(1)} className="px-8">Back to Doctors</Button>
                <Button onClick={() => window.location.href = '/login'} className="bg-[#0066CC] px-8 shadow-md">Sign In / Register</Button>
             </div>
          </div>
        )}

        {step === 2 && user && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-bold">Patient Details</h2>
            <div className="bg-blue-50 border border-blue-100 p-6 rounded-lg space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Patient Name</p>
                  <p className="text-lg font-bold text-gray-900">{user.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Email Address</p>
                  <p className="text-lg font-bold text-gray-900">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Contact Role</p>
                  <p className="text-lg font-bold text-gray-900 capitalize">{user.role}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Selected Doctor</p>
                  <p className="text-lg font-bold text-primary">{selectedDoctor?.name}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Visit (Optional)</label>
              <textarea 
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full flex min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary shadow-sm"
                placeholder="Briefly describe your symptoms..."
              />
            </div>
            
            <div className="mt-8 flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} className="px-8 shadow-md">Proceed to Token Selection</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-bold">Select Date & Token</h2>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">1. Choose Date</label>
              <input 
                type="date" 
                value={appointmentDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  setAppointmentDate(e.target.value);
                  setSelectedToken(null); 
                }}
                className="w-full max-w-xs flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary shadow-sm"
              />
            </div>

            {appointmentDate && (
              <div className="mt-8 animate-in fade-in duration-500">
                <div className="flex justify-between items-end mb-4 border-b border-gray-100 pb-2">
                  <label className="block text-sm font-bold text-gray-700">2. Select Token ({selectedDoctor?.address})</label>
                  <div className="flex items-center text-xs text-gray-500 space-x-3">
                    <span className="flex items-center"><span className="w-3 h-3 bg-white border border-gray-300 rounded-sm mr-1"></span> Available</span>
                    <span className="flex items-center"><span className="w-3 h-3 bg-primary rounded-sm mr-1"></span> Selected</span>
                    <span className="flex items-center"><span className="w-3 h-3 bg-gray-200 rounded-sm mr-1"></span> Booked</span>
                  </div>
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 gap-2 max-h-[400px] overflow-y-auto p-1">
                  {Array.from({ length: 100 }, (_, i) => i + 1).map(token => {
                    const isTaken = isTokenTaken(token);
                    const isBlocked = isTokenBlockedForPatient(token);
                    const isSelected = selectedToken === token;
                    return (
                      <button
                        key={token}
                        disabled={isTaken || isBlocked}
                        onClick={() => setSelectedToken(token)}
                        title={`Token ${token} • ${getTokenInfo(token).time}${isBlocked ? ' (Reserved for Walk-ins)' : ''}`}
                        className={`
                          h-10 text-xs font-bold rounded-md transition-all
                          ${isTaken ? 'bg-gray-100 text-gray-400 cursor-not-allowed border outline-none' : 
                            isBlocked ? 'bg-red-50 text-red-300 border-red-100 cursor-not-allowed border outline-none' :
                            isSelected ? 'bg-primary text-white shadow-md transform scale-105 ring-2 ring-primary/50' : 
                            'bg-white text-gray-700 border border-gray-200 hover:border-primary hover:bg-primary/5'}
                        `}
                      >
                        {token}
                      </button>
                    )
                  })}
                </div>

                {selectedToken && (
                  <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center shadow-sm">
                    <CheckCircle className="w-6 h-6 text-emerald-500 mr-3" />
                    <div>
                      <p className="text-emerald-900 font-medium">Selected Token {selectedToken}</p>
                      <p className="text-sm text-emerald-700 font-bold">{getTokenInfo(selectedToken).time} ({getTokenInfo(selectedToken).session})</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-8 flex justify-between border-t border-gray-100 pt-6">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button 
                onClick={() => setStep(4)} 
                disabled={!appointmentDate || !selectedToken} 
                className="px-8 shadow-md bg-blue-600 hover:bg-blue-700 text-white"
              >
                Proceed to Payment
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 relative">
            {showQR && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-20 flex flex-col justify-center items-center rounded-xl border border-gray-200 shadow-2xl overflow-hidden p-10 animate-in fade-in zoom-in-95 duration-300">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400"></div>
                <img src="https://upload.wikimedia.org/wikipedia/commons/1/14/Razorpay_logo.svg" alt="Razorpay" className="h-7 mb-10 opacity-90" />
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">One-Step Secure Checkout</h3>
                  <p className="text-gray-500 text-sm mt-2 font-medium">Test Mode: Simulated Gateway Integration</p>
                </div>

                <div className="relative group mb-8">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative p-5 bg-white border-2 border-gray-100 rounded-2xl shadow-sm">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=upi://pay?pa=medflow@razorpay&pn=MedFlow%20Healthcare&am=200&cu=INR&tn=Booking`} alt="QR Code" width="220" height="220" className="rounded-lg" />
                    <div className="absolute bottom-1 right-1 bg-white p-1 rounded-tl-lg">
                       <img src="https://image.similarpng.com/very-thumbnail/2021/01/UPI-logo-on-transparent-background-PNG.png" className="h-4" />
                    </div>
                  </div>
                </div>

                <div className="w-full max-w-xs space-y-3">
                  <Button onClick={handleBook} className="w-full bg-[#3395FF] hover:bg-[#2C84E5] text-white font-bold h-12 rounded-lg shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] border-b-4 border-blue-700">
                    Pay ₹200.00 Now
                  </Button>
                  <Button variant="ghost" onClick={() => setShowQR(false)} className="w-full text-gray-400 hover:text-gray-600 font-medium">
                    Cancel & Go Back
                  </Button>
                </div>

                <div className="mt-10 flex items-center space-x-4 opacity-40 grayscale pointer-events-none">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-3" />
                  <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-5" />
                  <img src="https://www.vectorlogo.zone/logos/rupay/rupay-ar21.svg" className="h-5" />
                </div>
                </div>
            )}

            <h2 className="text-2xl font-bold mb-6">Confirm & Pay</h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center border-b pb-2"><User className="w-5 h-5 mr-2"/> Patient Details</h3>
                <p className="mb-2"><span className="text-gray-500 font-medium">Name:</span> <span className="font-semibold ml-2">{user?.name}</span></p>
                <p className="mb-2"><span className="text-gray-500 font-medium">Email:</span> <span className="font-semibold ml-2">{user?.email}</span></p>
                {reason && <p className="mb-2"><span className="text-gray-500 font-medium">Reason:</span> <span className="font-semibold ml-2">{reason}</span></p>}
              </div>

              <div className="bg-primary/5 p-6 rounded-xl border border-primary/20 relative overflow-hidden">
                <div className="absolute -right-6 -top-6 text-primary/10">
                  <Calendar className="w-32 h-32" />
                </div>
                <h3 className="font-bold text-primary mb-4 flex items-center border-b border-primary/10 pb-2 relative z-10"><Calendar className="w-5 h-5 mr-2"/> Booking Summary</h3>
                <p className="mb-2 relative z-10"><span className="text-gray-500 font-medium">Doctor:</span> <span className="font-bold text-gray-900 ml-2">{selectedDoctor?.name}</span></p>
                <p className="mb-2 relative z-10"><span className="text-gray-500 font-medium">Hospital:</span> <span className="font-semibold text-gray-800 ml-2">{selectedDoctor?.address}</span></p>
                <p className="mb-2 relative z-10"><span className="text-gray-500 font-medium">Date:</span> <span className="font-bold text-gray-900 ml-2">{appointmentDate}</span></p>
                <div className="mt-4 pt-3 border-t border-primary/10 relative z-10">
                  <div className="inline-block bg-primary text-white font-bold px-4 py-2 rounded-lg shadow-sm">
                    Token #{selectedToken}
                  </div>
                  <p className="text-sm font-medium text-primary mt-2 flex items-center"><Clock className="w-4 h-4 mr-1"/> {selectedToken && getTokenInfo(selectedToken).time}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 text-white p-6 rounded-xl flex justify-between items-center shadow-lg">
              <div>
                <p className="text-gray-400 font-medium">Total Amount</p>
                <p className="text-3xl font-bold">₹200.00</p>
              </div>
              <Button onClick={() => setShowQR(true)} className="bg-white text-gray-900 hover:bg-gray-100 font-bold px-8 py-6 rounded-lg text-lg">
                Pay Securely
              </Button>
            </div>
            
            <div className="mt-8">
              <Button variant="ghost" onClick={() => setStep(3)} className="text-gray-500 hover:text-gray-900">← Back to Tokens</Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6 animate-in zoom-in-95 duration-500">
            <div id="receipt-section" className="bg-white p-8 rounded-xl border-2 border-emerald-500/20 shadow-2xl relative overflow-hidden">
               <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl"></div>
               <div className="text-center mb-8 relative z-10">
                 <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                   <CheckCircle className="w-8 h-8 text-emerald-600" />
                 </div>
                 <h2 className="text-3xl font-bold text-gray-900 mb-2">Appointment Confirmed!</h2>
                 <p className="text-gray-600">Your payment was successful and token is secured.</p>
               </div>

               <div className="bg-gray-50 rounded-xl p-6 mb-8 relative z-10 border border-gray-100">
                 <div className="flex justify-between items-start mb-6 pb-6 border-b border-gray-200">
                   <div>
                     <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Receipt Number</h3>
                     <p className="text-gray-900 font-mono font-medium">#{Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                   </div>
                   <div className="text-right">
                     <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Date</h3>
                     <p className="text-gray-900 font-medium">{new Date().toLocaleDateString()}</p>
                   </div>
                 </div>

                 <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-bold text-gray-900 mb-4 flex items-center text-lg"><User className="w-5 h-5 mr-2 text-primary"/> Patient</h4>
                      <p className="text-gray-600 mb-1">{user?.name}</p>
                      <p className="text-gray-600 mb-1">{user?.email}</p>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-4 flex items-center text-lg"><MapPin className="w-5 h-5 mr-2 text-primary"/> Hospital & Doctor</h4>
                      <p className="text-gray-900 font-bold mb-1">{selectedDoctor?.name}</p>
                      <p className="text-gray-600 mb-1">{selectedDoctor?.address}</p>
                    </div>
                 </div>
               </div>

               <div className="bg-primary text-white rounded-xl p-6 relative z-10 shadow-lg shadow-primary/20 flex flex-col md:flex-row justify-between items-center text-center md:text-left">
                  <div className="mb-4 md:mb-0">
                    <h3 className="text-primary-foreground/80 font-medium mb-1">Scheduled Date</h3>
                    <p className="text-2xl font-bold">{appointmentDate}</p>
                  </div>
                  <div className="h-12 w-px bg-white/20 hidden md:block"></div>
                  <div>
                    <h3 className="text-primary-foreground/80 font-medium mb-1">Assigned Token</h3>
                    <p className="text-3xl font-extrabold flex items-center justify-center md:justify-start">#{selectedToken}</p>
                    <p className="text-sm text-primary-foreground/90 mt-1">{selectedToken && getTokenInfo(selectedToken).time}</p>
                  </div>
               </div>
            </div>

            <div className="mt-8 flex justify-center space-x-4 no-print">
              <Button onClick={() => setStep(1)} variant="outline" className="px-8">Book Another</Button>
              <Button onClick={() => window.location.href = '/patient-dashboard'} variant="secondary" className="px-8 shadow-sm">View History</Button>
              <Button onClick={handlePrint} className="px-8 font-bold flex items-center space-x-2"><Download className="w-4 h-4" /> <span>Download PDF</span></Button>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
