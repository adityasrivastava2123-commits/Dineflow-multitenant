import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, ChefHat, Bell, Truck, Share2, Download, ArrowLeft } from 'lucide-react';
import { getOrder } from '../../services/api';
import { joinTable, getSocket } from '../../services/socket';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: Clock, color: 'text-amber-500 bg-amber-50', desc: 'Waiting for restaurant to confirm' },
  { key: 'accepted', label: 'Accepted', icon: CheckCircle, color: 'text-blue-500 bg-blue-50', desc: 'Restaurant confirmed your order' },
  { key: 'preparing', label: 'Preparing', icon: ChefHat, color: 'text-purple-500 bg-purple-50', desc: 'Kitchen is preparing your food' },
  { key: 'ready', label: 'Ready', icon: Bell, color: 'text-green-500 bg-green-50', desc: 'Your order is ready for pickup' },
  { key: 'delivered', label: 'Delivered', icon: Truck, color: 'text-emerald-600 bg-emerald-50', desc: 'Enjoy your meal! 🎉' },
];

const StatusBadge = ({ status }) => {
  const colors = {
    pending: 'bg-amber-100 text-amber-700',
    accepted: 'bg-blue-100 text-blue-700',
    preparing: 'bg-purple-100 text-purple-700',
    ready: 'bg-green-100 text-green-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${colors[status] || 'bg-stone-100 text-stone-700'}`}>
      {status}
    </span>
  );
};

