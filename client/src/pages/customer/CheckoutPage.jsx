import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, User, Phone, MessageSquare, ShoppingBag, Loader, Banknote, CreditCard } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { createOrder } from '../../services/api';
import toast from 'react-hot-toast';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL;

export default function CheckoutPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { items, tableNumber, subtotal, dispatch } = useCart();

  const { appliedOffer, taxAmount, discountAmount, total } = location.state || {
    taxAmount: subtotal * 0.05,
    discountAmount: 0,
    total: subtotal * 1.05,
  };

  const [name, setName] = useState(localStorage.getItem('dineflow_name') || '');
  const [phone, setPhone] = useState(localStorage.getItem('dineflow_phone') || '');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);

  const placeOrder = async (method) => {
    if (!name.trim()) { toast.error('Please enter your name'); return null; }
    if (items.length === 0) { toast.error('Cart is empty'); return null; }

    const orderPayload = {
      restaurantSlug: slug,
      tableNumber,
      items: items.map((i) => ({
        menuItemId: i._id, name: i.name, price: i.price,
        quantity: i.quantity, specialInstructions: i.specialInstructions,
        isVeg: i.isVeg, image: i.image,
      })),
      customerName: name, customerPhone: phone, notes,
      offerCode: appliedOffer?.code,
      subtotal, taxAmount, discountAmount, totalAmount: total,
      paymentMethod: method,
    };

    const { data: order } = await createOrder(orderPayload);
    localStorage.setItem('dineflow_name', name);
    if (phone) localStorage.setItem('dineflow_phone', phone);
    localStorage.setItem(`order_${slug}_${tableNumber}`, order._id);
    return order;
  };

  const handleCash = async () => {
    setLoading(true);
    try {
      const order = await placeOrder('cash');
      if (!order) return;
      dispatch({ type: 'CLEAR_CART' });
      toast.success('Order placed! Pay at the counter. 🎉');
      navigate(`/order/${order._id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const handleRazorpay = async () => {
    setLoading(true);
    try {
      const order = await placeOrder('razorpay');
      if (!order) return;

      // Create Razorpay order
      const token = localStorage.getItem('dineflow_token');
      const { data: rzp } = await axios.post(`${API}/payment/create-order`, { orderId: order._id },
        token ? { headers: { Authorization: `Bearer ${token}` } } : {});

      const options = {
        key: rzp.keyId,
        amount: rzp.amount,
        currency: rzp.currency,
        name: 'DineFlow',
        description: `Table ${tableNumber} Order`,
        order_id: rzp.razorpayOrderId,
        handler: async (response) => {
          try {
            await axios.post(`${API}/payment/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: order._id,
            });
            dispatch({ type: 'CLEAR_CART' });
            toast.success('Payment successful! 🎉');
            navigate(`/order/${order._id}`);
          } catch {
            toast.error('Payment verification failed');
            navigate(`/order/${order._id}`);
          }
        },
        prefill: { name, contact: phone },
        theme: { color: '#f97316' },
        modal: {
          ondismiss: () => {
            dispatch({ type: 'CLEAR_CART' });
            toast('Order placed. Complete payment later from your order page.');
            navigate(`/order/${order._id}`);
          }
        }
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.open();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-stone-50">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-stone-100 flex items-center gap-4 p-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-stone-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-lg">Place Order</h1>
      </div>

      <div className="p-4 space-y-4 pb-48">
        {/* Customer info */}
        <div className="card p-4 space-y-4">
          <h2 className="font-bold text-stone-800 flex items-center gap-2">
            <User className="w-4 h-4 text-brand-500" /> Your Details
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-stone-500 mb-1 block">Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-400 transition-colors" />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-500 mb-1 block">Phone (optional)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" type="tel"
                  className="w-full border border-stone-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-brand-400 transition-colors" />
              </div>
            </div>
          </div>
        </div>

        {/* Special notes */}
        <div className="card p-4 space-y-3">
          <h2 className="font-bold text-stone-800 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-brand-500" /> Order Notes
          </h2>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special requests? (e.g. no nuts, less spicy...)" rows={2}
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-400 transition-colors resize-none" />
        </div>

        {/* Order summary */}
        <div className="card p-4 space-y-3">
          <h2 className="font-bold text-stone-800">Order Summary</h2>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item._id} className="flex justify-between text-sm text-stone-600">
                <span>{item.name} × {item.quantity}</span>
                <span>₹{(item.price * item.quantity).toFixed(0)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-stone-100 pt-2 space-y-1.5">
            <div className="flex justify-between text-sm text-stone-500">
              <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-stone-500">
              <span>GST (5%)</span><span>₹{taxAmount?.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600 font-semibold">
                <span>Discount</span><span>-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-stone-900 text-base pt-1 border-t border-stone-100">
              <span>Total</span><span>₹{total?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment method */}
        <div className="card p-4 space-y-3">
          <h2 className="font-bold text-stone-800">Payment Method</h2>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setPaymentMethod('cash')}
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${paymentMethod === 'cash' ? 'border-brand-500 bg-brand-50' : 'border-stone-200 bg-white'}`}>
              <Banknote className={`w-5 h-5 ${paymentMethod === 'cash' ? 'text-brand-500' : 'text-stone-400'}`} />
              <div className="text-left">
                <p className={`text-sm font-bold ${paymentMethod === 'cash' ? 'text-brand-700' : 'text-stone-700'}`}>Cash</p>
                <p className="text-xs text-stone-400">Pay at counter</p>
              </div>
            </button>
            <button type="button" onClick={() => setPaymentMethod('razorpay')}
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${paymentMethod === 'razorpay' ? 'border-blue-500 bg-blue-50' : 'border-stone-200 bg-white'}`}>
              <CreditCard className={`w-5 h-5 ${paymentMethod === 'razorpay' ? 'text-blue-500' : 'text-stone-400'}`} />
              <div className="text-left">
                <p className={`text-sm font-bold ${paymentMethod === 'razorpay' ? 'text-blue-700' : 'text-stone-700'}`}>Online</p>
                <p className="text-xs text-stone-400">UPI / Card</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Place order button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 p-4 pb-safe max-w-lg mx-auto space-y-2">
        {paymentMethod === 'razorpay' ? (
          <button onClick={handleRazorpay} disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
            {loading ? <Loader className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
            {loading ? 'Processing...' : `Pay Online ₹${total?.toFixed(0)}`}
          </button>
        ) : (
          <button onClick={handleCash} disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <Loader className="w-5 h-5 animate-spin" /> : <ShoppingBag className="w-5 h-5" />}
            {loading ? 'Placing order...' : `Place Order • ₹${total?.toFixed(0)}`}
          </button>
        )}
        <p className="text-center text-xs text-stone-400">
          {paymentMethod === 'razorpay' ? 'Secured by Razorpay · UPI, Cards, Net Banking' : 'Pay cash at counter after your meal'}
        </p>
      </div>
    </div>
  );
}
