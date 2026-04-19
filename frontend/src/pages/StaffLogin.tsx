import React, { useState } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function StaffLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok) {
        if (data.user.role !== 'admin' && data.user.role !== 'doctor' && data.user.role !== 'pharmacist') {
          setError('No staff account was found with this email address.');
          setIsLoading(false);
          return;
        }
        login(data.token, data.user);
        toast.success("Successfully logged in");
        if (data.user.role === 'admin') navigate({ to: '/admin/appointments' });
        else if (data.user.role === 'doctor') navigate({ to: '/doctor-dashboard' });
        else if (data.user.role === 'pharmacist') navigate({ to: '/pharmacist-dashboard' });
      } else {
        setError('No staff account was found with this email address.');
      }
    } catch (err) {
      setError('An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-blue-50/30">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100 p-8 pt-10">
        
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-50 text-blue-600 p-3 rounded-full mb-4">
             <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Login</h1>
          <p className="text-gray-500 mt-2 text-sm">Access your staff dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 flex flex-col">
          
          <div className="space-y-1">
            <div className={`flex items-center border rounded-md overflow-hidden transition-colors ${error ? 'border-red-400 focus-within:border-red-500 ring-1 ring-red-100' : 'border-gray-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-100'}`}>
              <div className="w-full relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 pt-5 pb-1 outline-none text-sm peer"
                  placeholder=" "
                  required
                />
                <label className="absolute left-3 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3 peer-focus:text-xs peer-focus:top-1 peer-focus:text-blue-600">
                  Email Address
                </label>
                {error && <AlertCircle className="absolute right-3 top-3 h-5 w-5 text-red-500" />}
              </div>
            </div>
            {error && <p className="text-xs text-red-600 font-medium px-1 flex items-center mt-1">{error}</p>}
          </div>

          <div className="border border-gray-300 rounded-md overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-100 transition-colors">
            <div className="w-full relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pt-5 pb-1 outline-none text-sm peer"
                placeholder=" "
                required
              />
              <label className="absolute left-3 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3 peer-focus:text-xs peer-focus:top-1 peer-focus:text-blue-600">
                Password
              </label>
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-[#1877F2] to-[#00A884] hover:opacity-90 text-white h-12 mt-2 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-md shadow-blue-500/10"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>
          
        </form>

        <div className="mt-8 text-center border-t border-gray-100 pt-6">
          <p className="text-sm text-gray-600">
            Don't have an account? <Link to="/register" className="text-[#1877F2] hover:underline font-medium">Register</Link>
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
