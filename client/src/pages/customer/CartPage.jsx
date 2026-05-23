import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Trash2, Edit3, ChevronRight, Tag, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { validateOffer } from '../../services/api';
import toast from 'react-hot-toast';

const VegIcon = ({ isVeg }) => (
  <div className={`w-3.5 h-3.5 border-2 rounded-sm flex items-center justify-center flex-shrink-0 ${isVeg ? 'border-green-600' : 'border-red-600'}`}>
    <div className={`w-1.5 h-1.5 rounded-full ${isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
  </div>
);

export default function CartPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { items, subtotal, tableNumber, dispatch } = useCart();

  const [editingId, setEditingId] = useState(null);
  const [instructions, setInstructions] = useState('');
  const [offerCode, setOfferCode] = useState('');
  const [appliedOffer, setAppliedOffer] = useState(null);
  const [offerLoading, setOfferLoading] = useState(false);
  const [showOfferInput, setShowOfferInput] = useState(false);

  const taxRate = 5;
  const taxAmount = (subtotal * taxRate) / 100;
  const discountAmount = appliedOffer?.discountAmount || 0;
  const total = subtotal + taxAmount - discountAmount;

  const applyOffer = async () => {
    if (!offerCode.trim()) return;
    setOfferLoading(true);
    try {
      const { data } = await validateOffer(slug, { code: offerCode, orderAmount: subtotal });
      setAppliedOffer(data);
      toast.success(`🎉 Saved ₹${data.discountAmount.toFixed(0)}!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid offer code');
    } finally {
      setOfferLoading(false);
    }
  };

  const saveInstructions = (id) => {
    dispatch({ type: 'UPDATE_INSTRUCTIONS', id, instructions });
    setEditingId(null);
  };

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto min-h-screen bg-stone-50">
        <div className="flex items-center gap-4 p-4 bg-white border-b border-stone-100">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-stone-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-lg">Cart</h1>
        </div>
        <div className="flex flex-col items-center justify-center h-[70vh] p-8 text-center">
          <div className="text-7xl mb-4">🛒</div>
          <h2 className="text-xl font-bold text-stone-800 mb-2">Your cart is empty</h2>
          <p className="text-stone-500 mb-6">Add some delicious items to get started</p>
          <button onClick={() => navigate(`/restaurant/${slug}`)} className="btn-primary">
            Browse Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-stone-50">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-stone-100 flex items-center gap-4 p-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-stone-100 active:scale-90 transition-transform">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-semibold text-lg">Your Cart</h1>
          <p className="text-xs text-stone-400">Table {tableNumber}</p>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-48">
        {/* Cart items */}
        <div className="card overflow-hidden">
          {items.map((item, idx) => (
            <div key={item._id}>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <VegIcon isVeg={item.isVeg} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-900 truncate">{item.name}</p>
                    {item.specialInstructions && editingId !== item._id && (
                      <p className="text-xs text-stone-400 mt-0.5 italic">"{item.specialInstructions}"</p>
                    )}
                    {editingId === item._id && (
                      <div className="mt-2 flex gap-2">
                        <input
                          autoFocus
                          value={instructions}
                          onChange={(e) => setInstructions(e.target.value)}
                          placeholder="e.g. less spicy, no onion..."
                          className="flex-1 text-sm border border-stone-200 rounded-xl px-3 py-2 outline-none focus:border-brand-400"
                        />
                        <button onClick={() => saveInstructions(item._id)} className="text-xs bg-brand-500 text-white px-3 py-2 rounded-xl font-semibold">
                          Save
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => { setEditingId(editingId === item._id ? null : item._id); setInstructions(item.specialInstructions || ''); }}
                        className="text-xs text-stone-400 flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" /> {item.specialInstructions ? 'Edit note' : 'Add note'}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="font-bold text-stone-900">₹{(item.price * item.quantity).toFixed(0)}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => dispatch({ type: 'DELETE_ITEM', id: item._id })} className="p-1.5 text-red-400 hover:text-red-600 active:scale-90 transition-transform">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-2 bg-stone-100 rounded-xl px-2 py-1">
                        <button onClick={() => dispatch({ type: 'REMOVE_ITEM', id: item._id })} className="w-5 h-5 flex items-center justify-center text-stone-600 active:scale-90">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                        <button onClick={() => dispatch({ type: 'ADD_ITEM', item })} className="w-5 h-5 flex items-center justify-center text-stone-600 active:scale-90">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {idx < items.length - 1 && <div className="border-b border-stone-100 mx-4" />}
            </div>
          ))}
        </div>

        {/* Add more items */}
        <button
          onClick={() => navigate(`/restaurant/${slug}`)}
          className="w-full py-3 border-2 border-dashed border-brand-300 text-brand-500 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add more items
        </button>

        {/* Offer code */}
        <div className="card p-4">
          <button
            onClick={() => setShowOfferInput(!showOfferInput)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2 text-brand-600 font-semibold">
              <Tag className="w-4 h-4" />
              {appliedOffer ? `Offer applied! Saved ₹${appliedOffer.discountAmount.toFixed(0)}` : 'Apply offer code'}
            </div>
            {appliedOffer ? (
              <button onClick={(e) => { e.stopPropagation(); setAppliedOffer(null); setOfferCode(''); }} className="text-stone-400">
                <X className="w-4 h-4" />
              </button>
            ) : <ChevronRight className={`w-4 h-4 text-stone-400 transition-transform ${showOfferInput ? 'rotate-90' : ''}`} />}
          </button>
          {showOfferInput && !appliedOffer && (
            <div className="flex gap-2 mt-3">
              <input
                value={offerCode}
                onChange={(e) => setOfferCode(e.target.value.toUpperCase())}
                placeholder="Enter code (e.g. WELCOME20)"
                className="flex-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-400 uppercase font-semibold"
              />
              <button
                onClick={applyOffer}
                disabled={offerLoading}
                className="bg-brand-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {offerLoading ? '...' : 'Apply'}
              </button>
            </div>
          )}
        </div>

        {/* Bill summary */}
        <div className="card p-4 space-y-3">
          <h3 className="font-bold text-stone-800">Bill Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>GST ({taxRate}%)</span>
              <span>₹{taxAmount.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600 font-semibold">
                <span>Discount</span>
                <span>-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-stone-100 pt-2 flex justify-between font-bold text-stone-900 text-base">
              <span>Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 p-4 pb-safe max-w-lg mx-auto">
        <button
          onClick={() => navigate(`/restaurant/${slug}/checkout`, { state: { appliedOffer, taxAmount, discountAmount, total } })}
          className="btn-primary w-full flex items-center justify-between"
        >
          <span>Proceed to Order</span>
          <span className="bg-white/20 rounded-xl px-3 py-1">₹{total.toFixed(0)}</span>
        </button>
      </div>
    </div>
  );
}
