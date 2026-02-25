'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';

interface Variant {
  id: string;
  name: string;
  price: number;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  alt: string;
  isVeg: boolean;
  variants?: Variant[];
  customizable: boolean;
}

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (itemId: string, quantity: number, variantId?: string) => void;
  cartQuantity: number;
}

const MenuItemCard = ({ item, onAddToCart, cartQuantity }: MenuItemCardProps) => {
  const [quantity, setQuantity] = useState(cartQuantity);
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>(
    item.variants?.[0]?.id
  );
  const [showVariants, setShowVariants] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    setIsAdding(true);
    const newQuantity = quantity + 1;
    setQuantity(newQuantity);
    onAddToCart(item.id, newQuantity, selectedVariant);
    setTimeout(() => setIsAdding(false), 400);
  };

  const handleRemove = () => {
    if (quantity > 0) {
      const newQuantity = quantity - 1;
      setQuantity(newQuantity);
      onAddToCart(item.id, newQuantity, selectedVariant);
    }
  };

  const getItemPrice = () => {
    if (item.variants && selectedVariant) {
      const variant = item.variants.find(v => v.id === selectedVariant);
      return variant?.price || item.price;
    }
    return item.price;
  };

  return (
    <div className="p-4 glass-neon rounded-xl card-hover group">
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            <div className={`flex items-center justify-center w-5 h-5 border-2 rounded-sm flex-shrink-0 mt-0.5 ${
              item.isVeg ? 'border-success bg-success/10' : 'border-destructive bg-destructive/10'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                item.isVeg ? 'bg-success' : 'bg-destructive'
              }`} />
            </div>
            
            <h4 className="font-heading font-bold text-base text-foreground flex-1 group-hover:text-primary transition-colors duration-200">
              {item.name}
            </h4>
          </div>

          <p className="font-body text-sm text-text-secondary mb-3 line-clamp-2 leading-relaxed">
            {item.description}
          </p>

          <div className="flex items-center gap-2 mb-3">
            <span className="font-data text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              ₹{getItemPrice()}
            </span>
            {item.customizable && (
              <span className="px-2 py-0.5 glass text-primary text-xs font-caption font-semibold rounded-lg border border-primary/30">
                ✨ Customizable
              </span>
            )}
          </div>

          {item.variants && item.variants.length > 0 && (
            <div className="mb-3">
              <button
                onClick={() => setShowVariants(!showVariants)}
                className="flex items-center gap-2 text-sm font-caption font-semibold text-primary hover:text-primary/80 transition-colors duration-200"
              >
                <span>Choose variant</span>
                <Icon 
                  name={showVariants ? "ChevronUpIcon" : "ChevronDownIcon"} 
                  size={16}
                  className={`transition-transform duration-200 ${showVariants ? 'rotate-180' : ''}`}
                />
              </button>

              {showVariants && (
                <div className="mt-2 space-y-2 animate-slide-up-sm">
                  {item.variants.map((variant) => (
                    <label
                      key={variant.id}
                      className={`flex items-center gap-2 cursor-pointer p-2 rounded-lg transition-all duration-200 ${
                        selectedVariant === variant.id ? 'bg-primary/15 border border-primary/30' : 'hover:bg-muted/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`variant-${item.id}`}
                        value={variant.id}
                        checked={selectedVariant === variant.id}
                        onChange={() => setSelectedVariant(variant.id)}
                        className="w-4 h-4 text-primary accent-purple-600"
                      />
                      <span className="font-caption text-sm text-foreground">
                        {variant.name}
                      </span>
                      <span className="font-data text-sm font-bold text-primary ml-auto">
                        ₹{variant.price}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
            <AppImage
              src={item.image}
              alt={item.alt}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </div>

          {quantity === 0 ? (
            <button
              onClick={handleAdd}
              className={`px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-heading font-bold text-sm rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 press-scale focus-ring btn-glow ${
                isAdding ? 'scale-95' : ''
              }`}
            >
              {isAdding ? '✓' : 'ADD'}
            </button>
          ) : (
            <div className="flex items-center gap-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/30">
              <button
                onClick={handleRemove}
                className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 transition-all duration-200 press-scale focus-ring rounded-l-xl"
              >
                <Icon name="MinusIcon" size={16} variant="solid" />
              </button>
              <span className="font-data text-sm font-bold text-white min-w-[24px] text-center">
                {quantity}
              </span>
              <button
                onClick={handleAdd}
                className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 transition-all duration-200 press-scale focus-ring rounded-r-xl"
              >
                <Icon name="PlusIcon" size={16} variant="solid" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuItemCard;