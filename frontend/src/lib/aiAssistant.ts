/**
 * VillageMart AI Assistant Engine
 *
 * Client-side intent detection + response generation.
 * Supports English + Tamil queries.
 * NO backend/API changes — all logic is local.
 */

import { parseProductCSV, type Product } from "./recommendations";

// Re-export Product so consumers can import from this module
export type { Product };

/* ================================================================
   TYPES
================================================================ */

export type Intent =
  | "search_product"
  | "add_to_cart"
  | "view_cart"
  | "place_order"
  | "greeting"
  | "help"
  | "recommendation"
  | "location"
  | "category_browse"
  | "price_check"
  | "unknown";

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
  intent?: Intent;
  products?: Product[];
  action?: AiAction;
}

export interface AiAction {
  type: "navigate" | "add_cart" | "none";
  payload?: string;
  product?: Product;
}

/* ================================================================
   INTENT PATTERNS (English + Tamil)
================================================================ */

interface IntentPattern {
  intent: Intent;
  patterns: RegExp[];
  extract?: (match: string, allProducts: Product[]) => {
    response: string;
    products?: Product[];
    action?: AiAction;
  };
}

const INTENT_PATTERNS: IntentPattern[] = [
  /* --- GREETING --- */
  {
    intent: "greeting",
    patterns: [
      /^(hi|hello|hey|hii|good morning|good evening|good afternoon|vanakkam|வணக்கம்|ஹலோ|ஹாய்)/i,
    ],
  },

  /* --- ADD TO CART --- */
  {
    intent: "add_to_cart",
    patterns: [
      /add\s+(.+?)(?:\s+to\s+cart|\s+to\s+basket)?$/i,
      /cart(?:\s+(?:la|il|ku))?\s+(.+?)(?:\s+add|போடு|சேர்|வை)/i,
      /(.+?)\s+(?:சேர்க்க|சேர்|போடு|add)/i,
      /(?:add|put|include)\s+(.+)/i,
    ],
  },

  /* --- SEARCH PRODUCT --- */
  {
    intent: "search_product",
    patterns: [
      /(?:show|find|search|get|give|i want|i need|looking for|where is)\s+(.+)/i,
      /(.+?)\s+(?:காட்டு|கொடு|வேணும்|வேண்டும்|தேடு|இருக்கா|உண்டா)/i,
      /(?:காட்டு|கொடு|தேடு)\s+(.+)/i,
      /(?:do you have|have you got|is there)\s+(.+)/i,
    ],
  },

  /* --- CATEGORY BROWSE --- */
  {
    intent: "category_browse",
    patterns: [
      /(?:show|browse|open|see|view)\s+(?:all\s+)?(vegetables|fruits|groceries|garlands|dairy|grains)/i,
      /(காய்கறி|பழம்|பழங்கள்|மளிகை|மாலை|பால்|தானியம்)/i,
    ],
  },

  /* --- VIEW CART --- */
  {
    intent: "view_cart",
    patterns: [
      /(?:show|view|open|see|check|what's in)\s*(?:my\s+)?cart/i,
      /(?:cart|basket)\s+(?:show|open|see|check|காட்டு)/i,
      /(?:என்|எனது)\s*cart/i,
      /cart\s*(?:la|ல)\s*(?:என்ன|what)/i,
    ],
  },

  /* --- PLACE ORDER --- */
  {
    intent: "place_order",
    patterns: [
      /(?:place|confirm|submit|complete)\s+(?:my\s+)?order/i,
      /(?:order|checkout)\s+(?:now|please|pannunga|பண்ணுங்க)/i,
      /(?:order|ஆர்டர்)\s+(?:போடு|பண்ணு|செய்|place)/i,
    ],
  },

  /* --- PRICE CHECK --- */
  {
    intent: "price_check",
    patterns: [
      /(?:price|cost|rate|how much|what is the price|என்ன விலை|விலை)\s*(?:of|for)?\s*(.+)/i,
      /(.+?)\s+(?:price|விலை|rate|cost|எவ்வளவு)/i,
    ],
  },

  /* --- RECOMMENDATION --- */
  {
    intent: "recommendation",
    patterns: [
      /(?:recommend|suggest|what should i|what to buy|best|popular|trending)/i,
      /(?:என்ன|எது)\s+(?:buy|வாங்க|நல்லது|best)/i,
      /(?:suggestion|recommend)\s*(?:பண்ணு|கொடு|தா)/i,
    ],
  },

  /* --- LOCATION --- */
  {
    intent: "location",
    patterns: [
      /(?:deliver|delivery|location|address|where|area|deliver to|ship to)/i,
      /(?:என் location|எந்த area|delivery area|கொண்டு வா)/i,
      /(?:karur|கரூர்|kulithalai|குளித்தலை|village|கிராமம்)/i,
    ],
  },

  /* --- HELP --- */
  {
    intent: "help",
    patterns: [
      /(?:help|what can you do|how to|guide|உதவி|என்ன செய்வீர்கள்)/i,
    ],
  },
];

/* ================================================================
   CATEGORY MAPPING (Tamil → English)
================================================================ */

const CATEGORY_MAP: Record<string, string> = {
  "காய்கறி": "Vegetables",
  "vegetables": "Vegetables",
  "பழம்": "Fruits",
  "பழங்கள்": "Fruits",
  "fruits": "Fruits",
  "மளிகை": "Groceries",
  "groceries": "Groceries",
  "மாலை": "Garlands",
  "garlands": "Garlands",
  "பால்": "Dairy",
  "dairy": "Dairy",
  "தானியம்": "Grains",
  "grains": "Grains",
};

/* ================================================================
   TIME-BASED RECOMMENDATIONS
================================================================ */

function getTimeBasedSuggestion(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) {
    return "🌅 Good morning! How about fresh milk, coffee powder, or bread for breakfast?";
  } else if (hour >= 10 && hour < 14) {
    return "☀️ Lunchtime! Need rice, dal, or fresh vegetables for cooking?";
  } else if (hour >= 14 && hour < 17) {
    return "🍎 Afternoon snack time! Fresh fruits or bananas maybe?";
  } else if (hour >= 17 && hour < 21) {
    return "🌙 Evening! Need groceries for dinner? Rice, oil, and spices are popular now.";
  } else {
    return "🌟 Late shopping? We have everything ready for tomorrow's meals!";
  }
}

