import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../store/useAuthStore';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      session: null,
      role: null,
      businessId: null,
      platformUserId: null,
      isLoading: false,
    });
  });

  it('initializes with expected default values', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.role).toBeNull();
    expect(state.businessId).toBeNull();
    expect(state.platformUserId).toBeNull();
  });

  it('updates role and businessId with setRole', () => {
    useAuthStore.getState().setRole('Business Owner', 'biz-1234');
    const state = useAuthStore.getState();
    expect(state.role).toBe('Business Owner');
    expect(state.businessId).toBe('biz-1234');
  });

  it('updates platform user id and user session with setUser', () => {
    const mockUser: any = { id: 'auth-user-999', email: 'owner@mybizz.com' };
    const mockSession: any = { access_token: 'xyz', user: mockUser };

    useAuthStore.getState().setUser(mockUser, mockSession);
    const state = useAuthStore.getState();
    expect(state.user?.email).toBe('owner@mybizz.com');
    expect(state.session?.access_token).toBe('xyz');
  });

  it('resets all auth fields on signOut', async () => {
    useAuthStore.setState({
      role: 'Platform Admin',
      businessId: null,
      platformUserId: 'plat-1',
      user: { id: 'auth-1' } as any,
    });

    await useAuthStore.getState().signOut();
    const state = useAuthStore.getState();
    expect(state.role).toBeNull();
    expect(state.businessId).toBeNull();
    expect(state.platformUserId).toBeNull();
    expect(state.user).toBeNull();
  });
});
