'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  variantName?: string;
  restaurantId: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  walletBalance: number;
  maxWalletRedemption: number;
  cartItems: CartItem[];
  restaurantId: string;
}

const CheckoutModal = ({
  isOpen,
  onClose,
  total,
  walletBalance,
  maxWalletRedemption,
  cartItems,
  restaurantId,
}: CheckoutModalProps) => {
  const supabase = createClient();

  const [paymentMethod, setPaymentMethod] =
    useState<'razorpay' | 'cod'>('razorpay');
  const [walletAmount, setWalletAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Debug log
  useEffect(() => {
    console.log('CheckoutModal cart received:', cartItems);
  }, [cartItems]);

  if (!isOpen) return null;

  const subtotal = Array.isArray(cartItems)
    ? cartItems.reduce(
        (sum, item) =>
          sum + Number(item.price) * Number(item.quantity),
        0
      )
    : 0;

  const remainingAmount = Math.max(0, subtotal - walletAmount);

  const handleConfirm = async () => {
    try {
      setIsProcessing(true);
      setErrorMessage('');

      if (!Array.isArray(cartItems) || cartItems.length === 0) {
        throw new Error('Your cart is empty.');
      }

      if (!restaurantId) {
        throw new Error('Restaurant not selected.');
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not logged in.');
      }

      if (walletAmount > walletBalance) {
        throw new Error('Wallet exceeds balance.');
      }

      if (walletAmount > maxWalletRedemption) {
        throw new Error('Wallet redemption limit exceeded.');
      }

      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItems,
          totalAmount: subtotal, // ✅ FIXED (only subtotal)
          restaurantId,
          paymentMethod,
          walletAmount,
          promoCode: null,
          promoDiscount: 0,
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Order failed');
      }

      // Success
      onClose();
      window.location.href = `/orders/${data.orderId}`;

    } catch (error: any) {
      console.error('Checkout error:', error);
      setErrorMessage(error.message || 'Something went wrong.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-white p-6 rounded-md shadow-xl">

        <h2 className="text-lg font-bold mb-4">Checkout</h2>

        <div className="mb-2 text-sm text-gray-600">
          Items: {cartItems?.length || 0}
        </div>

        {/* Payment Method */}
        <div className="mb-4">
          <label className="block mb-2 font-medium">Payment Method</label>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={paymentMethod === 'razorpay'}
                onChange={() => setPaymentMethod('razorpay')}
              />
              Razorpay (UPI/Card)
            </label>

            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={paymentMethod === 'cod'}
                onChange={() => setPaymentMethod('cod')}
              />
              Cash on Delivery
            </label>
          </div>
        </div>

        {/* Wallet */}
        <div className="mb-4">
          <label className="block mb-2 font-medium">
            Use Wallet (Balance ₹{walletBalance})
          </label>

          <input
            type="number"
            value={walletAmount}
            min={0}
            max={Math.min(walletBalance, maxWalletRedemption)}
            onChange={(e) => setWalletAmount(Number(e.target.value))}
            className="w-full border p-2 rounded"
          />

          <p className="text-xs text-gray-500 mt-1">
            Max allowed: ₹{maxWalletRedemption.toFixed(2)}
          </p>
        </div>

        {/* Summary */}
        <div className="mb-4 border-t pt-3">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>To Pay</span>
            <span>₹{remainingAmount.toFixed(2)}</span>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 text-red-600 text-sm">
            {errorMessage}
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={isProcessing}
          className="w-full bg-black text-white py-3 rounded"
        >
          {isProcessing
            ? 'Processing...'
            : `Confirm & Pay ₹${remainingAmount.toFixed(2)}`}
        </button>

      </div>
    </div>
  );
};

export default CheckoutModal;