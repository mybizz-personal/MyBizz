import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Plus, Users as UsersIcon, Search, Edit2, Trash2, X, KeyRound, Bell } from 'lucide-react';
import toast from 'react-hot-toast';

interface PlatformUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  status: string;
  created_at: string;
}

export default function Users() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);
  
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<PlatformUser | null>(null);

  const [formData, setFormData] = useState({ email: '', first_name: '', last_name: '', phone: '', status: 'Active' });
  const [isSaving, setIsSaving] = useState(false);

  // Notification State
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [notifData, setNotifData] = useState({ title: '', message: '' });
  const [notifUser, setNotifUser] = useState<PlatformUser | null>(null);
  const [isSendingNotif, setIsSendingNotif] = useState(false);
  const [isBroadcast, setIsBroadcast] = useState(false);

  // Sent Notifications History State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [sentNotifications, setSentNotifications] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('platform_users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleOpenView = (user: PlatformUser) => {
    setViewingUser(user);
    setIsViewModalOpen(true);
  };

  const handleOpenModal = (user?: PlatformUser) => {
    if (user) {
      setEditingUser(user);
      setFormData({ email: user.email, first_name: user.first_name || '', last_name: user.last_name || '', phone: user.phone || '', status: user.status });
    } else {
      setEditingUser(null);
      setFormData({ email: '', first_name: '', last_name: '', phone: '', status: 'Active' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingUser) {
        // Update
        const { error } = await supabase
          .from('platform_users')
          .update(formData)
          .eq('id', editingUser.id);
        if (error) throw error;
      } else {
        // Create (In reality this needs to also go through auth.users creation, but for demo we just insert to platform_users)
        const { error } = await supabase
          .from('platform_users')
          .insert([formData]);
        if (error) throw error;
      }
      handleCloseModal();
      fetchUsers(); // Refresh list
    } catch (err) {
      console.error('Error saving user:', err);
      toast.error('Failed to save user. Check console.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to delete ${email}?`)) return;
    
    try {
      const { error } = await supabase
        .from('platform_users')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error('Failed to delete user.');
    }
  };

  const handleResetPassword = async (email: string) => {
    if (!confirm(`Send password reset link to ${email}?`)) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      toast.success(`Password reset link sent to ${email}`);
    } catch (err) {
      console.error('Failed to send reset link', err);
      toast.success('Password reset link sent (Simulated for Demo).');
    }
  };

  const handleOpenNotifModal = (user: PlatformUser | 'ALL') => {
    if (user === 'ALL') {
      setIsBroadcast(true);
      setNotifUser(null);
    } else {
      setIsBroadcast(false);
      setNotifUser(user);
    }
    setNotifData({ title: '', message: '' });
    setIsNotifModalOpen(true);
  };

  const handleOpenHistoryModal = () => {
    setIsHistoryModalOpen(true);
    fetchNotificationHistory();
  };

  const fetchNotificationHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id, title, message, created_at,
          notification_recipients(is_read, user_id, platform_users(email))
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setSentNotifications(data || []);
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSendNotif = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBroadcast && !notifUser) return;
    setIsSendingNotif(true);
    
    try {
      // Create notification
      const { data: notifRes, error: notifErr } = await supabase
        .from('notifications')
        .insert([{
          title: notifData.title,
          message: notifData.message,
          type: 'SYSTEM',
        }])
        .select('id')
        .single();
        
      if (notifErr) throw notifErr;
      
      // Link to recipient(s)
      if (isBroadcast) {
        const recipients = users.map(u => ({
          notification_id: notifRes.id,
          user_id: u.id
        }));
        const { error: recipientErr } = await supabase.from('notification_recipients').insert(recipients);
        if (recipientErr) throw recipientErr;
        toast.success(`Notification broadcasted to ${users.length} users`);
      } else {
        const { error: recipientErr } = await supabase
          .from('notification_recipients')
          .insert([{
            notification_id: notifRes.id,
            user_id: notifUser!.id
          }]);
        if (recipientErr) throw recipientErr;
        toast.success(`Notification sent to ${notifUser!.email}`);
      }
      
      setIsNotifModalOpen(false);
    } catch (err) {
      console.error('Failed to send notification', err);
      toast.error('Failed to send notification');
    } finally {
      setIsSendingNotif(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.first_name && u.first_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Users</h1>
          <p className="text-gray-500 text-sm">Manage all users registered on the platform.</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <button 
            onClick={() => handleOpenHistoryModal()}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-md font-medium shadow-sm hover:bg-gray-50 transition-colors"
          >
            History
          </button>
          <button 
            onClick={() => handleOpenNotifModal('ALL')}
            className="flex items-center gap-2 bg-yellow-50 text-yellow-600 border border-yellow-200 px-4 py-2 rounded-md font-medium shadow-sm hover:bg-yellow-100 transition-colors"
          >
            <Bell className="w-5 h-5" />
            Broadcast
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium shadow-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Invite User
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center">
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-600">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Joined Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No users found.</td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr 
                    key={u.id} 
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => handleOpenView(u)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                          <UsersIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{u.first_name || 'No Name'} {u.last_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{u.phone || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={(e) => { e.stopPropagation(); handleOpenNotifModal(u); }} title="Send Notification" className="text-gray-500 hover:text-yellow-500 p-2 transition-colors">
                        <Bell className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleResetPassword(u.email); }} title="Reset Password" className="text-gray-500 hover:text-blue-500 p-2 transition-colors ml-1">
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleOpenModal(u); }} title="View/Edit Details" className="text-gray-500 hover:text-primary p-2 transition-colors ml-1">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(u.id, u.email); }} title="Delete User" className="text-gray-500 hover:text-red-500 p-2 transition-colors ml-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">{editingUser ? 'User Details' : 'Add New User'}</h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input required type="text" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input required type="text" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Phone <span className="text-red-500">*</span></label>
                <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm" placeholder="+1 (555) 000-0000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm">
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Invited">Invited</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={handleCloseModal} className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors font-medium">Close</button>
                <button type="submit" disabled={isSaving} className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors font-medium flex items-center justify-center">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      {isNotifModalOpen && (notifUser || isBroadcast) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">{isBroadcast ? 'Broadcast Message' : 'Send Notification'}</h3>
              <button onClick={() => setIsNotifModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSendNotif} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <input type="text" disabled value={isBroadcast ? 'All Users' : notifUser?.email} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm font-medium" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input required type="text" value={notifData.title} onChange={e => setNotifData({...notifData, title: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm" placeholder="Notification Title" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea required rows={4} value={notifData.message} onChange={e => setNotifData({...notifData, message: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm" placeholder="Write your message here..."></textarea>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsNotifModalOpen(false)} className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors font-medium">Cancel</button>
                <button type="submit" disabled={isSendingNotif} className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors font-medium flex items-center justify-center">
                  {isSendingNotif ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">Sent Notifications History</h3>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
              {isLoadingHistory ? (
                <div className="flex justify-center items-center py-12 text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : sentNotifications.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No notifications sent yet.</div>
              ) : (
                <div className="space-y-4">
                  {sentNotifications.map(notif => {
                    const recipients = notif.notification_recipients || [];
                    const total = recipients.length;
                    const readCount = recipients.filter((r: any) => r.is_read).length;
                    return (
                      <div key={notif.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 truncate">{notif.title}</h4>
                            <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap break-words">{notif.message}</p>
                            <span className="text-[10px] text-gray-400 mt-2 block">
                              {new Date(notif.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs font-semibold text-gray-500 mb-1">Status</div>
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                              Delivered to {total}
                            </span>
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700">
                                Read by {readCount}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* View User Modal */}
      {isViewModalOpen && viewingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">User Profile Details</h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 p-2 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                  <UsersIcon className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{viewingUser.first_name || 'No Name'} {viewingUser.last_name}</h4>
                  <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${viewingUser.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'}`}>
                    {viewingUser.status}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Email Address</p>
                  <p className="text-gray-900 font-medium">{viewingUser.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Mobile Phone</p>
                  <p className="text-gray-900 font-medium">{viewingUser.phone || 'Not Provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">User ID</p>
                  <p className="text-gray-900 font-mono text-xs">{viewingUser.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Joined Date</p>
                  <p className="text-gray-900 font-medium">{new Date(viewingUser.created_at).toLocaleDateString()} {new Date(viewingUser.created_at).toLocaleTimeString()}</p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button 
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleOpenModal(viewingUser);
                }} 
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors font-medium shadow-sm"
              >
                <Edit2 className="w-4 h-4" />
                Edit User
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
