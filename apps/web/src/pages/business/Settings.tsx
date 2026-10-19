import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../lib/supabase';
import { Loader2, KeyRound, Upload, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user, businessId } = useAuthStore();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (businessId) {
      supabase.from('businesses').select('logo_url').eq('id', businessId).single().then(({data}) => {
        if (data?.logo_url) setLogoUrl(data.logo_url);
      });
    }
  }, [businessId]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated successfully!");
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update password");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !businessId) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo file size must be less than 2MB');
      return;
    }

    // Validate dimensions (max 512x512)
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      if (img.width > 512 || img.height > 512) {
        toast.error('Logo dimensions must not exceed 512x512 pixels');
        return;
      }

      setIsUploadingLogo(true);
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        const filePath = `${businessId}/${fileName}`;

        // Upload to existing product-images bucket or similar
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        // Update database
        const { error: updateError } = await supabase
          .from('businesses')
          .update({ logo_url: publicUrl })
          .eq('id', businessId);

        if (updateError) throw updateError;

        setLogoUrl(publicUrl);
        toast.success('Business logo updated! Please refresh to see changes everywhere.');
      } catch (err: any) {
        console.error('Logo upload error:', err);
        toast.error(err.message || 'Failed to upload logo');
      } finally {
        setIsUploadingLogo(false);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      toast.error('Invalid image file');
    };
    img.src = objectUrl;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm">Manage your business preferences and account security.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-gray-500" />
          Business Logo
        </h3>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="shrink-0 relative">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md bg-gray-50" />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-gray-100 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-300" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <input 
                type="file" 
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleLogoUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingLogo}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md shadow-sm hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
              >
                {isUploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Upload New Logo
              </button>
              <p className="mt-2 text-xs text-gray-500">
                Max file size: 2MB. Max dimensions: 512x512 pixels. Recommended: Square image.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <div className="mt-1">
              <input type="text" disabled value={user?.email || ''} className="bg-gray-50 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-500 sm:text-sm" />
            </div>
            <p className="mt-1 text-xs text-gray-500">Email address cannot be changed directly.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-gray-500" />
          Change Password
        </h3>
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary sm:text-sm" 
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input 
              type="password" 
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-primary focus:border-primary sm:text-sm" 
              placeholder="Confirm new password"
            />
          </div>
          <div className="pt-2">
            <button 
              type="submit" 
              disabled={isUpdating}
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
