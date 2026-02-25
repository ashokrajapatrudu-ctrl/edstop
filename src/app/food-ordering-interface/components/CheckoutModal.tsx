'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import PaymentErrorModal, { type PaymentMethod, type SavedCartItem } from '@/components/ui/PaymentErrorModal';
import { createClient } from '@/lib/supabase/client';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  walletBalance: number;
  maxWalletRedemption: number;
  onConfirmOrder: (paymentMethod: string, walletAmount: number, promoCode?: string, promoDiscount?: number) => void;
  cartItems?: SavedCartItem[];
}

const CheckoutModal = ({
  isOpen,
  onClose,
  total,
  walletBalance,
  maxWalletRedemption,
  onConfirmOrder,
  cartItems = [],
}: CheckoutModalProps) => {
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('razorpay');
  const [walletAmount, setWalletAmount] = useState(0);
  const [walletError, setWalletError] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentError, setShowPaymentError] = useState(false);
  const [paymentErrorCode, setPaymentErrorCode] = useState<string>('DEFAULT');
  const [paymentRetryCount, setPaymentRetryCount] = useState(0);
  const [failedPaymentMethod, setFailedPaymentMethod] = useState<PaymentMethod>('razorpay');

  // Promo code state
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number; description: string } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  if (!isOpen) return null;

  const discountedTotal = total - (appliedPromo?.discount ?? 0);
  const remainingAmount = discountedTotal - walletAmount;
  const canUseCOD = remainingAmount <= 800;
  const maxAllowed = Math.min(maxWalletRedemption, walletBalance, discountedTotal);

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
        p_order_amount: total,
        p_order_type: 'food',
      });
      if (error) throw error;
      if (data?.valid) {
        setAppliedPromo({ code: code.toUpperCase(), discount: data.discount, description: data.description });
        setPromoInput('');
        setPromoError('');
        // Adjust wallet amount if it now exceeds discounted total
        if (walletAmount > discountedTotal - data.discount) {
          setWalletAmount(0);
        }
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

  const handleWalletChange = (value: string) => {
    const raw = value.trim();
    if (raw === '' || raw === '0') {
      setWalletAmount(0);
      setWalletError('');
      return;
    }
    const amount = parseFloat(raw);
    if (isNaN(amount) || amount < 0) {
      setWalletError('Please enter a valid positive amount.');
      return;
    }
    if (amount > walletBalance) {
      setWalletError(`Insufficient balance. Your wallet has ₹${walletBalance.toFixed(2)}.`);
      setWalletAmount(walletBalance);
      return;
    }
    if (amount > maxWalletRedemption) {
      setWalletError(`Max redemption is ₹${maxWalletRedemption.toFixed(2)} (30% of order).`);
      setWalletAmount(maxWalletRedemption);
      return;
    }
    if (amount > discountedTotal) {
      setWalletError(`Cannot exceed order total of ₹${discountedTotal.toFixed(2)}.`);
      setWalletAmount(discountedTotal);
      return;
    }
    setWalletError('');
    setWalletAmount(amount);
  };

  const handlePaymentMethodChange = (method: 'razorpay' | 'cod') => {
    if (method === 'cod' && !canUseCOD) {
      setPaymentError('Cash on Delivery is only available for orders up to ₹800. Please use Razorpay or reduce your order amount.');
      return;
    }
    setPaymentError('');
    setPaymentMethod(method);
  };

  const handleConfirm = async () => {
    if (paymentMethod === 'cod' && !canUseCOD) {
      setPaymentError('Cash on Delivery is not available for orders above ₹800. Please select Razorpay.');
      return;
    }
    if (walletAmount < 0 || walletAmount > maxAllowed) {
      setWalletError(`Wallet amount must be between ₹0 and ₹${maxAllowed.toFixed(2)}.`);
      return;
    }
    setPaymentError('');
    setWalletError('');
    setIsProcessing(true);
    setTimeout(() => {
      const shouldFail = Math.random() < 0.05;
      if (shouldFail) {
        setFailedPaymentMethod(paymentMethod as PaymentMethod);
        setPaymentErrorCode(paymentMethod === 'wallet' ? 'INSUFFICIENT_BALANCE' : 'PAYMENT_FAILED');
        setShowPaymentError(true);
        setIsProcessing(false);
        return;
      }
      onConfirmOrder(paymentMethod, walletAmount, appliedPromo?.code, appliedPromo?.discount);
      setIsProcessing(false);
    }, 1500);
  };

  const handlePaymentErrorRetry = (method: PaymentMethod) => {
    setPaymentRetryCount((c) => c + 1);
    setShowPaymentError(false);
    setPaymentMethod(method === 'cod' ? 'cod' : 'razorpay');
    setTimeout(() => {
      onConfirmOrder(method, walletAmount, appliedPromo?.code, appliedPromo?.discount);
    }, 500);
  };

  const handleCartRecover = (cart: SavedCartItem[]) => {
    // Cart is already in parent; this just acknowledges recovery
    console.info('Cart recovered:', cart.length, 'items');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-md shadow-geometric-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-heading font-semibold text-xl text-foreground">
            Checkout
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-sm hover:bg-muted transition-smooth press-scale focus-ring"
          >
            <Icon name="XMarkIcon" size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Promo Code */}
          <div className="p-4 bg-muted rounded-sm">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="TagIcon" size={16} className="text-primary" />
              <span className="font-heading font-medium text-sm text-foreground">Promo Code</span>
            </div>

            {appliedPromo ? (
              <div className="flex items-center justify-between p-3 bg-success/10 border border-success/30 rounded-sm">
                <div className="flex items-center gap-2">
                  <Icon name="CheckCircleIcon" size={16} className="text-success" />
                  <div>
                    <span className="font-data font-bold text-sm text-success">{appliedPromo.code}</span>
                    <p className="font-caption text-xs text-success/80 mt-0.5">{appliedPromo.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-data font-bold text-sm text-success">-₹{appliedPromo.discount.toFixed(2)}</span>
                  <button
                    onClick={handleRemovePromo}
                    className="w-6 h-6 flex items-center justify-center rounded-sm hover:bg-destructive/20 transition-smooth"
                    aria-label="Remove promo code"
                  >
                    <Icon name="XMarkIcon" size={14} className="text-destructive" />
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
                  className={`flex-1 px-3 py-2 bg-background border rounded-sm font-data text-sm text-foreground focus:outline-none focus:ring-2 transition-all duration-200 ${
                    promoError ? 'border-destructive focus:ring-destructive/50' : 'border-border focus:ring-ring'
                  }`}
                />
                <button
                  onClick={handleApplyPromo}
                  disabled={isValidatingPromo || !promoInput.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground font-caption font-medium text-sm rounded-sm hover:bg-primary/90 transition-smooth press-scale focus-ring disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isValidatingPromo ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Apply'}
                </button>
              </div>
            )}

            {promoError && (
              <div className="flex items-start gap-1.5 mt-2 animate-slide-up">
                <Icon name="ExclamationCircleIcon" size={14} className="text-destructive flex-shrink-0 mt-0.5" />
                <p className="font-caption text-xs text-destructive">{promoError}</p>
              </div>
            )}

            {!appliedPromo && !promoError && (
              <p className="font-caption text-xs text-text-secondary mt-2">
                Try: WELCOME20, FLAT50, FOOD15, EDSTOP30
              </p>
            )}
          </div>

          {/* Wallet Redemption */}
          <div className="p-4 bg-muted rounded-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="font-heading font-medium text-sm text-foreground">
                Use EdCoins Wallet
              </span>
              <span className="font-caption text-xs text-text-secondary">
                Balance: ₹{walletBalance.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <input
                  type="number"
                  value={walletAmount || ''}
                  onChange={(e) => handleWalletChange(e.target.value)}
                  onBlur={(e) => {
                    if (e.target.value === '') {
                      setWalletAmount(0);
                      setWalletError('');
                    }
                  }}
                  placeholder="0.00"
                  min="0"
                  max={maxAllowed}
                  step="0.01"
                  className={`w-full px-3 py-2 bg-background border rounded-sm font-data text-sm text-foreground focus:outline-none focus:ring-2 transition-all duration-200 ${
                    walletError
                      ? 'border-destructive focus:ring-destructive/50 bg-destructive/5' :'border-border focus:ring-ring'
                  }`}
                />
              </div>
              <button
                onClick={() => { setWalletAmount(maxAllowed); setWalletError(''); }}
                className="px-4 py-2 bg-primary text-primary-foreground font-caption font-medium text-sm rounded-sm hover:bg-primary/90 transition-smooth press-scale focus-ring"
              >
                Max
              </button>
            </div>

            {walletError ? (
              <div className="flex items-start gap-1.5 mt-2 animate-slide-up">
                <Icon name="ExclamationCircleIcon" size={14} className="text-destructive flex-shrink-0 mt-0.5" />
                <p className="font-caption text-xs text-destructive leading-relaxed">
                  {walletError}
                </p>
              </div>
            ) : (
              <p className="font-caption text-xs text-text-secondary mt-2">
                Maximum redemption: ₹{maxWalletRedemption.toFixed(2)} (30% of order)
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <h3 className="font-heading font-medium text-sm text-foreground mb-3">
              Payment Method
            </h3>

            <div className="space-y-2">
              <label
                className="flex items-center gap-3 p-3 bg-muted rounded-sm cursor-pointer hover:bg-muted/80 transition-smooth"
                onClick={() => handlePaymentMethodChange('razorpay')}
              >
                <input
                  type="radio"
                  name="payment"
                  value="razorpay"
                  checked={paymentMethod === 'razorpay'}
                  onChange={() => handlePaymentMethodChange('razorpay')}
                  className="w-4 h-4 text-primary"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Icon name="CreditCardIcon" size={20} className="text-primary" />
                    <span className="font-heading font-medium text-sm text-foreground">
                      Razorpay (UPI/Card/Wallet)
                    </span>
                  </div>
                  <p className="font-caption text-xs text-text-secondary mt-1">
                    Pay ₹{remainingAmount.toFixed(2)} online
                  </p>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-3 rounded-sm transition-smooth ${
                  canUseCOD
                    ? 'bg-muted cursor-pointer hover:bg-muted/80' :'bg-muted/50 cursor-not-allowed opacity-60'
                }`}
                onClick={() => handlePaymentMethodChange('cod')}
              >
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => handlePaymentMethodChange('cod')}
                  disabled={!canUseCOD}
                  className="w-4 h-4 text-primary"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Icon name="BanknotesIcon" size={20} className="text-accent" />
                    <span className="font-heading font-medium text-sm text-foreground">
                      Cash on Delivery
                    </span>
                    {!canUseCOD && (
                      <span className="px-1.5 py-0.5 bg-destructive/20 text-destructive font-caption text-xs rounded">
                        Unavailable
                      </span>
                    )}
                  </div>
                  <p className="font-caption text-xs text-text-secondary mt-1">
                    {canUseCOD
                      ? `Pay ₹${remainingAmount.toFixed(2)} in cash`
                      : 'Not available for orders above ₹800'
                    }
                  </p>
                </div>
              </label>
            </div>

            {paymentError && (
              <div className="mt-2 flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-sm animate-slide-up">
                <Icon name="ExclamationCircleIcon" size={14} className="text-destructive flex-shrink-0 mt-0.5" />
                <p className="font-caption text-xs text-destructive leading-relaxed">
                  {paymentError}
                </p>
              </div>
            )}

            {paymentMethod === 'cod' && !paymentError && (
              <div className="mt-3 p-3 bg-warning/10 border border-warning/20 rounded-sm">
                <div className="flex items-start gap-2">
                  <Icon name="InformationCircleIcon" size={16} className="text-warning flex-shrink-0 mt-0.5" />
                  <p className="font-caption text-xs text-warning">
                    No cashback or wallet redemption available with COD
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="p-4 bg-surface rounded-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-caption text-sm text-text-secondary">Order Total</span>
              <span className="font-data text-sm text-foreground">₹{total.toFixed(2)}</span>
            </div>

            {appliedPromo && (
              <div className="flex items-center justify-between">
                <span className="font-caption text-sm text-success flex items-center gap-1">
                  <Icon name="TagIcon" size={12} className="text-success" />
                  Promo ({appliedPromo.code})
                </span>
                <span className="font-data text-sm text-success">-₹{appliedPromo.discount.toFixed(2)}</span>
              </div>
            )}

            {walletAmount > 0 && (
              <div className="flex items-center justify-between">
                <span className="font-caption text-sm text-success">EdCoins Used</span>
                <span className="font-data text-sm text-success">-₹{walletAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="font-heading font-semibold text-base text-foreground">
                  Amount to Pay
                </span>
                <span className="font-data text-lg font-bold text-foreground">
                  ₹{remainingAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Confirm button */}
        <div className="p-4 border-t border-border">
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="w-full py-3 gradient-primary text-primary-foreground font-heading font-bold text-sm rounded-sm shadow-geometric hover:shadow-geometric-lg transition-smooth press-scale focus-ring disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              `Confirm & Pay ₹${remainingAmount.toFixed(2)}`
            )}
          </button>
        </div>
      </div>

      {/* Payment Error Modal */}
      <PaymentErrorModal
        isOpen={showPaymentError}
        onClose={() => setShowPaymentError(false)}
        errorCode={paymentErrorCode}
        failedMethod={failedPaymentMethod}
        orderTotal={total}
        walletBalance={walletBalance}
        savedCart={cartItems}
        onRetry={handlePaymentErrorRetry}
        onRecoverCart={handleCartRecover}
        retryCount={paymentRetryCount}
        maxRetries={3}
      />
    </div>
  );
};

export default CheckoutModal;