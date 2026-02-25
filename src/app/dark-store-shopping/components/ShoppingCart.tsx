'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';
import { createClient } from '@/lib/supabase/client';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  alt: string;
}

interface ShoppingCartProps {
  items: CartItem[];
  walletBalance: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: (promoCode?: string, promoDiscount?: number) => void;
  isOpen: boolean;
  onClose: () => void;
  isCheckingOut?: boolean;
}

const MAX_QUANTITY = 10;

const ShoppingCart = ({ 
  items, 
  walletBalance, 
  onUpdateQuantity, 
  onRemoveItem, 
  onCheckout,
  isOpen,
  onClose,
  isCheckingOut = false,
}: ShoppingCartProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [quantityErrors, setQuantityErrors] = useState<Record<string, string>>({});
  const [checkoutError, setCheckoutError] = useState<string>('');

  // Promo code state
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number; description: string } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cashback = subtotal * 0.05;
  const deliveryFee = subtotal >= 99 ? 0 : 10;
  const promoDiscount = appliedPromo?.discount ?? 0;
  const total = subtotal + deliveryFee - promoDiscount;
  const maxWalletRedemption = total * 0.3;
  const meetsMinimum = subtotal >= 99;

  const handleApplyPromo = async () => {
    const code = promoInput.trim();
    if (!code) {
      setPromoError('Please enter a promo code.');
      return;
    }
    setIsValidatingPromo(true);
    setPromoError('');
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('validate_promo_code', {
        p_code: code,
        p_order_amount: subtotal + deliveryFee,
        p_order_type: 'store',
      });
      if (error) throw error;
      if (data?.valid) {
        setAppliedPromo({ code: code.toUpperCase(), discount: data.discount, description: data.description });
        setPromoInput('');
        setPromoError('');
      } else {
        setPromoError(data?.error ?? 'Invalid promo code.');
      }
    } catch {
      setPromoError('Failed to validate promo code. Please try again.');
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError('');
    setPromoInput('');
  };

  const handleQuantityDecrease = (item: CartItem) => {
    if (item.quantity <= 1) {
      setQuantityErrors(prev => ({ ...prev, [item.id]: 'Minimum quantity is 1. Remove item to delete.' }));
      setTimeout(() => setQuantityErrors(prev => { const n = { ...prev }; delete n[item.id]; return n; }), 2500);
      return;
    }
    setQuantityErrors(prev => { const n = { ...prev }; delete n[item.id]; return n; });
    onUpdateQuantity(item.id, item.quantity - 1);
  };

  const handleQuantityIncrease = (item: CartItem) => {
    if (item.quantity >= MAX_QUANTITY) {
      setQuantityErrors(prev => ({ ...prev, [item.id]: `Max ${MAX_QUANTITY} units per item allowed.` }));
      setTimeout(() => setQuantityErrors(prev => { const n = { ...prev }; delete n[item.id]; return n; }), 2500);
      return;
    }
    setQuantityErrors(prev => { const n = { ...prev }; delete n[item.id]; return n; });
    onUpdateQuantity(item.id, item.quantity + 1);
  };

  const handleCheckout = () => {
    if (!meetsMinimum) {
      setCheckoutError(`Add ₹${(99 - subtotal).toFixed(2)} more to meet the ₹99 minimum order requirement.`);
      setTimeout(() => setCheckoutError(''), 3000);
      return;
    }
    if (items.length === 0) {
      setCheckoutError('Your cart is empty. Add items before checking out.');
      setTimeout(() => setCheckoutError(''), 3000);
      return;
    }
    setCheckoutError('');
    onCheckout(appliedPromo?.code, appliedPromo?.discount);
  };

  if (!isHydrated) {
    return null;
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Cart Sidebar */}
      <div className={`
        fixed lg:sticky top-0 right-0 h-screen w-full lg:w-96
        glass-header border-l border-primary/20
        shadow-2xl shadow-black/50 lg:shadow-none
        transition-transform duration-300 z-50 lg:z-0
        ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-primary/20">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/30 animate-glow-pulse">
                <Icon name="ShoppingCartIcon" size={20} variant="solid" className="text-white" />
              </div>
              <div>
                <h2 className="font-heading font-bold text-lg text-gradient-purple">
                  Your Cart
                </h2>
                <span className="font-caption text-xs text-text-secondary">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden flex items-center justify-center w-10 h-10 glass rounded-xl hover:bg-primary/20 transition-all duration-200 press-scale focus-ring"
            >
              <Icon name="XMarkIcon" size={20} className="text-foreground" />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-20 h-20 rounded-full glass flex items-center justify-center mb-4 animate-float">
                  <Icon name="ShoppingCartIcon" size={40} className="text-muted-foreground" />
                </div>
                <h3 className="font-heading font-semibold text-base text-foreground mb-2">
                  Your cart is empty
                </h3>
                <p className="font-body text-sm text-text-secondary">
                  Add items from the store to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={item.id} className={`flex gap-3 p-3 glass-neon rounded-xl animate-slide-in-right stagger-${Math.min(index + 1, 6)}`}>
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-background/50 flex-shrink-0">
                      <AppImage
                        src={item.image}
                        alt={item.alt}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-heading font-semibold text-sm text-foreground mb-1 line-clamp-1">
                        {item.name}
                      </h4>
                      <span className="font-data font-bold text-sm bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        ₹{item.price.toFixed(2)}
                      </span>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => handleQuantityDecrease(item)}
                          className={`flex items-center justify-center w-7 h-7 glass rounded-lg transition-all duration-200 press-scale focus-ring ${
                            item.quantity <= 1
                              ? 'opacity-50 cursor-not-allowed hover:bg-destructive/10' :'hover:bg-primary/20'
                          }`}
                          aria-label={`Decrease quantity of ${item.name}`}
                        >
                          <Icon name="MinusIcon" size={14} className="text-foreground" />
                        </button>
                        <span className="font-data font-bold text-sm text-foreground min-w-[2rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityIncrease(item)}
                          className={`flex items-center justify-center w-7 h-7 glass rounded-lg transition-all duration-200 press-scale focus-ring ${
                            item.quantity >= MAX_QUANTITY
                              ? 'opacity-50 cursor-not-allowed hover:bg-destructive/10' :'hover:bg-primary/20'
                          }`}
                          aria-label={`Increase quantity of ${item.name}`}
                        >
                          <Icon name="PlusIcon" size={14} className="text-foreground" />
                        </button>
                      </div>
                      {quantityErrors[item.id] && (
                        <div className="flex items-center gap-1 mt-1.5 animate-slide-up">
                          <Icon name="ExclamationCircleIcon" size={12} className="text-destructive flex-shrink-0" />
                          <p className="font-caption text-xs text-destructive leading-tight">
                            {quantityErrors[item.id]}
                          </p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="flex items-center justify-center w-8 h-8 rounded-xl hover:bg-destructive/20 transition-all duration-200 press-scale focus-ring self-start"
                    >
                      <Icon name="TrashIcon" size={16} className="text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Summary */}
          {items.length > 0 && (
            <div className="border-t border-primary/20 p-6 space-y-4">
              {!meetsMinimum && (
                <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/30 rounded-xl">
                  <Icon name="ExclamationTriangleIcon" size={16} className="text-warning flex-shrink-0 mt-0.5" />
                  <p className="font-caption text-xs text-warning leading-relaxed">
                    Add ₹{(99 - subtotal).toFixed(2)} more to meet the ₹99 minimum order
                  </p>
                </div>
              )}

              {/* Promo Code Section */}
              <div className="p-3 glass rounded-xl space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Icon name="TagIcon" size={14} className="text-primary" />
                  <span className="font-heading font-semibold text-xs text-foreground">Promo Code</span>
                </div>

                {appliedPromo ? (
                  <div className="flex items-center justify-between p-2 bg-success/10 border border-success/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Icon name="CheckCircleIcon" size={14} className="text-success" />
                      <div>
                        <span className="font-data font-bold text-xs text-success">{appliedPromo.code}</span>
                        <p className="font-caption text-xs text-success/80">{appliedPromo.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-data font-bold text-xs text-success">-₹{appliedPromo.discount.toFixed(2)}</span>
                      <button
                        onClick={handleRemovePromo}
                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-destructive/20 transition-all"
                        aria-label="Remove promo code"
                      >
                        <Icon name="XMarkIcon" size={12} className="text-destructive" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                      placeholder="Enter promo code"
                      className={`flex-1 px-2.5 py-1.5 bg-background/50 border rounded-lg font-data text-xs text-foreground focus:outline-none focus:ring-1 transition-all ${
                        promoError ? 'border-destructive focus:ring-destructive/50' : 'border-primary/20 focus:ring-primary/50'
                      }`}
                    />
                    <button
                      onClick={handleApplyPromo}
                      disabled={isValidatingPromo || !promoInput.trim()}
                      className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-caption font-semibold text-xs rounded-lg hover:from-purple-500 hover:to-indigo-500 transition-all press-scale disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {isValidatingPromo ? (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : 'Apply'}
                    </button>
                  </div>
                )}

                {promoError && (
                  <div className="flex items-center gap-1 animate-slide-up">
                    <Icon name="ExclamationCircleIcon" size={12} className="text-destructive flex-shrink-0" />
                    <p className="font-caption text-xs text-destructive">{promoError}</p>
                  </div>
                )}

                {!appliedPromo && !promoError && (
                  <p className="font-caption text-xs text-text-secondary">
                    Try: WELCOME20, FLAT50, STORE10, EDSTOP30
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-body text-sm text-text-secondary">Subtotal</span>
                  <span className="font-data font-semibold text-sm text-foreground">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-body text-sm text-text-secondary">Delivery Fee</span>
                  <span className={`font-data font-semibold text-sm ${deliveryFee === 0 ? 'text-success' : 'text-foreground'}`}>
                    {deliveryFee === 0 ? '🎉 FREE' : `₹${deliveryFee.toFixed(2)}`}
                  </span>
                </div>
                {appliedPromo && (
                  <div className="flex items-center justify-between">
                    <span className="font-body text-sm text-success flex items-center gap-1">
                      <Icon name="TagIcon" size={12} className="text-success" />
                      Promo ({appliedPromo.code})
                    </span>
                    <span className="font-data font-semibold text-sm text-success">-₹{promoDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-primary/20">
                  <span className="font-heading font-bold text-base text-foreground">Total</span>
                  <span className="font-data font-bold text-xl text-gradient-purple">₹{total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/30 rounded-xl">
                <Icon name="SparklesIcon" size={16} className="text-success animate-spin-slow" />
                <span className="font-caption text-xs text-success font-semibold">
                  🎁 Earn ₹{cashback.toFixed(2)} EdCoins cashback!
                </span>
              </div>

              <div className="p-3 glass-neon rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-caption text-xs text-text-secondary">💰 EdCoins Balance</span>
                  <span className="font-data font-bold text-sm text-foreground">₹{walletBalance.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-caption text-xs text-text-secondary">Max Redemption (30%)</span>
                  <span className="font-data font-semibold text-sm text-primary">₹{maxWalletRedemption.toFixed(2)}</span>
                </div>
              </div>

              {checkoutError && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl animate-slide-up">
                  <Icon name="ExclamationCircleIcon" size={16} className="text-destructive flex-shrink-0 mt-0.5" />
                  <p className="font-caption text-xs text-destructive leading-relaxed">
                    {checkoutError}
                  </p>
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className={`
                  w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl
                  font-heading font-bold text-base btn-glow
                  transition-all duration-300 press-scale focus-ring
                  ${!isCheckingOut
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50' 
                    : 'bg-muted/50 text-muted-foreground cursor-not-allowed'
                  }
                `}
              >
                {isCheckingOut ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <Icon name="ShoppingBagIcon" size={20} variant="solid" />
                    Proceed to Checkout
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ShoppingCart;