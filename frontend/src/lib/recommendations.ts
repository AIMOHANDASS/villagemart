/**
 * VillageMart AI Recommendation Engine
 *
 * Provides smart product suggestions based on:
 *   1. Cart contents  → "Frequently bought together"
 *   2. Category affinity → similar items in same/related categories
 *   3. Trending → most popular products (rating × reviews)
 *
 * All logic is client-side — no backend changes required.
 */

/* ================= TYPES ================= */

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  isOrganic: boolean;
}

export interface CartItem extends Product {
  quantity: number;
  unit: string;
}

export type RecommendationType =
  | "cart-based"
  | "category-based"
  | "trending";

export interface Recommendation {
  product: Product;
  reason: string;
  type: RecommendationType;
  score: number; // higher = more relevant
}

/* ================= COMPANION MAP ================= */

/**
 * "Frequently bought together" — manually curated pairs.
 * key = keyword fragment (lowercase), value = keyword fragments of companions.
 */
const COMPANION_MAP: Record<string, string[]> = {
  // Rice companions
  rice:       ["dal", "oil", "turmeric", "chilli", "ghee", "cumin", "coriander"],
  // Dal companions
  dal:        ["rice", "oil", "turmeric", "ghee", "onion", "tomato", "cumin"],
  // Oil companions
  oil:        ["rice", "dal", "onion", "garlic", "mustard", "chilli"],
  // Spices companions
  turmeric:   ["chilli", "coriander", "cumin", "oil", "rice"],
  chilli:     ["coriander", "turmeric", "cumin", "oil", "onion"],
  coriander:  ["chilli", "turmeric", "cumin", "onion", "tomato"],
  cumin:      ["chilli", "turmeric", "coriander", "rice", "dal"],
  pepper:     ["turmeric", "cumin", "coriander", "rice", "ghee"],
  mustard:    ["oil", "dal", "asafoetida", "chilli", "fenugreek"],
  fenugreek:  ["mustard", "dal", "chilli", "rice"],
  asafoetida: ["mustard", "dal", "oil", "turmeric"],
  // Cooking staples
  ghee:       ["rice", "dal", "sugar", "wheat", "jaggery"],
  sugar:      ["ghee", "coffee", "wheat", "jaggery"],
  coffee:     ["sugar", "jaggery", "ghee"],
  jaggery:    ["groundnut", "ghee", "coffee"],
  wheat:      ["ghee", "sugar", "oil", "jaggery"],
  flour:      ["ghee", "sugar", "oil", "jaggery"],
  // Vegetables companions (cook together)
  onion:      ["tomato", "potato", "ginger", "garlic", "oil"],
  tomato:     ["onion", "potato", "capsicum", "oil", "chilli"],
  potato:     ["onion", "tomato", "pea", "cauliflower", "ginger"],
  ginger:     ["garlic", "onion", "oil", "tomato"],
  garlic:     ["ginger", "onion", "oil", "chilli"],
  cabbage:    ["onion", "tomato", "potato", "beans"],
  beans:      ["onion", "tomato", "potato", "cabbage"],
  okra:       ["onion", "tomato", "chilli", "oil"],
  broccoli:   ["cauliflower", "capsicum", "beans", "onion"],
  cauliflower:["potato", "onion", "tomato", "broccoli"],
  capsicum:   ["onion", "tomato", "potato", "broccoli"],
  pumpkin:    ["onion", "potato", "dal", "rice"],
  corn:       ["onion", "capsicum", "potato", "tomato"],
  beetroot:   ["onion", "potato", "tomato"],
  // Fruits — suggest variety
  banana:     ["apple", "grape", "mango", "orange"],
  apple:      ["banana", "grape", "pomegranate", "orange"],
  grape:      ["apple", "banana", "pomegranate", "mango"],
  mango:      ["banana", "grape", "watermelon", "pineapple"],
  orange:     ["apple", "pomegranate", "grape", "guava"],
  watermelon: ["mango", "pineapple", "grape", "dragon"],
  guava:      ["apple", "banana", "pomegranate"],
  pomegranate:["apple", "grape", "orange", "guava"],
  pineapple:  ["mango", "watermelon", "banana", "dragon"],
  dragon:     ["pineapple", "mango", "watermelon"],
  chikoo:     ["banana", "guava", "sitaphal"],
  sitaphal:   ["chikoo", "banana", "guava"],
  rambutan:   ["dragon", "mango", "pineapple"],
  // Garlands — suggest complementary garland types
  lotus:      ["rose", "nanthiyavattai", "jamangi"],
  rose:       ["lotus", "pedal", "nanthiyavattai", "jamangi"],
  pedal:      ["rose", "jamangi", "nanthiyavattai"],
  nanthiyavattai: ["lotus", "rose", "pedal", "jamangi"],
  jamangi:    ["rose", "pedal", "nanthiyavattai", "lotus"],
};

/* ================= CATEGORY AFFINITY ================= */

