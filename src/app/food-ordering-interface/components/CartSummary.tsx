'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  variantName?: string;
}

interface CartSummaryProps {
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  convenienceFee: number;
  cashback: number;
  total: number;
  onRemoveItem: (itemId: string) => void;
  onUpdateQuantity?: (itemId: string, quantity: number) => void;
  onCheckout: () => void;
  minimumOrderMet: boolean;
  minimumOrder: number;
}

const MAX_QUANTITY = 10;

const CartSummary = ({
  items,
  subtotal,
  deliveryFee,
  convenienceFee,
  cashback,
  total,
  onRemoveItem,
  onUpdateQuantity,
  onCheckout,
  minimumOrderMet,
  minimumOrder,
}: CartSummaryProps) => {
  const [quantityErrors, setQuantityErrors] = useState<Record<string, string>>({});
  const [checkoutError, setCheckoutError] = useState<string>('');

  const handleQuantityDecrease = (item: CartItem) => {
    if (!onUpdateQuantity) return;
    if (item.quantity <= 1) {
      setQuantityErrors(prev => ({ ...prev, [item.id]: 'Minimum 1 unit. Use 🗑️ to remove.' }));
      setTimeout(() => setQuantityErrors(prev => { const n = { ...prev }; delete n[item.id]; return n; }), 2500);
      return;
    }
    setQuantityErrors(prev => { const n = { ...prev }; delete n[item.id]; return n; });
    onUpdateQuantity(item.id, item.quantity - 1);
  };

  const handleQuantityIncrease = (item: CartItem) => {
    if (!onUpdateQuantity) return;
    if (item.quantity >= MAX_QUANTITY) {
      setQuantityErrors(prev => ({ ...prev, [item.id]: `Max ${MAX_QUANTITY} units per item.` }));
      setTimeout(() => setQuantityErrors(prev => { const n = { ...prev }; delete n[item.id]; return n; }), 2500);
      return;
    }
    setQuantityErrors(prev => { const n = { ...prev }; delete n[item.id]; return n; });
    onUpdateQuantity(item.id, item.quantity + 1);
  };

  const handleCheckout = () => {
    if (!minimumOrderMet) {
      setCheckoutError(`Add ₹${(minimumOrder - subtotal).toFixed(2)} more to meet the ₹${minimumOrder} minimum order.`);
      setTimeout(() => setCheckoutError(''), 3000);
      return;
    }
    setCheckoutError('');
    onCheckout();
  };

  if (items.length === 0) {
    return (
      <div className="p-6 glass-neon rounded-xl text-center">
        <div className="w-16 h-16 rounded-full glass flex items-center justify-center mx-auto mb-4 animate-float">
          <Icon name="ShoppingCartIcon" size={32} className="text-muted-foreground" />
        </div>
        <p className="font-heading font-semibold text-foreground">Your cart is empty</p>
        <p className="font-caption text-xs text-text-secondary mt-2">
          Add items to get started
        </p>
      </div>
    );
  }

  return (
    <div className="glass-neon rounded-xl overflow-hidden">
      <div className="p-4 border-b border-primary/20 bg-gradient-to-r from-purple-900/30 to-indigo-900/30">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-heading font-bold text-lg text-gradient-purple">
            🛒 Your Cart
          </h3>
          <span className="font-caption text-sm text-text-secondary px-2 py-0.5 glass rounded-lg">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>

      <div className="p-4 max-h-[300px] overflow-y-auto space-y-3 scrollbar-hide">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`flex items-start justify-between gap-3 pb-3 border-b border-primary/15 last:border-0 animate-slide-up stagger-${Math.min(index + 1, 6)}`}
          >
            <div className="flex-1 min-w-0">
              <h4 className="font-heading font-semibold text-sm text-foreground mb-1">
                {item.name}
              </h4>
              {item.variantName && (
                <p className="font-caption text-xs text-text-secondary mb-1">
                  {item.variantName}
                </p>
              )}
              <div className="flex items-center gap-2">
                <span className="font-data text-sm text-primary font-bold">₹{item.price}</span>
                <span className="text-text-secondary text-xs">×</span>
                {onUpdateQuantity ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleQuantityDecrease(item)}
                      className={`flex items-center justify-center w-6 h-6 glass rounded-lg transition-all duration-200 press-scale focus-ring ${
                        item.quantity <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/20'
                      }`}
                      aria-label={`Decrease quantity of ${item.name}`}
                    >
                      <Icon name="MinusIcon" size={12} className="text-foreground" />
                    </button>
                    <span className="font-data text-sm font-bold text-foreground min-w-[1.5rem] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityIncrease(item)}
                      className={`flex items-center justify-center w-6 h-6 glass rounded-lg transition-all duration-200 press-scale focus-ring ${
                        item.quantity >= MAX_QUANTITY ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/20'
                      }`}
                      aria-label={`Increase quantity of ${item.name}`}
                    >
                      <Icon name="PlusIcon" size={12} className="text-foreground" />
                    </button>
                  </div>
                ) : (
                  <span className="font-data text-sm font-bold text-foreground">{item.quantity}</span>
                )}
              </div>
              {/* Inline quantity error */}
              {quantityErrors[item.id] && (
                <div className="flex items-center gap-1 mt-1 animate-slide-up">
                  <Icon name="ExclamationCircleIcon" size={11} className="text-destructive flex-shrink-0" />
                  <p className="font-caption text-xs text-destructive leading-tight">
                    {quantityErrors[item.id]}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              <span className="font-data text-sm font-bold text-gradient-purple">
                ₹{(item.price * item.quantity).toFixed(2)}
              </span>
              <button
                onClick={() => onRemoveItem(item.id)}
                className="text-destructive hover:text-destructive/80 transition-all duration-200 press-scale w-6 h-6 flex items-center justify-center rounded-lg hover:bg-destructive/10"
              >
                <Icon name="TrashIcon" size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-primary/20 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-caption text-sm text-text-secondary">Subtotal</span>
          <span className="font-data text-sm font-semibold text-foreground">₹{subtotal.toFixed(2)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-caption text-sm text-text-secondary">Delivery Fee</span>
          <span className="font-data text-sm font-semibold">
            {deliveryFee === 0 ? (
              <span className="text-success">🎉 FREE</span>
            ) : (
              `₹${deliveryFee.toFixed(2)}`
            )}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-caption text-sm text-text-secondary">Convenience Fee</span>
          <span className="font-data text-sm font-semibold text-foreground">₹{convenienceFee.toFixed(2)}</span>
        </div>

        {cashback > 0 && (
          <div className="flex items-center justify-between p-2 bg-success/10 border border-success/30 rounded-xl">
            <div className="flex items-center gap-2">
              <Icon name="SparklesIcon" size={14} className="text-success animate-spin-slow" />
              <span className="font-caption text-xs text-success font-bold">EdCoins Cashback</span>
            </div>
            <span className="font-data text-sm font-bold text-success">+₹{cashback.toFixed(2)}</span>
          </div>
        )}

        <div className="pt-3 border-t border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <span className="font-heading font-bold text-base text-foreground">Total</span>
            <span className="font-data text-xl font-bold text-gradient-purple">₹{total.toFixed(2)}</span>
          </div>

          {!minimumOrderMet && (
            <div className="mb-3 p-3 bg-warning/10 border border-warning/30 rounded-xl">
              <div className="flex items-start gap-2">
                <Icon name="ExclamationTriangleIcon" size={14} className="text-warning flex-shrink-0 mt-0.5" />
                <p className="font-caption text-xs text-warning">
                  Add ₹{(minimumOrder - subtotal).toFixed(2)} more to meet minimum order of ₹{minimumOrder}
                </p>
              </div>
            </div>
          )}

          {/* Checkout inline error */}
          {checkoutError && (
            <div className="mb-3 flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl animate-slide-up">
              <Icon name="ExclamationCircleIcon" size={14} className="text-destructive flex-shrink-0 mt-0.5" />
              <p className="font-caption text-xs text-destructive leading-relaxed">
                {checkoutError}
              </p>
            </div>
          )}

          <button
            onClick={handleCheckout}
            className={`
              w-full py-3 rounded-xl font-heading font-bold text-sm btn-glow
              transition-all duration-300
              bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 press-scale focus-ring
            `}
          >
            🚀 Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartSummary;