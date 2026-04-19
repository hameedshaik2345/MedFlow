import React, { useState, useEffect } from 'react';
import { useRouter, Link } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

export default function VerifyOtp() {
  const router = useRouter();
  const { login } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Extract email from query parameters (simple implementation for browser url)
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !otp) {
      toast.error('Email and OTP are required.');
      return;
    }

    setIsProcessing(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const apiUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
      
      const res = await fetch(`${apiUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const text = await res.text();
      let data;
      try {
         data = JSON.parse(text);
      } catch(e) {
         throw new Error(`API Error: ${res.status} ${res.statusText}`);
      }

      if (!res.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      toast.success(data.message || 'Email verified successfully');
      login(data.token, data.user);
      
      const registeredRole = data.user.role;
      if (registeredRole === 'admin') router.navigate({ to: '/admin/appointments' });
      else if (registeredRole === 'doctor') router.navigate({ to: '/doctor-dashboard' });
      else router.navigate({ to: '/patient-dashboard' });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'An error occurred during verification');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="pt-20 min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/">
            <img
              src="/Logo.png"
              alt="MedFlow"
              className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4 hover:opacity-90 transition-opacity"
            />
          </Link>
          <h1 className="font-display text-3xl font-bold text-foreground">Verify Your Email</h1>
          <p className="text-muted-foreground mt-2">Enter the OTP sent to your email to continue</p>
        </div>

        <Card className="shadow-card border-border">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Email Verification</CardTitle>
            <CardDescription>
              We've sent a 6-digit verification code to your email address.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  required
                  disabled={!!new URLSearchParams(window.location.search).get('email')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp">6-Digit OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtp(e.target.value)}
                  maxLength={6}
                  required
                  className="text-center text-xl tracking-widest font-mono"
                />
              </div>

              <Button
                type="submit"
                className="w-full mt-6"
                disabled={isProcessing || otp.length < 6}
              >
                {isProcessing ? (
                  <div className="flex items-center">
                     <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                     Verifying...
                  </div>
                ) : (
                  'Verify & Continue'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Didn't receive the email? Check your spam folder or <br />
              <Link to="/register" className="text-primary hover:underline font-medium">
                Try registering again
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
