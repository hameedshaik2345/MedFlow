import React from 'react';
import { Link } from '@tanstack/react-router';
import { HeartPulse, User, Building2, Brain, Activity, MapPin, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E6F4FE] to-[#C9EAFB] flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* Decorative background shapes */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 rounded-b-[100%] blur-3xl pointer-events-none" />
      
      <div className="z-10 flex flex-col items-center max-w-4xl w-full px-6 text-center">
        {/* Logo Container */}
        <div className="bg-white px-12 py-8 rounded-xl shadow-sm border border-white/50 mb-8 flex items-center justify-center">
           <div className="flex items-center gap-3">
             <HeartPulse className="h-12 w-12 text-[#0066CC]" strokeWidth={2.5} />
             <span className="font-bold text-5xl text-[#0066CC]">MedFlow</span>
           </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-medium text-gray-700 mb-12">
          The Operating System for <span className="font-bold text-[#0088A8]">Modern Healthcare</span>
        </h1>

        {/* Primary Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-20 w-full justify-center">
          <Link
            to={user ? (user.role === 'patient' ? '/patient-dashboard' : '/login') : '/login'}
            className="flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 bg-[#0066CC] hover:bg-[#0052A3] text-white rounded-full font-bold shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            <User className="h-5 w-5 fill-current" />
            PATIENT PORTAL
          </Link>
          
          <Link
            to="/staff/login"
            className="flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 bg-white hover:bg-gray-50 text-[#0066CC] rounded-full font-bold border-2 border-[#0066CC] shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            <Building2 className="h-5 w-5" />
            STAFF DASHBOARD
          </Link>
        </div>

        {/* Features Row */}
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 mt-auto opacity-80">
          <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 text-sm font-semibold text-gray-700 border border-white">
            <Brain className="h-4 w-4 text-[#0088A8]" /> AI Symptom Engine
          </div>
          <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 text-sm font-semibold text-gray-700 border border-white">
             <Activity className="h-4 w-4 text-[#0088A8]" /> Live Token Polling
          </div>
          <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 text-sm font-semibold text-gray-700 border border-white">
             <MapPin className="h-4 w-4 text-[#0088A8]" /> Location Based
          </div>
          <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 text-sm font-semibold text-gray-700 border border-white">
             <ShieldCheck className="h-4 w-4 text-[#0088A8]" /> Enterprise Secure
          </div>
        </div>
      </div>
      
    </div>
  );
}