export default function OrderStatusPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  useEffect(() => {
    if (!order) return;
    const slug = order.restaurantId?.slug;
    if (slug) joinTable(slug, order.tableNumber);

    const socket = getSocket();
    socket.on('order-status-update', (data) => {
      if (data.orderId === orderId || data.orderId?.toString() === orderId) {
        setOrder((prev) => prev ? { ...prev, status: data.status } : prev);
        const step = STATUS_STEPS.find((s) => s.key === data.status);
        if (step) toast(step.desc, { icon: '📢' });
      }
    });
    return () => socket.off('order-status-update');
  }, [order]);

  const loadOrder = async () => {
    try {
      const { data } = await getOrder(orderId);
      setOrder(data);
    } catch {
      toast.error('Order not found');
    } finally {
      setLoading(false);
    }
  };

  const generateInvoice = () => {
    if (!order) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a5' });

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('DineFlow', 14, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(order.restaurantId?.name || 'Restaurant', 14, 28);
    doc.text(`Order: ${order.orderNumber}`, 14, 34);
    doc.text(`Table: ${order.tableNumber}`, 14, 40);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleString('en-IN')}`, 14, 46);
    doc.text(`Payment: ${order.paymentStatus === 'paid' ? '✓ PAID' : 'UNPAID'}`, 14, 52);

    autoTable(doc, {
      startY: 58,
      head: [['Item', 'Qty', 'Rate', 'Amount']],
      body: order.items.map((i) => [i.name, i.quantity, `₹${i.price}`, `₹${(i.price * i.quantity).toFixed(2)}`]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [249, 115, 22] },
    });

    const finalY = doc.lastAutoTable.finalY + 6;
    doc.setFontSize(10);
    doc.text(`Subtotal: ₹${order.subtotal?.toFixed(2)}`, 14, finalY);
    doc.text(`GST (5%): ₹${order.taxAmount?.toFixed(2)}`, 14, finalY + 6);
    if (order.discountAmount > 0) doc.text(`Discount: -₹${order.discountAmount.toFixed(2)}`, 14, finalY + 12);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: ₹${order.totalAmount?.toFixed(2)}`, 14, finalY + (order.discountAmount > 0 ? 18 : 12));

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Thank you for dining with us! Visit again 🙏', 14, finalY + 30);

    doc.save(`invoice-${order.orderNumber}.pdf`);
    toast.success('Invoice downloaded!');
  };

  const shareWhatsApp = () => {
    if (!order) return;
    const items = order.items.map((i) => `• ${i.name} x${i.quantity} = ₹${(i.price * i.quantity).toFixed(0)}`).join('\n');
    const msg = `🍽️ *${order.restaurantId?.name}* - Table ${order.tableNumber}\n\n*Order ${order.orderNumber}*\n${items}\n\n*Total: ₹${order.totalAmount?.toFixed(0)}*\n\n_Powered by DineFlow_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === order?.status);
  const isDelivered = order?.status === 'delivered';
  const isCancelled = order?.status === 'cancelled';

  if (loading) {
    return (
      <div className="max-w-lg mx-auto min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-500">Loading order...</p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-stone-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-500 p-6 pt-12">
        <button onClick={() => navigate(`/restaurant/${order.restaurantId?.slug}?table=${order.tableNumber}`)}
          className="flex items-center gap-2 text-white/70 text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Menu
        </button>
        <div className="text-center">
          {isDelivered ? (
            <div className="text-5xl mb-2 animate-bounce-gentle">🎉</div>
          ) : isCancelled ? (
            <div className="text-5xl mb-2">❌</div>
          ) : (
            <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
          )}
          <h1 className="text-white font-bold text-xl">{isDelivered ? 'Order Delivered!' : isCancelled ? 'Order Cancelled' : 'Tracking Order...'}</h1>
          <p className="text-white/70 text-sm mt-1">{order.orderNumber}</p>
          <div className="mt-3 flex justify-center">
            <StatusBadge status={order.status} />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-4">
        {/* Progress stepper */}
        {!isCancelled && (
          <div className="card p-5">
            <div className="space-y-4">
              {STATUS_STEPS.map((step, idx) => {
                const isCompleted = idx < currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isCompleted ? 'bg-green-500' : isCurrent ? step.color : 'bg-stone-100'}`}>
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                        ) : (
                          <Icon className={`w-5 h-5 ${isCurrent ? '' : 'text-stone-400'}`} />
                        )}
                      </div>
                      {idx < STATUS_STEPS.length - 1 && (
                        <div className={`w-0.5 h-6 mt-1 ${isCompleted ? 'bg-green-500' : 'bg-stone-200'}`} />
                      )}
                    </div>
                    <div className="pt-2">
                      <p className={`font-semibold text-sm ${isCurrent ? 'text-stone-900' : isCompleted ? 'text-stone-600' : 'text-stone-400'}`}>
                        {step.label}
                        {isCurrent && <span className="ml-2 inline-block w-2 h-2 bg-brand-500 rounded-full animate-pulse-dot" />}
                      </p>
                      {isCurrent && <p className="text-xs text-stone-500 mt-0.5">{step.desc}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Order items */}
        <div className="card p-4">
          <h3 className="font-bold text-stone-800 mb-3">Your Order</h3>
          <div className="space-y-2">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-stone-700">{item.name} <span className="text-stone-400">×{item.quantity}</span></span>
                <span className="font-semibold">₹{(item.price * item.quantity).toFixed(0)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100">
            <div className="flex justify-between text-sm text-stone-500 mb-1">
              <span>Subtotal</span><span>₹{order.subtotal?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-stone-500 mb-1">
              <span>GST</span><span>₹{order.taxAmount?.toFixed(2)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600 font-semibold mb-1">
                <span>Discount</span><span>-₹{order.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-stone-900 mt-2 pt-2 border-t border-stone-100">
              <span>Total</span>
              <span className="flex items-center gap-2">
                ₹{order.totalAmount?.toFixed(2)}
                {order.paymentStatus === 'paid' && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">PAID</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {(isDelivered || order.paymentStatus === 'paid') && (
          <div className="flex gap-3">
            <button
              onClick={generateInvoice}
              className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" /> Invoice
            </button>
            <button
              onClick={shareWhatsApp}
              className="flex-1 bg-green-500 text-white font-semibold py-3 rounded-2xl active:scale-95 transition-transform flex items-center justify-center gap-2 text-sm"
            >
              <Share2 className="w-4 h-4" /> WhatsApp
            </button>
          </div>
        )}

        {/* Restaurant info */}
        {order.restaurantId && (
          <div className="card p-4 text-sm text-stone-500">
            <p className="font-semibold text-stone-700 mb-1">{order.restaurantId.name}</p>
            <p>Table {order.tableNumber}</p>
            {order.restaurantId.phone && <p>{order.restaurantId.phone}</p>}
            <p className="mt-2 text-xs">Ordered at {new Date(order.createdAt).toLocaleString('en-IN')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