/** Related categories — items from these are worth suggesting. */
const CATEGORY_AFFINITY: Record<string, string[]> = {
  Groceries:  ["Vegetables", "Fruits", "Dairy", "Grains"],
  Vegetables: ["Groceries", "Fruits"],
  Fruits:     ["Vegetables", "Dairy"],
  Garlands:   ["Garlands"],             // garlands are unique
  Dairy:      ["Groceries", "Fruits"],
  Grains:     ["Groceries", "Vegetables"],
};

/* ================= HELPERS ================= */

function nameContains(productName: string, keyword: string): boolean {
  return productName.toLowerCase().includes(keyword);
}

function getCompanionKeywords(productName: string): string[] {
  const name = productName.toLowerCase();
  const allKeywords: string[] = [];

  for (const [key, companions] of Object.entries(COMPANION_MAP)) {
    if (name.includes(key)) {
      allKeywords.push(...companions);
    }
  }

  return [...new Set(allKeywords)];
}

/* ================= MAIN FUNCTION ================= */

/**
 * Generate smart product recommendations.
 *
 * @param cartItems  Current items in the user's cart (may be empty)
 * @param allProducts  Full product catalog
 * @param maxResults  Maximum recommendations to return (default 8)
 */
export function recommendProducts(
  cartItems: CartItem[],
  allProducts: Product[],
  maxResults = 8
): Recommendation[] {
  const cartIds = new Set(cartItems.map((c) => c.id));
  const available = allProducts.filter(
    (p) => p.inStock && !cartIds.has(p.id)
  );

  const scored = new Map<string, Recommendation>();

  /* ---------- 1. CART-BASED: "Frequently bought together" ---------- */
  if (cartItems.length > 0) {
    // Gather all companion keywords from cart items
    const companionKeywords: string[] = [];
    for (const item of cartItems) {
      companionKeywords.push(...getCompanionKeywords(item.name));
    }

    for (const product of available) {
      const pName = product.name.toLowerCase();
      let matchCount = 0;

      for (const keyword of companionKeywords) {
        if (pName.includes(keyword)) {
          matchCount++;
        }
      }

      if (matchCount > 0) {
        const score = matchCount * 30 + product.rating * 2;
        const existing = scored.get(product.id);
        if (!existing || existing.score < score) {
          scored.set(product.id, {
            product,
            reason: "Pairs well with your cart",
            type: "cart-based",
            score,
          });
        }
      }
    }
  }

  /* ---------- 2. CATEGORY-BASED: similar items ---------- */
  if (cartItems.length > 0) {
    const cartCategories = [...new Set(cartItems.map((c) => c.category))];

    for (const category of cartCategories) {
      // Same-category products not in cart
      const sameCategory = available.filter(
        (p) => p.category === category && !scored.has(p.id)
      );

      for (const product of sameCategory) {
        const score = 15 + product.rating * 2 + product.reviews * 0.01;
        scored.set(product.id, {
          product,
          reason: `Popular in ${category}`,
          type: "category-based",
          score,
        });
      }

      // Related-category products
      const related = CATEGORY_AFFINITY[category] || [];
      for (const relCat of related) {
        const relProducts = available.filter(
          (p) => p.category === relCat && !scored.has(p.id)
        );

        for (const product of relProducts.slice(0, 3)) {
          const score = 10 + product.rating * 2;
          scored.set(product.id, {
            product,
            reason: `You may also like from ${relCat}`,
            type: "category-based",
            score,
          });
        }
      }
    }
  }

  /* ---------- 3. TRENDING: highest popularity score ---------- */
  const trending = available
    .filter((p) => !scored.has(p.id))
    .map((p) => ({
      product: p,
      popularityScore: p.rating * p.reviews,
    }))
    .sort((a, b) => b.popularityScore - a.popularityScore)
    .slice(0, maxResults);

  for (const { product, popularityScore } of trending) {
    scored.set(product.id, {
      product,
      reason: "Trending in your area",
      type: "trending",
      score: 5 + popularityScore * 0.001,
    });
  }

  /* ---------- Sort & limit ---------- */
  return [...scored.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

/* ================= PARSE CSV ================= */

/**
 * Parse the CSV product catalog into Product[]
 */
export function parseProductCSV(csvText: string): Product[] {
  const rows = csvText.split("\n").slice(1);

  return rows
    .map((row) => {
      const cols = row.split(",");
      if (cols.length < 9) return null;

      return {
        id: cols[0]?.replace(/"/g, ""),
        name: cols[1]?.replace(/"/g, ""),
        price: parseFloat(cols[2]),
        image: cols[3]?.replace(/"/g, ""),
        category: cols[4]?.replace(/"/g, ""),
        rating: parseFloat(cols[5]),
        reviews: parseInt(cols[6]),
        inStock: cols[7]?.toLowerCase().trim() === "true",
        isOrganic: cols[8]?.toLowerCase().trim() === "true",
      };
    })
    .filter((item): item is Product => item !== null && !!item.name);
}

/* ================= READ CART ================= */

/**
 * Read current cart from localStorage
 */
export function getCartItems(): CartItem[] {
  try {
    const raw = localStorage.getItem("cart");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
