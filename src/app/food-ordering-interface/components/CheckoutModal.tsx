'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { createClient } from '@/lib/supabase/client';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  walletBalance: number;
  maxWalletRedemption: number;
  cartItems: any[];
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

  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('razorpay');
  const [walletAmount, setWalletAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const remainingAmount = total - walletAmount;

  const handleConfirm = async () => {
    setIsProcessing(true);
    setErrorMessage('');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not logged in');
      }

      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItems,
          totalAmount: total,
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
      setErrorMessage(error.message || 'Something went wrong');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-white p-6 rounded-md shadow-xl">

        <h2 className="text-lg font-bold mb-4">Checkout</h2>

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
        </div>

        <div className="mb-4">
          <div className="flex justify-between">
            <span>Total</span>
            <span>₹{total.toFixed(2)}</span>
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
          {isProcessing ? 'Processing...' : `Confirm & Pay ₹${remainingAmount.toFixed(2)}`}
        </button>

      </div>
    </div>
  );
};

export default CheckoutModal;