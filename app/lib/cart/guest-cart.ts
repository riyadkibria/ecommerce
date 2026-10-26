
export type GuestCartItem = {
  productId: number;
  quantity: number;
};

const GUEST_CART_KEY = "guest-cart";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getGuestCart(): GuestCartItem[] {
  if (!isBrowser()) return [];

  try {
    const saved = localStorage.getItem(GUEST_CART_KEY);

    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is GuestCartItem =>
        item !== null &&
        typeof item === "object" &&
        Number.isSafeInteger(item.productId) &&
        item.productId > 0 &&
        Number.isSafeInteger(item.quantity) &&
        item.quantity >= 1 &&
        item.quantity <= 99
    );
  } catch {
    return [];
  }
}

export function saveGuestCart(items: GuestCartItem[]): void {
  if (!isBrowser()) return;

  const validItems = items.filter(
    (item) =>
      Number.isSafeInteger(item.productId) &&
      item.productId > 0 &&
      Number.isSafeInteger(item.quantity) &&
      item.quantity >= 1 &&
      item.quantity <= 99
  );

  localStorage.setItem(
    GUEST_CART_KEY,
    JSON.stringify(validItems)
  );
}

export function addToGuestCart(
  productId: number,
  quantity = 1
): GuestCartItem[] {
  if (
    !Number.isSafeInteger(productId) ||
    productId <= 0 ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > 99
  ) {
    throw new Error("Invalid product or quantity.");
  }

  const cart = getGuestCart();
  const existing = cart.find(
    (item) => item.productId === productId
  );

  if (existing) {
    existing.quantity = Math.min(
      99,
      existing.quantity + quantity
    );
  } else {
    cart.push({ productId, quantity });
  }

  saveGuestCart(cart);

  return cart;
}

export function updateGuestCartQuantity(
  productId: number,
  quantity: number
): GuestCartItem[] {
  const cart = getGuestCart();

  if (quantity <= 0) {
    const updated = cart.filter(
      (item) => item.productId !== productId
    );

    saveGuestCart(updated);
    return updated;
  }

  const updated = cart.map((item) =>
    item.productId === productId
      ? {
          ...item,
          quantity: Math.min(99, Math.floor(quantity)),
        }
      : item
  );

  saveGuestCart(updated);

  return updated;
}

export function removeFromGuestCart(
  productId: number
): GuestCartItem[] {
  const updated = getGuestCart().filter(
    (item) => item.productId !== productId
  );

  saveGuestCart(updated);

  return updated;
}

export function clearGuestCart(): void {
  if (!isBrowser()) return;

  localStorage.removeItem(GUEST_CART_KEY);
}

export function getGuestCartCount(): number {
  return getGuestCart().reduce(
    (total, item) => total + item.quantity,
    0
  );
}
