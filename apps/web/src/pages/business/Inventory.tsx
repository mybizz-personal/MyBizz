import { useState, useEffect, useCallback } from 'react';
import { Loader2, Edit2, X } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

interface InventoryItem {
  id: string;
  product_id: string;
  quantity: number;
  products: {
    name: string;
    sku: string;
  };
  inventory_locations?: {
    name: string;
  };
}

export default function Inventory() {
  const { businessId } = useAuthStore();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [newQuantity, setNewQuantity] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const fetchInventory = useCallback(async () => {
    if (!businessId) return;
    setIsLoading(true);
    try {
      // Fetch products and left join inventory
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, sku,
          inventory (
            id,
            quantity,
            inventory_locations (name)
          )
        `)
        .eq('business_id', businessId)
        .eq('status', 'Active');
      
      if (error) throw error;
      
      // Flatten
      const formatted: any[] = [];
      data?.forEach(product => {
        if (product.inventory && product.inventory.length > 0) {
          product.inventory.forEach((inv: any) => {
            formatted.push({
              product_id: product.id,
              inventory_id: inv.id, // Can be used for update
              quantity: inv.quantity,
              product_name: product.name,
              product_sku: product.sku,
              location_name: inv.inventory_locations?.name || 'Main Warehouse'
            });
          });
        } else {
          // Product has no inventory row yet
          formatted.push({
            product_id: product.id,
            inventory_id: null,
            quantity: 0,
            product_name: product.name,
            product_sku: product.sku,
            location_name: 'Main Warehouse'
          });
        }
      });
      
      setInventory(formatted);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleOpenModal = (item: any) => {
    setEditingProduct(item);
    setNewQuantity(item.quantity);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsSaving(true);
    try {
      if (editingProduct.inventory_id) {
        // Update existing inventory row
        const { error } = await supabase
          .from('inventory')
          .update({ quantity: newQuantity })
          .eq('id', editingProduct.inventory_id);
        if (error) throw error;
      } else {
        // Create new inventory row
        const { error } = await supabase
          .from('inventory')
          .insert([{ 
            business_id: businessId,
            product_id: editingProduct.product_id,
            quantity: newQuantity
          }]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchInventory();
    } catch (err: any) {
      console.error('Failed to update inventory:', err);
      toast.error('Failed to update inventory: ' + (err.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-500 text-sm">Track stock levels across locations.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-600">
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">SKU</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Quantity</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></td></tr>
              ) : inventory.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">No stock found.</td></tr>
              ) : (
                inventory.map((item: any, idx: number) => (
                  <tr key={item.inventory_id || idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{item.product_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.product_sku}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.location_name}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.quantity < 20 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {item.quantity} units
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleOpenModal(item)} className="text-gray-500 hover:text-primary p-2 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Update Stock</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-900 mb-2">{editingProduct.product_name}</p>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input required type="number" min="0" value={newQuantity} onChange={e => setNewQuantity(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm" />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors font-medium">Cancel</button>
                <button type="submit" disabled={isSaving} className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors font-medium flex items-center justify-center">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
