import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForgotPassword, useResetPassword, useVerifyResetOtp } from '../hooks/useQueries';
import { toast } from 'sonner';
import { Loader2, KeyRound, Mail, CheckCircle2 } from 'lucide-react';

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ForgotPasswordDialog({ open, onOpenChange }: ForgotPasswordDialogProps) {
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const forgotPasswordMutation = useForgotPassword();
  const verifyResetOtpMutation = useVerifyResetOtp();
  const resetPasswordMutation = useResetPassword();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    try {
      await forgotPasswordMutation.mutateAsync(email);
      toast.success('OTP sent to your email');
      setStep('otp');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      toast.error('Please enter the OTP');
      return;
    }

    try {
      await verifyResetOtpMutation.mutateAsync({ email, otp });
      toast.success('OTP verified! Now enter your new password.');
      setStep('password');
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      await resetPasswordMutation.mutateAsync({ email, otp, newPassword });
      toast.success('Password reset successfully! You can now login.');
      onOpenChange(false);
      // Reset state 
      setTimeout(() => {
        setStep('email');
        setEmail('');
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
      }, 300);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) {
        // Reset when fully closed
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold">
            {step === 'email' ? 'Forgot Password?' : 'Reset Your Password'}
          </DialogTitle>
          <DialogDescription>
            {step === 'email' ? "Enter your email and we'll send you an OTP." :
             "Enter the OTP sent to your email and your new password."}
          </DialogDescription>
        </DialogHeader>

        {step === 'email' && (
          <form id="forgot-password-form" onSubmit={handleSendOtp} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email Address</Label>
              <div className="relative">
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
                <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </form>
        )}

        {step === 'otp' && (
          <form id="reset-password-form" onSubmit={handleResetPassword} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reset-otp" className="text-sm font-medium">OTP Code</Label>
              <Input
                id="reset-otp"
                type="text"
                placeholder="6-Digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className="text-center text-2xl font-bold tracking-widest h-14"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </form>
        )}

        <DialogFooter className="flex-col gap-2">
          {step === 'email' && (
            <Button 
               form="forgot-password-form"
               className="w-full" 
               disabled={forgotPasswordMutation.isPending}
            >
              {forgotPasswordMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Send OTP
            </Button>
          )}

          {step === 'otp' && (
            <div className="w-full flex flex-col gap-2">
              <Button 
                form="reset-password-form"
                className="w-full" 
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Reset Password
              </Button>
              <Button variant="ghost" className="text-xs" onClick={() => setStep('email')}>
                Back to Email
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