/* ================================================================
   PRODUCT SEARCH
================================================================ */

function searchProducts(query: string, products: Product[]): Product[] {
  const q = query.toLowerCase().trim();

  // Direct name match
  const exact = products.filter(
    (p) => p.name.toLowerCase() === q && p.inStock
  );
  if (exact.length > 0) return exact;

  // Partial match
  const partial = products.filter(
    (p) => p.name.toLowerCase().includes(q) && p.inStock
  );
  if (partial.length > 0) return partial.slice(0, 6);

  // Category match
  const catKey = Object.keys(CATEGORY_MAP).find((k) => q.includes(k));
  if (catKey) {
    const category = CATEGORY_MAP[catKey];
    return products
      .filter((p) => p.category === category && p.inStock)
      .slice(0, 6);
  }

  // Fuzzy — check if any word from query appears in product name
  const words = q.split(/\s+/).filter((w) => w.length > 2);
  const fuzzy = products.filter((p) =>
    words.some((w) => p.name.toLowerCase().includes(w))
  );

  return fuzzy.filter((p) => p.inStock).slice(0, 6);
}

/* ================================================================
   MAIN RESPONSE GENERATOR
================================================================ */

let cachedProducts: Product[] = [];

export async function loadProducts(): Promise<Product[]> {
  if (cachedProducts.length > 0) return cachedProducts;

  try {
    const res = await fetch("/datadetails1.csv");
    if (!res.ok) return [];
    const csv = await res.text();
    cachedProducts = parseProductCSV(csv);
    return cachedProducts;
  } catch {
    return [];
  }
}

