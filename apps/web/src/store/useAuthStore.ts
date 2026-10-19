import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: 'Platform Admin' | 'Business Owner' | null;
  businessId: string | null;
  platformUserId: string | null;
  isLoading: boolean;
  setUser: (user: User | null, session: Session | null) => void;
  setRole: (role: 'Platform Admin' | 'Business Owner' | null, businessId: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  role: null,
  businessId: null,
  platformUserId: null,
  isLoading: true,
  setUser: (user, session) => set({ user, session }),
  setRole: (role, businessId) => set({ role, businessId }),
  setLoading: (isLoading) => set({ isLoading }),
  
  initialize: async () => {
    const resolveRole = async (userId: string) => {
      try {
        // 1. Check Platform User Status (supports both auth_user_id and legacy direct id)
        const { data: userData, error: userError } = await supabase
          .from('platform_users')
          .select('id, status')
          .or(`auth_user_id.eq.${userId},id.eq.${userId}`)
          .maybeSingle();
          
        if (userError || !userData || userData?.status !== 'Active') {
          console.error('Account is inactive or suspended.');
          localStorage.setItem('auth_error', 'Your account has been suspended or is inactive.');
          await supabase.auth.signOut();
          set({ role: null, businessId: null, user: null, session: null, platformUserId: null, isLoading: false });
          return;
        }

        const internalUserId = userData.id;

        // 2. Resolve Admin Role
        const { data: adminData } = await supabase
          .from('platform_admins')
          .select('id')
          .or(`user_id.eq.${internalUserId},user_id.eq.${userId}`)
          .limit(1)
          .maybeSingle();
          
        if (adminData) {
          set({ 
            role: 'Platform Admin', 
            businessId: null, 
            platformUserId: internalUserId, 
            isLoading: false 
          });
          return;
        }

        // 3. Resolve Business Owner Role
        const { data: businessUserData } = await supabase
          .from('business_users')
          .select('business_id, roles(name)')
          .or(`user_id.eq.${internalUserId},user_id.eq.${userId}`)
          .limit(1)
          .maybeSingle();

        if (businessUserData) {
          // Check Business Status
          const { data: businessData, error: businessError } = await supabase
            .from('businesses')
            .select('status')
            .eq('id', businessUserData.business_id)
            .maybeSingle();

          if (businessError || businessData?.status !== 'Active') {
            console.error('Business is inactive or suspended.');
            localStorage.setItem('auth_error', 'Your business account has been suspended.');
            await supabase.auth.signOut();
            set({ role: null, businessId: null, user: null, session: null, platformUserId: null, isLoading: false });
            return;
          }

          set({ 
            role: 'Business Owner', 
            businessId: businessUserData.business_id,
            platformUserId: internalUserId,
            isLoading: false 
          });
          return;
        }

        set({ platformUserId: internalUserId, isLoading: false });
      } catch (err) {
        console.error('Error resolving role:', err);
        set({ isLoading: false });
      }
    };

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      set({ session, user: session?.user || null });
      
      if (session?.user) {
        await resolveRole(session.user.id);
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ isLoading: false });
    }
    
    // Setup auth listener
    supabase.auth.onAuthStateChange(async (event, session) => {
      set({ session, user: session?.user || null });
      if (event === 'SIGNED_OUT') {
        set({ role: null, businessId: null, platformUserId: null });
      } else if (event === 'SIGNED_IN' && session?.user) {
        set({ isLoading: true });
        await resolveRole(session.user.id);
      }
    });
  },
  
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, role: null, businessId: null, platformUserId: null });
  },
}));
