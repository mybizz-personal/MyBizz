import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Store, User, Lock, Phone, Loader2, Mail } from 'lucide-react';
import { auth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from '../lib/firebase';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
  var grecaptcha: any;
}

export default function Signup() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const navigate = useNavigate();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !password) {
      setError('All fields are required.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      if (auth) {
        // Firebase Auth is configured
        if (!window.recaptchaVerifier) {
          window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'invisible'
          });
        }
        
        // Ensure phone has country code for Firebase
        const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`; // Default to India if no country code
        
        const confirmation = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
        setConfirmationResult(confirmation);
        setStep(2);
        toast.success(`OTP sent to ${formattedPhone}`);
      } else {
        if (!import.meta.env.DEV) {
          throw new Error('Phone verification service is not configured. Please contact platform administrator.');
        }
        // Fallback for Demo in development without Firebase Keys
        console.warn('Firebase is not configured. Using Mock OTP (DEV mode only).');
        setTimeout(() => {
          setStep(2);
          toast.success(`Mock OTP sent to ${phone} (Development Mode)`);
        }, 800);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to send OTP. Try adding +country_code (e.g., +91).');
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.render().then(function(widgetId: any) {
          grecaptcha.reset(widgetId);
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (confirmationResult) {
        // Verify real Firebase OTP
        await confirmationResult.confirm(otp);
      } else {
        if (!import.meta.env.DEV) {
          throw new Error('Verification service not configured.');
        }
        // Mock OTP verification for development mode only
        if (otp.length < 4) {
          throw new Error('Please enter a valid OTP.');
        }
      }

      // 1. Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        phone,
      });

      if (authError) throw authError;

      if (authData.user) {
        const [firstName, ...lastNameParts] = name.split(' ');
        const lastName = lastNameParts.join(' ');

        // 2. Insert or update into platform_users
        const { error: upsertError } = await supabase.from('platform_users').upsert({
          auth_user_id: authData.user.id,
          email,
          phone,
          first_name: firstName,
          last_name: lastName,
          status: 'Active',
        }, { onConflict: 'email' });

        if (upsertError) {
          // If upsert fails due to unique constraints or policies, fallback to update
          await supabase.from('platform_users').update({
            auth_user_id: authData.user.id,
            phone,
            first_name: firstName,
            last_name: lastName,
          }).eq('email', email);
        }
      }

      navigate('/business'); // or to login

    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
            <Store className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create an Account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Join MyBizz and manage your business.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          
          {error && (
            <div className="mb-6 bg-destructive/15 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form className="space-y-5" onSubmit={handleSendOtp}>
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder="9876543210"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP'}
                </button>
              </div>
              <div id="recaptcha-container"></div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleVerifyAndSignup}>
              <div className="text-center mb-6">
                <p className="text-sm text-gray-600">
                  Please enter the One-Time Password sent to<br/>
                  <span className="font-semibold text-gray-900">{phone}</span>
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Verification Code</label>
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-3 px-4 text-center text-xl tracking-widest focus:ring-primary focus:border-primary"
                  placeholder="123456"
                  maxLength={6}
                />
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Sign Up'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Back to Details
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button 
                onClick={() => navigate('/login')} 
                className="font-medium text-primary hover:text-primary/90"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