export async function generateResponse(
  userText: string
): Promise<AiMessage> {
  const products = await loadProducts();
  const text = userText.trim();
  const id = `ai-${Date.now()}`;
  const timestamp = Date.now();

  // Detect intent
  let detectedIntent: Intent = "unknown";
  let extractedQuery = "";

  for (const { intent, patterns } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        detectedIntent = intent;
        extractedQuery = (match[1] || "").trim();
        break;
      }
    }
    if (detectedIntent !== "unknown") break;
  }

  // Generate response based on intent
  switch (detectedIntent) {
    case "greeting": {
      const hour = new Date().getHours();
      const timeGreeting =
        hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

      return {
        id,
        role: "assistant",
        text: `${timeGreeting}! 🙏 Welcome to VillageMart AI Assistant.\n\n${getTimeBasedSuggestion()}\n\nI can help you:\n🔍 Search products\n🛒 Add items to cart\n📍 Check delivery area\n💡 Get recommendations\n\nJust ask me anything!`,
        timestamp,
        intent: detectedIntent,
      };
    }

    case "help": {
      return {
        id,
        role: "assistant",
        text: `🤖 I'm your VillageMart AI Assistant!\n\nHere's what I can do:\n\n🔍 **Search** — "Show tomatoes" / "காய்கறி காட்டு"\n🛒 **Add to Cart** — "Add rice" / "அரிசி சேர்க்க"\n📦 **View Cart** — "Show my cart"\n🏪 **Browse** — "Show vegetables"\n💰 **Price Check** — "Price of onion"\n📍 **Delivery** — "Deliver to Karur"\n💡 **Suggestions** — "What should I buy?"\n\n🌐 I understand both **English** and **தமிழ்**!`,
        timestamp,
        intent: detectedIntent,
      };
    }

    case "search_product": {
      const found = searchProducts(extractedQuery || text, products);

      if (found.length > 0) {
        return {
          id,
          role: "assistant",
          text: `🔍 Found ${found.length} product${found.length > 1 ? "s" : ""} for "${extractedQuery || text}":\n\nTap any product to add to cart!`,
          timestamp,
          intent: detectedIntent,
          products: found,
        };
      }

      return {
        id,
        role: "assistant",
        text: `😕 Sorry, I couldn't find "${extractedQuery || text}".\n\nTry:\n• Check spelling\n• Use simpler words like "rice", "onion"\n• Browse by category: "Show vegetables"`,
        timestamp,
        intent: detectedIntent,
      };
    }

    case "add_to_cart": {
      const query = extractedQuery || text.replace(/add|cart|சேர்|போடு/gi, "").trim();
      const found = searchProducts(query, products);

      if (found.length === 1) {
        return {
          id,
          role: "assistant",
          text: `✅ Found **${found[0].name}** (₹${found[0].price})\n\nTap the "Add" button below to add it to your cart!`,
          timestamp,
          intent: detectedIntent,
          products: found,
          action: { type: "add_cart", product: found[0] },
        };
      } else if (found.length > 1) {
        return {
          id,
          role: "assistant",
          text: `🛒 Found ${found.length} matching products for "${query}".\n\nWhich one would you like to add?`,
          timestamp,
          intent: detectedIntent,
          products: found,
        };
      }

      return {
        id,
        role: "assistant",
        text: `😕 Couldn't find "${query}" to add.\n\nTry specific names like "Rice", "Onion", "Tomatoes".`,
        timestamp,
        intent: detectedIntent,
      };
    }

    case "category_browse": {
      const catKey = Object.keys(CATEGORY_MAP).find((k) =>
        text.toLowerCase().includes(k)
      );
      const category = catKey ? CATEGORY_MAP[catKey] : null;

      if (category) {
        const catProducts = products
          .filter((p) => p.category === category && p.inStock)
          .slice(0, 6);

        return {
          id,
          role: "assistant",
          text: `📂 Showing **${category}** (${catProducts.length} items):\n\nTap any product to add to cart!`,
          timestamp,
          intent: detectedIntent,
          products: catProducts,
          action: { type: "navigate", payload: `/products?category=${category}` },
        };
      }

      return {
        id, role: "assistant",
        text: `📂 Available categories:\n\n🥕 Vegetables\n🍎 Fruits\n🛒 Groceries\n🌸 Garlands\n🥛 Dairy\n🌾 Grains\n\nSay "Show vegetables" or "காய்கறி காட்டு"`,
        timestamp, intent: detectedIntent,
      };
    }

    case "view_cart": {
      try {
        const raw = localStorage.getItem("cart");
        const cart: any[] = raw ? JSON.parse(raw) : [];

        if (cart.length === 0) {
          return {
            id, role: "assistant",
            text: `🛒 Your cart is empty!\n\nWant me to suggest some products?\nSay "recommend" or "suggest something"`,
            timestamp, intent: detectedIntent,
            action: { type: "navigate", payload: "/cart" },
          };
        }

        const total = cart.reduce(
          (sum: number, i: any) => sum + i.price * (i.quantity || 1), 0
        );
        const itemList = cart
          .map((i: any) => `• ${i.name} — ₹${i.price} × ${i.quantity}${i.unit}`)
          .join("\n");

        return {
          id, role: "assistant",
          text: `🛒 **Your Cart** (${cart.length} items):\n\n${itemList}\n\n💰 **Total: ₹${total.toFixed(0)}**\n\nSay "Place order" to checkout!`,
          timestamp, intent: detectedIntent,
          action: { type: "navigate", payload: "/cart" },
        };
      } catch {
        return {
          id, role: "assistant",
          text: "😕 Couldn't read your cart. Try refreshing the page.",
          timestamp, intent: detectedIntent,
        };
      }
    }

    case "place_order": {
      const raw = localStorage.getItem("cart");
      const cart: any[] = raw ? JSON.parse(raw) : [];

      if (cart.length === 0) {
        return {
          id, role: "assistant",
          text: `🛒 Your cart is empty! Add some products first.\n\nSay "Show vegetables" or "recommend products"`,
          timestamp, intent: detectedIntent,
        };
      }

      return {
        id, role: "assistant",
        text: `🎉 Ready to place your order!\n\nI'll take you to checkout now. You have ${cart.length} items in your cart.\n\nTap the button below to proceed!`,
        timestamp, intent: detectedIntent,
        action: { type: "navigate", payload: "/checkout" },
      };
    }

    case "price_check": {
      const query = extractedQuery || text.replace(/price|cost|rate|விலை|எவ்வளவு/gi, "").trim();
      const found = searchProducts(query, products);

      if (found.length > 0) {
        const priceList = found
          .slice(0, 5)
          .map((p) => `• **${p.name}** — ₹${p.price}`)
          .join("\n");

        return {
          id, role: "assistant",
          text: `💰 Prices:\n\n${priceList}`,
          timestamp, intent: detectedIntent,
          products: found.slice(0, 3),
        };
      }

      return {
        id, role: "assistant",
        text: `😕 Couldn't find pricing for "${query}". Try a product name like "Rice" or "Onion".`,
        timestamp, intent: detectedIntent,
      };
    }

    case "recommendation": {
      const timeSuggestion = getTimeBasedSuggestion();

      // Get trending products
      const trending = [...products]
        .filter((p) => p.inStock)
        .sort((a, b) => b.rating * b.reviews - a.rating * a.reviews)
        .slice(0, 6);

      return {
        id, role: "assistant",
        text: `💡 **Smart Recommendations**\n\n${timeSuggestion}\n\n🔥 **Trending Now:**`,
        timestamp, intent: detectedIntent,
        products: trending,
      };
    }

    case "location": {
      return {
        id, role: "assistant",
        text: `📍 **Delivery Location**\n\n🟢 We currently deliver to:\n• Karur (கரூர்)\n• Kulithalai (குளித்தலை)\n• Nearby villages\n\nYour current delivery address: **Karur, Tamil Nadu**\n\n🚚 Estimated delivery: Same day for most areas!`,
        timestamp, intent: detectedIntent,
      };
    }

    default: {
      // Try a product search as fallback
      const fallbackSearch = searchProducts(text, products);
      if (fallbackSearch.length > 0) {
        return {
          id, role: "assistant",
          text: `🔍 I found these products matching "${text}":`,
          timestamp, intent: "search_product",
          products: fallbackSearch,
        };
      }

      return {
        id, role: "assistant",
        text: `🤔 I'm not sure what you mean by "${text}".\n\nTry:\n• "Show tomatoes" — search products\n• "Add rice" — add to cart\n• "Show my cart" — view cart\n• "recommend" — get suggestions\n• "help" — see all commands\n\n🌐 I understand English and தமிழ்!`,
        timestamp, intent: "unknown",
      };
    }
  }
}

/* ================================================================
   TEXT-TO-SPEECH (Voice Response)
================================================================ */

export function speakText(text: string, lang: "en-IN" | "ta-IN" = "en-IN") {
  if (!("speechSynthesis" in window)) return;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Clean markdown from text
  const cleaned = text
    .replace(/\*\*/g, "")
    .replace(/[🔍🛒📦💰📍🤖🎉💡🟢🚚☀️🌅🌙🌟😕✅📂🔥🤔🙏]/g, "")
    .replace(/•/g, ",")
    .replace(/\n+/g, ". ")
    .trim();

  const utterance = new SpeechSynthesisUtterance(cleaned);
  utterance.lang = lang;
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  utterance.volume = 0.9;

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
