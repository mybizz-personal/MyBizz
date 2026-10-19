import { useState, useEffect, useCallback } from 'react';
import { Search, ScanLine, ShoppingCart, Plus, Minus, CreditCard, Banknote, X, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

interface Product {
  id: string;
  sku: string;
  name: string;
  selling_price: number;
  stock: number;
  image_url?: string;
}

export default function SalesPOS() {
  const { businessId, user, platformUserId } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 12; // slightly more for grid view
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchProducts = useCallback(async () => {
    if (!businessId) return;
    setIsLoading(true);
    try {
      let query = supabase
        .from('products')
        .select(`id, sku, name, selling_price, image_url, inventory(quantity)`, { count: 'exact' })
        .eq('business_id', businessId)
        .eq('status', 'Active');
        
      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,sku.ilike.%${debouncedSearch}%`);
      }

      const { data, error, count } = await query
        .order('name')
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      
      if (error) throw error;
      
      const formatted = (data || []).map((item: any) => ({
        ...item,
        stock: item.inventory?.reduce((sum: number, inv: any) => sum + inv.quantity, 0) || 0
      }));
      setProducts(formatted);
      setTotalPages(Math.ceil((count || 0) / PAGE_SIZE) || 1);
    } catch (error) {
      console.error('Failed to load products for POS:', error);
    } finally {
      setIsLoading(false);
    }
  }, [businessId, debouncedSearch, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCheckout = async (method: 'Cash' | 'Card' | 'UPI') => {
    if (cart.length === 0 || !businessId || !user) return;
    setIsProcessing(true);
    
    try {
      const totalAmount = cart.reduce((sum, item) => sum + (item.product.selling_price * item.quantity), 0);
      const itemsPayload = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.selling_price,
        total_price: item.product.selling_price * item.quantity,
      }));

      // 1. Try atomic PostgreSQL RPC transaction
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_sale', {
        p_business_id: businessId,
        p_user_id: platformUserId || user.id,
        p_payment_method: method,
        p_items: itemsPayload,
        p_total_amount: totalAmount,
        p_net_amount: totalAmount,
        p_discount_amount: 0,
        p_tax_amount: 0
      });

      if (!rpcError && rpcData?.success) {
        toast.success(`Sale completed! Receipt: ${rpcData.receipt_number}`);
        setCart([]);
        fetchProducts();
        return;
      }

      // 2. Safe Fallback if RPC is not yet registered in current DB
      const receiptNumber = `RCPT-${Date.now()}`;
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          business_id: businessId,
          receipt_number: receiptNumber,
          user_id: platformUserId || user.id,
          total_amount: totalAmount,
          net_amount: totalAmount,
          payment_method: method,
        })
        .select('id')
        .single();
        
      if (saleError) throw saleError;
      
      const saleItems = cart.map(item => ({
        sale_id: saleData.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.selling_price,
        total_price: item.product.selling_price * item.quantity,
      }));
      
      const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
      if (itemsError) throw itemsError;
      
      // Location-safe inventory decrement
      for (const item of cart) {
        const { data: invData } = await supabase
          .from('inventory')
          .select('id, quantity')
          .eq('product_id', item.product.id)
          .eq('business_id', businessId)
          .order('quantity', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (invData) {
          const newQty = Math.max(0, invData.quantity - item.quantity);
          await supabase
            .from('inventory')
            .update({ quantity: newQty, updated_at: new Date().toISOString() })
            .eq('id', invData.id);
        }
      }
      
      toast.success(`Sale completed! Receipt: ${receiptNumber}`);
      setCart([]);
      fetchProducts();
      
    } catch (err: any) {
      toast.error('Checkout failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) return; // Cannot exceed stock
      setCart(cart.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const newQ = item.quantity + delta;
        if (newQ < 1) return item;
        if (newQ > item.product.stock) return item;
        return { ...item, quantity: newQ };
      }
      return item;
    }));
  };

  const total = cart.reduce((sum, item) => sum + (item.product.selling_price * item.quantity), 0);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6">
      {/* Product Selection Area */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-6 h-6" />
            <input 
              type="text" 
              placeholder="Search or scan barcode/SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 text-lg border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <button className="p-4 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center">
            <ScanLine className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-y-auto p-4 grid grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
          {isLoading ? (
            <div className="col-span-full flex justify-center py-12 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : products.map(product => (
            <div 
              key={product.id} 
              onClick={() => addToCart(product)}
              className="border border-gray-100 rounded-lg cursor-pointer hover:border-primary hover:shadow-md transition-all active:scale-95 bg-gray-50 flex flex-col justify-between h-40 overflow-hidden"
            >
              <div className="h-20 bg-gray-200 flex items-center justify-center shrink-0">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-400 text-xs">No image</span>
                )}
              </div>
              <div className="p-3 flex flex-col flex-1 justify-between bg-white">
                <div>
                  <h3 className="font-semibold text-gray-900 line-clamp-1 text-sm">{product.name}</h3>
                  <p className="text-xs text-gray-500">{product.sku}</p>
                </div>
                <div className="flex justify-between items-end mt-1">
                  <span className="font-bold text-sm text-primary">₹{product.selling_price}</span>
                  <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md">{product.stock} left</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-2 px-2">
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">Prev</button>
              <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Cart Area */}
      <div className="w-full md:w-96 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-lg text-gray-900">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Current Sale
          </div>
          <button 
            onClick={() => setCart([])}
            className="text-sm text-gray-500 hover:text-red-500"
          >
            Clear
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <ShoppingCart className="w-12 h-12 mb-2 opacity-20" />
              <p>Cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="flex gap-3 items-center">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 text-sm">{item.product.name}</h4>
                  <div className="text-primary font-semibold text-sm">₹{item.product.selling_price}</div>
                </div>
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 hover:bg-white rounded text-gray-600 shadow-sm"><Minus className="w-4 h-4" /></button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 hover:bg-white rounded text-gray-600 shadow-sm"><Plus className="w-4 h-4" /></button>
                </div>
                <button onClick={() => removeFromCart(item.product.id)} className="p-2 text-gray-400 hover:text-red-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl space-y-4">
          <div className="flex justify-between items-center text-lg">
            <span className="text-gray-600">Total</span>
            <span className="font-bold text-2xl text-gray-900">₹{total}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleCheckout('Cash')}
              disabled={cart.length === 0 || isProcessing}
              className="flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Banknote className="w-5 h-5" />}
              Cash
            </button>
            <button 
              onClick={() => handleCheckout('UPI')}
              disabled={cart.length === 0 || isProcessing}
              className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
              UPI / Card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
