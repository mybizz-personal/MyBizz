import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Store, User, Lock, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

import { logToFile } from '../lib/logger';

export default function Login() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setUser, setRole } = useAuthStore();

  React.useEffect(() => {
    const savedError = localStorage.getItem('auth_error');
    if (savedError) {
      setError(savedError);
      localStorage.removeItem('auth_error');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let finalEmail = loginId;

      // If loginId does not contain '@', treat it as a phone number
      if (!loginId.includes('@')) {
        const { data: phoneUser, error: phoneError } = await supabase
          .from('platform_users')
          .select('email')
          .eq('phone', loginId)
          .single();
          
        if (phoneError || !phoneUser) {
          throw new Error('No account found with this mobile number.');
        }
        finalEmail = phoneUser.email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: finalEmail,
        password,
      });

      if (error) throw error;
      
      const userId = data.user.id;
      
      // Check user status
      const { data: userData, error: userError } = await supabase
        .from('platform_users')
        .select('id, status')
        .or(`auth_user_id.eq.${userId},id.eq.${userId}`)
        .maybeSingle();
        
      if (!userData) {
        await supabase.auth.signOut();
        throw new Error('Account authenticated, but no profile was found in platform_users. Please run the SQL setup script to link your user.');
      }

      if (userData.status !== 'Active') {
        await supabase.auth.signOut();
        throw new Error('Your account has been suspended or is inactive.');
      }

      const internalUserId = userData.id;
      
      // Check business status (if applicable)
      const { data: bUser } = await supabase
        .from('business_users')
        .select('business_id')
        .or(`user_id.eq.${internalUserId},user_id.eq.${userId}`)
        .maybeSingle();
        
      if (bUser) {
        const { data: bData } = await supabase
          .from('businesses')
          .select('status')
          .eq('id', bUser.business_id)
          .maybeSingle();
          
        if (bData && bData.status !== 'Active') {
          await supabase.auth.signOut();
          throw new Error('Your business account has been suspended.');
        }
      }

      await logToFile('INFO', `User logged in successfully: ${finalEmail}`);
      
    } catch (err: any) {
      await logToFile('ERROR', `Failed login attempt for ${loginId}: ${err.message}`);
      setError(err.message || 'Failed to login');
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
          Sign in to MyBizz
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Demo: <span className="font-semibold text-primary">admin@mybizz.com</span> or <span className="font-semibold text-primary">owner1@royalshine.com</span>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="loginId" className="block text-sm font-medium text-gray-700">
                Email Address or Mobile Number
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="loginId"
                  name="loginId"
                  type="text"
                  required
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="appearance-none block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="admin@mybizz.com or 9876543210"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  "w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
                  isLoading && "opacity-70 cursor-not-allowed"
                )}
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign in'}
              </button>
            </div>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <button 
                onClick={() => navigate('/signup')} 
                className="font-medium text-primary hover:text-primary/90"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
