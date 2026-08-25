import { Product, UserProfile } from '../types';

/**
 * Calculates effective unit price for a user:
 * - Registered users get standard B2B registered pricing or extra discount
 * - Non-registered visitors see standard list price
 * - If product has discountPercent, it applies
 */
export function getProductEffectivePrice(product: Product, user: UserProfile | null): {
  originalPrice: number;
  finalPrice: number;
  hasB2bDiscount: boolean;
  b2bDiscountPercent: number;
} {
  const originalPrice = product.price;

  // If user is registered (not null), give them an extra 10% registered B2B discount benefit if not already deeply discounted
  const isRegistered = !!user;

  if (isRegistered) {
    // Registered accounts enjoy an exclusive B2B price reduction (-10% extra benefit)
    const discountMultiplier = product.discountPercent 
      ? (1 - (product.discountPercent + 5) / 100)
      : 0.90; // 10% standard B2B member discount
    
    const finalPrice = Math.max(0.5, Number((originalPrice * discountMultiplier).toFixed(2)));
    const b2bDiscountPercent = product.discountPercent ? product.discountPercent + 5 : 10;

    return {
      originalPrice,
      finalPrice,
      hasB2bDiscount: true,
      b2bDiscountPercent,
    };
  }

  // Non-registered visitor
  if (product.discountPercent) {
    const finalPrice = Number((originalPrice * (1 - product.discountPercent / 100)).toFixed(2));
    return {
      originalPrice,
      finalPrice,
      hasB2bDiscount: false,
      b2bDiscountPercent: product.discountPercent,
    };
  }

  return {
    originalPrice,
    finalPrice: originalPrice,
    hasB2bDiscount: false,
    b2bDiscountPercent: 0,
  };
}
