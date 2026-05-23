import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, Star, Flame, Leaf, ChevronRight, X, Plus, Minus, Clock } from 'lucide-react';
import { getMenu } from '../../services/api';
import { useCart } from '../../context/CartContext';
import { joinTable } from '../../services/socket';
import { getSocket } from '../../services/socket';
import toast from 'react-hot-toast';

const SkeletonCard = () => (
  <div className="card p-4 flex gap-4 animate-pulse">
    <div className="skeleton w-24 h-24 rounded-2xl flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="skeleton h-4 w-3/4" />
      <div className="skeleton h-3 w-full" />
      <div className="skeleton h-3 w-1/2" />
      <div className="skeleton h-6 w-1/3 mt-2" />
    </div>
  </div>
);

const VegIcon = ({ isVeg }) => (
  <div className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center flex-shrink-0 ${isVeg ? 'border-green-600' : 'border-red-600'}`}>
    <div className={`w-2 h-2 rounded-full ${isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
  </div>
);

const ItemCard = ({ item }) => {
  const { dispatch, getQuantity } = useCart();
  const qty = getQuantity(item._id);

  return (
    <div className={`card p-4 flex gap-4 transition-opacity ${!item.available ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <VegIcon isVeg={item.isVeg} />
          {item.isBestseller && (
            <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Bestseller
            </span>
          )}
          {item.isSpicy && <Flame className="w-4 h-4 text-orange-500" />}
        </div>
        <h3 className="font-semibold text-stone-900 leading-tight">{item.name}</h3>
        {item.description && (
          <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <Clock className="w-3 h-3 text-stone-400" />
          <span className="text-xs text-stone-400">{item.preparationTime} min</span>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-lg font-bold text-stone-900">₹{item.price}</span>
          {!item.available ? (
            <span className="text-xs font-semibold text-stone-400 bg-stone-100 px-3 py-2 rounded-xl">Not Available</span>
          ) : qty === 0 ? (
            <button
              onClick={() => dispatch({ type: 'ADD_ITEM', item })}
              className="bg-brand-500 text-white text-sm font-bold px-5 py-2 rounded-xl 
                         active:scale-95 transition-transform shadow-md shadow-brand-500/30 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> ADD
            </button>
          ) : (
            <div className="flex items-center gap-3 bg-brand-500 text-white rounded-xl px-2 py-1.5">
              <button onClick={() => dispatch({ type: 'REMOVE_ITEM', id: item._id })} className="w-6 h-6 flex items-center justify-center active:scale-90">
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-bold text-sm w-4 text-center">{qty}</span>
              <button onClick={() => dispatch({ type: 'ADD_ITEM', item })} className="w-6 h-6 flex items-center justify-center active:scale-90">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
      {item.image && (
        <div className="w-28 h-28 flex-shrink-0 relative">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover rounded-2xl"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      )}
    </div>
  );
};

export default function MenuPage() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tableNumber = parseInt(searchParams.get('table') || '1');

  const [restaurant, setRestaurant] = useState(null);
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filter, setFilter] = useState('all'); // all | veg | nonveg
  const [activeOrderId, setActiveOrderId] = useState(() => localStorage.getItem(`order_${slug}_${tableNumber}`));

  const { itemCount, subtotal, dispatch } = useCart();
  const categoryRefs = useRef({});
  const headerRef = useRef(null);

  useEffect(() => {
    dispatch({ type: 'SET_RESTAURANT', slug, tableNumber });
    loadMenu();

    // Join socket room for real-time updates
    joinTable(slug, tableNumber);
    const socket = getSocket();
    socket.on('order-status-update', (data) => {
      toast.success(`Order ${data.orderNumber} is now ${data.status}!`);
    });
    return () => socket.off('order-status-update');
  }, [slug]);

  const loadMenu = async () => {
    try {
      const { data } = await getMenu(slug);
      setRestaurant(data.restaurant);
      setCategories(data.categories);
      const firstCat = Object.keys(data.categories)[0];
      if (firstCat) setActiveCategory(firstCat);
    } catch (err) {
      toast.error('Could not load menu. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const scrollToCategory = (cat) => {
    setActiveCategory(cat);
    const el = categoryRefs.current[cat];
    if (el) {
      const headerH = headerRef.current?.offsetHeight || 0;
      const y = el.getBoundingClientRect().top + window.scrollY - headerH - 8;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // Filter menu items
  const filteredCategories = Object.entries(categories).reduce((acc, [cat, items]) => {
    let filtered = items;
    if (filter === 'veg') filtered = items.filter((i) => i.isVeg);
    if (filter === 'nonveg') filtered = items.filter((i) => !i.isVeg);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((i) => i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q));
    }
    if (filtered.length) acc[cat] = filtered;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="max-w-lg mx-auto min-h-screen bg-stone-50">
        <div className="skeleton h-48 rounded-none" />
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <div className="text-6xl mb-4">🍽️</div>
        <h2 className="text-2xl font-bold text-stone-800 mb-2">Restaurant not found</h2>
        <p className="text-stone-500">Please scan the QR code again.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-stone-50 pb-32">
      {/* Hero Header */}
      <div ref={headerRef} className="sticky top-0 z-30 bg-stone-50">
        {/* Restaurant banner */}
        <div className="relative overflow-hidden">
          <div className="h-36 bg-gradient-to-br from-brand-600 via-brand-500 to-amber-500 relative">
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 80%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }}
            />
            <div className="absolute inset-0 flex flex-col justify-end p-4">
              <div className="flex items-end justify-between">
                <div>
                  <h1 className="font-display text-white text-2xl font-bold drop-shadow">{restaurant.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-white/80 text-sm">Table {tableNumber}</span>
                    <span className="w-1 h-1 bg-white/60 rounded-full" />
                    <span className={`text-sm font-semibold ${restaurant.isOpen ? 'text-green-300' : 'text-red-300'}`}>
                      {restaurant.isOpen ? '● Open' : '● Closed'}
                    </span>
                  </div>
                </div>
                <div className="text-3xl">🍴</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search & filter bar */}
        <div className="bg-stone-50 px-4 py-3 flex items-center gap-2">
          {showSearch ? (
            <div className="flex-1 flex items-center gap-2 bg-white border border-stone-200 rounded-2xl px-4 py-2.5">
              <Search className="w-4 h-4 text-stone-400" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dishes..."
                className="flex-1 bg-transparent text-sm outline-none"
              />
              {searchQuery && <button onClick={() => setSearchQuery('')}><X className="w-4 h-4 text-stone-400" /></button>}
              <button onClick={() => { setShowSearch(false); setSearchQuery(''); }}><X className="w-4 h-4 text-stone-600" /></button>
            </div>
          ) : (
            <>
              <button onClick={() => setShowSearch(true)} className="flex-1 flex items-center gap-2 bg-white border border-stone-200 rounded-2xl px-4 py-2.5 text-stone-400">
                <Search className="w-4 h-4" />
                <span className="text-sm">Search dishes...</span>
              </button>
              <div className="flex gap-1">
                {[['all', 'All'], ['veg', '🥦'], ['nonveg', '🍗']].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setFilter(val)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${filter === val ? 'bg-brand-500 text-white' : 'bg-white text-stone-600 border border-stone-200'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Category tabs */}
        {!searchQuery && (
          <div className="flex gap-2 px-4 pb-2 overflow-x-auto scrollbar-hide">
            {Object.keys(filteredCategories).map((cat) => (
              <button
                key={cat}
                onClick={() => scrollToCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30' : 'bg-white text-stone-600 border border-stone-200'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Menu items */}
      <div className="px-4 pt-2 space-y-6">
        {Object.entries(filteredCategories).map(([cat, items]) => (
          <div key={cat} ref={(el) => (categoryRefs.current[cat] = el)}>
            <h2 className="font-display text-xl text-stone-800 mb-3 flex items-center gap-2">
              {cat}
              <span className="text-sm font-sans font-normal text-stone-400">({items.length})</span>
            </h2>
            <div className="space-y-3">
              {items.map((item) => <ItemCard key={item._id} item={item} />)}
            </div>
          </div>
        ))}

        {Object.keys(filteredCategories).length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🔍</div>
            <p className="text-stone-500 font-medium">No dishes found</p>
            <p className="text-stone-400 text-sm mt-1">Try a different search</p>
          </div>
        )}
      </div>

      {/* Track active order banner */}
      {activeOrderId && (
        <div className="fixed bottom-6 left-4 right-4 max-w-lg mx-auto z-40">
          <button
            onClick={() => navigate(`/order/${activeOrderId}`)}
            className="w-full bg-green-500 text-white rounded-2xl p-4 flex items-center justify-between shadow-2xl shadow-green-500/40 active:scale-98 transition-transform mb-3"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-xl px-3 py-1 text-sm font-bold animate-pulse">●</div>
              <span className="font-semibold">Track Your Order</span>
            </div>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Floating cart bar */}
      {itemCount > 0 && (
        <div className="fixed bottom-6 left-4 right-4 max-w-lg mx-auto z-40 animate-slide-up">
          <button
            onClick={() => navigate(`/restaurant/${slug}/cart`)}
            className="w-full bg-brand-500 text-white rounded-2xl p-4 flex items-center justify-between shadow-2xl shadow-brand-500/40 active:scale-98 transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-xl px-3 py-1 text-sm font-bold">{itemCount}</div>
              <span className="font-semibold">View Cart</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">₹{subtotal.toFixed(0)}</span>
              <ChevronRight className="w-5 h-5" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
