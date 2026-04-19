import React, { useState } from 'react';
import { useRouter, Link } from '@tanstack/react-router';
import { HeartPulse, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const router = useRouter();
  const { login } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [roleMode, setRoleMode] = useState('patient');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsProcessing(true);
    setError('');
    
    try {
      // Map staff option to admin safely for the system rules
      const finalRole = roleMode === 'staff' ? 'admin' : roleMode;
      const payload: any = { name, email, phone, password, role: finalRole };

      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const apiUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;

      const res = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data;
      try {
         data = JSON.parse(text);
      } catch(ex) {
         throw new Error(`API Error: ${res.status} ${res.statusText}`);
      }

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Proceed to OTP
      if (data.requireOtp) {
        toast.success(data.message || 'Verification OTP sent to your email');
        router.navigate({ to: '/verify-otp', search: { email } } as any);
        return;
      }

      // Auto login fallback (Though usually it hits OTP above)
      login(data.token, data.user);
      toast.success(data.message || 'Successfully registered');
      const registeredRole = data.user.role;
      if (registeredRole === 'admin') router.navigate({ to: '/admin/appointments' });
      else if (registeredRole === 'doctor') router.navigate({ to: '/doctor-dashboard' });
      else router.navigate({ to: '/patient-dashboard' });
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during registration');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#E6F4FE] to-[#C9EAFB]">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100 p-8 pt-10 relative">
        <div className="flex flex-col items-center mb-8">
          <div className="flex flex-col items-center gap-3 mb-6">
             <HeartPulse className="h-10 w-10 text-[#0066CC]" strokeWidth={2.5} />
             <span className="font-bold text-3xl text-[#0066CC]">MedFlow</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center">Create Account</h1>
          <p className="text-gray-500 mt-2 text-sm text-center">Select your role and join the MedFlow platform</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5 flex flex-col">
          
          <div className="space-y-4">
             {/* Role Selector Grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {['patient', 'doctor', 'staff'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleMode(r)}
                  className={`py-2 text-xs font-semibold rounded-md border transition-all ${roleMode === r ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm ring-1 ring-blue-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
            <div className="border border-gray-300 rounded-md overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-100 transition-colors">
              <div className="w-full relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 pt-5 pb-1 outline-none text-sm peer"
                  placeholder=" "
                  required
                />
                <label className="absolute left-3 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3 peer-focus:text-xs peer-focus:top-1 peer-focus:text-[#0066CC]">
                  Full Name
                </label>
              </div>
            </div>

            <div className="border border-gray-300 rounded-md overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-100 transition-colors">
              <div className="w-full relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 pt-5 pb-1 outline-none text-sm peer"
                  placeholder=" "
                  required
                />
                <label className="absolute left-3 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3 peer-focus:text-xs peer-focus:top-1 peer-focus:text-[#0066CC]">
                  Email Address
                </label>
              </div>
            </div>

            <div className="border border-gray-300 rounded-md overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-100 transition-colors">
              <div className="w-full relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 pt-5 pb-1 outline-none text-sm peer"
                  placeholder=" "
                  required
                />
                <label className="absolute left-3 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3 peer-focus:text-xs peer-focus:top-1 peer-focus:text-[#0066CC]">
                  Phone Number
                </label>
              </div>
            </div>

            <div className="border border-gray-300 rounded-md overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-100 transition-colors">
              <div className="w-full relative flex items-center pr-3">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pt-5 pb-1 outline-none text-sm peer"
                  placeholder=" "
                  required
                />
                <label className="absolute left-3 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3 peer-focus:text-xs peer-focus:top-1 peer-focus:text-[#0066CC]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-600 font-medium px-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1" />{error}</p>}

          <Button 
            type="submit" 
            disabled={isProcessing}
            className="w-full bg-[#0066CC] hover:bg-[#0052A3] text-white py-6 mt-4 rounded-md font-medium text-base h-auto transition-transform active:scale-95 shadow-sm"
          >
            {isProcessing ? 'Registering...' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-8 text-center border-t border-gray-100 pt-6">
          <p className="text-sm text-gray-600">
            Already have an account? <Link to="/login" className="text-[#0066CC] hover:underline font-bold ml-1">Sign In instead</Link>
          </p>
          <div className="mt-6">
             <Link to="/" className="text-sm text-gray-500 hover:text-gray-900 border-b border-gray-300 pb-0.5 transition-colors">
                &larr; Back to Home
             </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
