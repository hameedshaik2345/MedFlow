import React, { useState, useEffect } from 'react';
import { useRouter, Link } from '@tanstack/react-router';
import { HeartPulse, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'sonner';
import ForgotPasswordDialog from '../components/ForgotPasswordDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export default function Login() {
  const { isAuthenticated, login, user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // Dialogs and Google Auth states
  const [isForgotDialogOpen, setIsForgotDialogOpen] = useState(false);
  const [isPhoneDialogOpen, setIsPhoneDialogOpen] = useState(false);
  const [phoneForGoogle, setPhoneForGoogle] = useState('');
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState<string | null>(null);
  const [isUserNotFoundDialogOpen, setIsUserNotFoundDialogOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin') router.navigate({ to: '/admin/appointments' });
      else if (user.role === 'doctor') router.navigate({ to: '/doctor-dashboard' });
      else if (user.role === 'pharmacist') router.navigate({ to: '/pharmacist-dashboard' });
      else router.navigate({ to: '/patient-dashboard' });
    }
  }, [isAuthenticated, user, router]);

  const handleGoogleSuccess = async (credentialResponse: any, phone?: string) => {
    const cred = credentialResponse?.credential || pendingGoogleCredential;
    if (!cred) {
      toast.error('Google login failed. No credential received.');
      return;
    }
    
    setIsProcessing(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const apiUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
      const res = await fetch(`${apiUrl}/auth/google/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: cred, phone }),
      });
      
      const data = await res.json();
      
      if (res.status === 202 && data.requirePhone) {
        setPendingGoogleCredential(cred);
        setIsPhoneDialogOpen(true);
        return;
      }
      
      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed');
      }
      
      setIsPhoneDialogOpen(false);
      setPendingGoogleCredential(null);
      setPhoneForGoogle('');
      
      login(data.token, data.user);
      toast.success(data.message || 'Successfully logged in');
      const role = data.user.role;
      if (role === 'admin') router.navigate({ to: '/admin/appointments' });
      else if (role === 'doctor') router.navigate({ to: '/doctor-dashboard' });
      else if (role === 'pharmacist') router.navigate({ to: '/pharmacist-dashboard' });
      else router.navigate({ to: '/patient-dashboard' });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'An error occurred during sign in');
    } finally {
      setIsProcessing(false);
    }
  };

  const submitGoogleWithPhone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneForGoogle || phoneForGoogle.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }
    handleGoogleSuccess(null, phoneForGoogle);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setIsProcessing(true);
    setError('');
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const apiUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 404 || data.message === 'User not found') {
            setIsUserNotFoundDialogOpen(true);
            return;
        }
        if (data.requireOtp) {
            toast.error(data.message || 'Account not verified. Check email for OTP.');
            router.navigate({ to: '/verify-otp', search: { email } } as any);
            return;
        }
        throw new Error(data.message || 'Login failed');
      }
      login(data.token, data.user);
      toast.success(data.message || 'Successfully logged in');
      const role = data.user.role;
      if (role === 'admin') router.navigate({ to: '/admin/appointments' });
      else if (role === 'doctor') router.navigate({ to: '/doctor-dashboard' });
      else if (role === 'pharmacist') router.navigate({ to: '/pharmacist-dashboard' });
      else router.navigate({ to: '/patient-dashboard' });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#E6F4FE] to-[#C9EAFB]">
      <ForgotPasswordDialog open={isForgotDialogOpen} onOpenChange={setIsForgotDialogOpen} />
      
      {/* Phone Required Dialog */}
      <Dialog open={isPhoneDialogOpen} onOpenChange={setIsPhoneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mobile Number Required</DialogTitle>
            <DialogDescription>
              Please enter your mobile number to complete your registration.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitGoogleWithPhone} className="space-y-4 pt-4">
            <div className="space-y-2 text-left border rounded-md p-2">
              <label htmlFor="googlePhone" className="text-xs text-gray-500">Phone Number</label>
              <input
                id="googlePhone"
                type="tel"
                className="w-full outline-none text-sm bg-transparent"
                placeholder="+1 234 567 8900"
                value={phoneForGoogle}
                onChange={(e) => setPhoneForGoogle(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPhoneDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isProcessing} className="bg-[#0066CC] hover:bg-[#0052A3] text-white">
                {isProcessing ? 'Saving...' : 'Submit'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* User Not Found Dialog */}
      <Dialog open={isUserNotFoundDialogOpen} onOpenChange={setIsUserNotFoundDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>User Not Found</DialogTitle>
            <DialogDescription>
              We couldn't find an account associated with this email address. Would you like to create a new Patient account?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsUserNotFoundDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => router.navigate({ to: '/register' } as any)} className="bg-[#0066CC] hover:bg-[#0052A3] text-white">
              Go to Sign Up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100 p-8 pt-10 relative">
        <div className="flex flex-col items-center mb-8">
          <div className="flex flex-col items-center gap-3 mb-6">
             <HeartPulse className="h-10 w-10 text-[#0066CC]" strokeWidth={2.5} />
             <span className="font-bold text-3xl text-[#0066CC]">MedFlow</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center">Patient Portal Access</h1>
          <p className="text-gray-500 mt-2 text-sm text-center">Sign in to manage your appointments</p>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-5 flex flex-col">
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
                <label className="absolute left-3 top-2 text-xs text-gray-500 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3 peer-focus:text-xs peer-focus:top-1 peer-focus:text-[#0066CC]">
                  Email Address
                </label>
              </div>
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

          {error && <p className="text-xs text-red-600 font-medium px-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1" />{error}</p>}

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => setIsForgotDialogOpen(true)}
              className="text-xs text-[#0066CC] hover:underline font-medium"
            >
              Forgot Password?
            </button>
          </div>

          <Button 
            type="submit" 
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-[#0066CC] to-[#0088A8] hover:opacity-90 text-white h-12 mt-2 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-md shadow-blue-500/10"
          >
            {isProcessing ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-gray-400 font-medium tracking-wide border-x border-white">OR CONTINUE WITH</span>
          </div>
        </div>

        <div className="flex justify-center flex-col items-center">
          {isProcessing ? (
            <div className="flex items-center text-sm font-medium text-gray-500">
              <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mr-2" />
              Connecting...
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => toast.error('Google login failed')}
                theme="outline"
                shape="rectangular"
              />
            </div>
          )}
        </div>

        <div className="mt-8 text-center border-t border-gray-100 pt-6">
          <p className="text-sm text-gray-600">
            First time booking an appointment? <br/><Link to="/register" className="text-[#0066CC] hover:underline font-bold mt-1 inline-block">Register here</Link>
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
