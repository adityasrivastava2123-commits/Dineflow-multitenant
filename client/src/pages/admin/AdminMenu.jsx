import { useState, useRef, useEffect } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Search, X, Save, Loader, Upload, ImageIcon } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { getAdminRestaurant, getMenu, createMenuItem, updateMenuItem, deleteMenuItem, toggleMenuItem } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL;
const CATEGORIES = ['Starters', 'Main Course', 'Breads', 'Rice & Biryani', 'Desserts', 'Beverages', 'Salads', 'Soups', 'Specials'];
const EMPTY_FORM = { name: '', description: '', price: '', category: 'Starters', image: '', isVeg: true, isBestseller: false, isSpicy: false, preparationTime: 15, available: true };

function ItemFormModal({ item, onClose, onSave }) {
  const [form, setForm] = useState(item || EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const token = localStorage.getItem('dineflow_token');
      const { data } = await axios.post(`${API}/upload/image`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setForm((prev) => ({ ...prev, image: data.url }));
      toast.success('Image uploaded!');
    } catch (err) {
      toast.error('Upload failed. Check Cloudinary settings.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.category) { toast.error('Name, price and category are required'); return; }
    setLoading(true);
    try {
      await onSave({ ...form, price: Number(form.price), preparationTime: Number(form.preparationTime) });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
          <h2 className="font-bold text-stone-800 text-lg">{item ? 'Edit Item' : 'Add Menu Item'}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-stone-100"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Image Upload */}
          <div>
            <label className="text-xs font-semibold text-stone-500 mb-2 block">Dish Photo</label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-stone-200 flex items-center justify-center overflow-hidden bg-stone-50 flex-shrink-0">
                {form.image ? (
                  <img src={form.image} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-stone-300" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <button type="button" onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors w-full justify-center disabled:opacity-50">
                  {uploading ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Uploading...' : 'Upload Photo'}
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })}
                  placeholder="Or paste image URL..."
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-stone-500 mb-1 block">Item Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Butter Chicken"
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-500 mb-1 block">Price (₹) *</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" min="0"
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-500 mb-1 block">Prep Time (min)</label>
              <input type="number" value={form.preparationTime} onChange={(e) => setForm({ ...form, preparationTime: e.target.value })} min="1"
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-400" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-stone-500 mb-1 block">Category *</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-400 bg-white">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-stone-500 mb-1 block">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description..." rows={2}
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-400 resize-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[{ key: 'isVeg', label: 'Vegetarian', color: 'bg-green-500' }, { key: 'isBestseller', label: 'Bestseller', color: 'bg-amber-500' },
              { key: 'isSpicy', label: 'Spicy', color: 'bg-red-500' }, { key: 'available', label: 'Available', color: 'bg-brand-500' }].map(({ key, label, color }) => (
              <label key={key} className="flex items-center gap-3 bg-stone-50 rounded-xl px-4 py-3 cursor-pointer">
                <div onClick={() => setForm({ ...form, [key]: !form[key] })}
                  className={`w-10 h-6 rounded-full transition-colors relative ${form[key] ? color : 'bg-stone-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform shadow ${form[key] ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
                <span className="text-sm font-medium text-stone-700">{label}</span>
              </label>
            ))}
          </div>
        </form>
        <div className="p-5 border-t border-stone-100">
          <button onClick={handleSubmit} disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2">
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? 'Saving...' : item ? 'Update Item' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MenuItem({ item, onEdit, onDelete, onToggle }) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    try { await onToggle(item._id); }
    finally { setToggling(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try { await onDelete(item._id); }
    finally { setDeleting(false); }
  };

  return (
    <div className={`bg-white rounded-2xl border border-stone-100 p-4 flex gap-3 transition-opacity ${!item.available ? 'opacity-60' : ''}`}>
      {item.image && (
        <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-xl flex-shrink-0" onError={(e) => e.target.style.display = 'none'} />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`w-3 h-3 border-2 rounded-sm flex items-center justify-center ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
              </div>
              <h3 className="font-semibold text-stone-800 truncate">{item.name}</h3>
              {item.isBestseller && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">★ Best</span>}
            </div>
            <p className="text-xs text-stone-400 mt-0.5 truncate">{item.description}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="font-bold text-stone-900">₹{item.price}</span>
              <span className="text-xs text-stone-400">{item.preparationTime} min</span>
              <span className={`text-xs font-semibold ${item.available ? 'text-green-600' : 'text-red-500'}`}>
                {item.available ? 'Available' : 'Unavailable'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button onClick={handleToggle} disabled={toggling} className="p-2 rounded-xl hover:bg-stone-100 text-stone-500 active:scale-90 transition-transform" title="Toggle availability">
            {item.available ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
          </button>
          <button onClick={() => onEdit(item)} className="p-2 rounded-xl hover:bg-blue-50 text-blue-500 active:scale-90 transition-transform">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={handleDelete} disabled={deleting} className="p-2 rounded-xl hover:bg-red-50 text-red-400 active:scale-90 transition-transform">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminMenu() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  useEffect(() => { loadMenu(); }, []);

  const loadMenu = async () => {
    try {
      const slug = user?.restaurant?.slug;
      if (!slug) return;
      const { data } = await getMenu(slug);
      setItems(data.menu);
    } catch {
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData) => {
    if (editItem) {
      const { data } = await updateMenuItem(editItem._id, formData);
      setItems((prev) => prev.map((i) => i._id === data._id ? data : i));
      toast.success('Item updated!');
    } else {
      const { data } = await createMenuItem(formData);
      setItems((prev) => [...prev, data]);
      toast.success('Item added!');
    }
  };

  const handleDelete = async (id) => {
    await deleteMenuItem(id);
    setItems((prev) => prev.filter((i) => i._id !== id));
    toast.success('Item deleted');
  };

  const handleToggle = async (id) => {
    const { data } = await toggleMenuItem(id);
    setItems((prev) => prev.map((i) => i._id === id ? data : i));
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setShowModal(true);
  };

  const openAdd = () => {
    setEditItem(null);
    setShowModal(true);
  };

  const allCategories = ['All', ...new Set(items.map((i) => i.category))];

  const filtered = items.filter((i) => {
    const matchCat = categoryFilter === 'All' || i.category === categoryFilter;
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // Group by category
  const grouped = filtered.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <AdminLayout title="Menu Management">
      {/* Controls */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex-1 min-w-48 flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-4 py-2.5">
          <Search className="w-4 h-4 text-stone-400 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="bg-transparent text-sm outline-none flex-1"
          />
          {search && <button onClick={() => setSearch('')}><X className="w-4 h-4 text-stone-400" /></button>}
        </div>
        <button
          onClick={openAdd}
          className="btn-primary flex items-center gap-2 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-4">
        {allCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
              categoryFilter === cat ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 text-sm text-stone-500 mb-4">
        <span>{items.length} total items</span>
        <span>·</span>
        <span className="text-green-600 font-semibold">{items.filter((i) => i.available).length} available</span>
        <span>·</span>
        <span className="text-red-500 font-semibold">{items.filter((i) => !i.available).length} unavailable</span>
      </div>

      {/* Menu items */}
      {loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-100 h-32 skeleton" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat}>
              <h2 className="font-bold text-stone-700 mb-3 flex items-center gap-2">
                {cat}
                <span className="text-xs font-normal text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">{catItems.length}</span>
              </h2>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                {catItems.map((item) => (
                  <MenuItem key={item._id} item={item} onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggle} />
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-stone-400">
              <div className="text-5xl mb-3">🍽️</div>
              <p className="font-medium">No items found</p>
              <button onClick={openAdd} className="mt-4 btn-primary text-sm">Add First Item</button>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ItemFormModal
          item={editItem}
          onClose={() => { setShowModal(false); setEditItem(null); }}
          onSave={handleSave}
        />
      )}
    </AdminLayout>
  );
}
