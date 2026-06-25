// Tamil Nadu + Karur District Location Database
// Names used for autocomplete — coordinates fetched from Nominatim at runtime

export interface LocationEntry {
  name: string;
  type: "city" | "town" | "village";
  parent: string;
}

/**
 * Static location list for autocomplete (no hardcoded coords).
 * Real lat/lng is fetched from Nominatim when user selects a location.
 */
export const TAMILNADU_LOCATIONS: LocationEntry[] = [
  // ======================== MAJOR CITIES ========================
  { name: "Chennai", type: "city", parent: "Tamil Nadu" },
  { name: "Coimbatore", type: "city", parent: "Tamil Nadu" },
  { name: "Madurai", type: "city", parent: "Tamil Nadu" },
  { name: "Tiruchirappalli", type: "city", parent: "Tamil Nadu" },
  { name: "Trichy", type: "city", parent: "Tamil Nadu" },
  { name: "Salem", type: "city", parent: "Tamil Nadu" },
  { name: "Erode", type: "city", parent: "Tamil Nadu" },
  { name: "Tirunelveli", type: "city", parent: "Tamil Nadu" },
  { name: "Thanjavur", type: "city", parent: "Tamil Nadu" },
  { name: "Dindigul", type: "city", parent: "Tamil Nadu" },
  { name: "Namakkal", type: "city", parent: "Tamil Nadu" },

  // ======================== KARUR DISTRICT — MAIN ========================
  { name: "Karur", type: "city", parent: "Karur District" },

  // ======================== KARUR MAJOR AREAS / TALUKS ========================
  { name: "Kulithalai", type: "town", parent: "Karur District" },
  { name: "Krishnarayapuram", type: "town", parent: "Karur District" },
  { name: "Puliyur", type: "town", parent: "Karur District" },
  { name: "Thanthoni", type: "town", parent: "Karur District" },
  { name: "Pugalur", type: "town", parent: "Karur District" },

  // ======================== KARUR VILLAGES — BLOCK 1 ========================
  { name: "Adhanur", type: "village", parent: "Karur District" },
  { name: "Alathur", type: "village", parent: "Karur District" },
  { name: "Chinniyampalayam", type: "village", parent: "Karur District" },
  { name: "Devarmalai", type: "village", parent: "Karur District" },
  { name: "Gudalur", type: "village", parent: "Karur District" },
  { name: "Hiranyamangalam", type: "village", parent: "Karur District" },
  { name: "Inungur", type: "village", parent: "Karur District" },
  { name: "Kalayapatti", type: "village", parent: "Karur District" },
  { name: "Kalladai", type: "village", parent: "Karur District" },
  { name: "Keeranur", type: "village", parent: "Karur District" },
  { name: "Kumaramangalam", type: "village", parent: "Karur District" },
  { name: "Marudur", type: "village", parent: "Karur District" },
  { name: "Mavathur", type: "village", parent: "Karur District" },
  { name: "Mudalaipatti", type: "village", parent: "Karur District" },
  { name: "Mullippadi", type: "village", parent: "Karur District" },
  { name: "Naganur", type: "village", parent: "Karur District" },
  { name: "Nallur", type: "village", parent: "Karur District" },
  { name: "Nangavaram", type: "village", parent: "Karur District" },
  { name: "Padiripatti", type: "village", parent: "Karur District" },
  { name: "Palaviduthi", type: "village", parent: "Karur District" },
  { name: "Pannapatti", type: "village", parent: "Karur District" },
  { name: "Pappayambadi", type: "village", parent: "Karur District" },
  { name: "Pillur", type: "village", parent: "Karur District" },
  { name: "Porundalur", type: "village", parent: "Karur District" },
  { name: "Puluderi", type: "village", parent: "Karur District" },
  { name: "Puthur", type: "village", parent: "Karur District" },
  { name: "Rajendram", type: "village", parent: "Karur District" },
  { name: "Sathiyamangalam", type: "village", parent: "Karur District" },
  { name: "Sembianatham", type: "village", parent: "Karur District" },
  { name: "Sooriyanur", type: "village", parent: "Karur District" },
  { name: "Thennilai", type: "village", parent: "Karur District" },
  { name: "Thogamalai", type: "village", parent: "Karur District" },
  { name: "Vadaseri", type: "village", parent: "Karur District" },
  { name: "Vaiganallur", type: "village", parent: "Karur District" },
  { name: "Varavanai", type: "village", parent: "Karur District" },
  { name: "Vellapatti", type: "village", parent: "Karur District" },

  // ======================== KARUR VILLAGES — BLOCK 2 (Krishnarayapuram) ========================
  { name: "Chinthalavadi", type: "village", parent: "Karur District" },
  { name: "Kallapalli", type: "village", parent: "Karur District" },
  { name: "Kammanallur", type: "village", parent: "Karur District" },
  { name: "Kosur", type: "village", parent: "Karur District" },
  { name: "Mahadhanapuram", type: "village", parent: "Karur District" },
  { name: "Manavasi", type: "village", parent: "Karur District" },
  { name: "Mathagiri", type: "village", parent: "Karur District" },
  { name: "Mayanur", type: "village", parent: "Karur District" },
  { name: "Muthurengampatti", type: "village", parent: "Karur District" },
  { name: "Panjapatti", type: "village", parent: "Karur District" },
  { name: "Sengal", type: "village", parent: "Karur District" },
  { name: "Sithalavai", type: "village", parent: "Karur District" },
  { name: "Sivayam", type: "village", parent: "Karur District" },
  { name: "Thirukkampuliyur", type: "village", parent: "Karur District" },
  { name: "Thondamanginam", type: "village", parent: "Karur District" },
  { name: "Vayalur", type: "village", parent: "Karur District" },
  { name: "Veeriyapalayam", type: "village", parent: "Karur District" },

  // ======================== KARUR VILLAGES — BLOCK 3 (Karur Taluk) ========================
  { name: "Andankoil", type: "village", parent: "Karur District" },
  { name: "Appipalayam", type: "village", parent: "Karur District" },
  { name: "Athur", type: "village", parent: "Karur District" },
  { name: "Emur", type: "village", parent: "Karur District" },
  { name: "Jegadabi", type: "village", parent: "Karur District" },
  { name: "Kadaparai", type: "village", parent: "Karur District" },
  { name: "Kakkavadi", type: "village", parent: "Karur District" },
  { name: "Kombupalayam", type: "village", parent: "Karur District" },
  { name: "Kuppuchipalayam", type: "village", parent: "Karur District" },
  { name: "Manmangalam", type: "village", parent: "Karur District" },
  { name: "Melapalayam", type: "village", parent: "Karur District" },
  { name: "Minnampalli", type: "village", parent: "Karur District" },
  { name: "Nanjaipugalur", type: "village", parent: "Karur District" },
  { name: "Nerur", type: "village", parent: "Karur District" },
  { name: "Pallapalayam", type: "village", parent: "Karur District" },
  { name: "Panchamadevi", type: "village", parent: "Karur District" },
  { name: "Puthambur", type: "village", parent: "Karur District" },
  { name: "Senapiratti", type: "village", parent: "Karur District" },
  { name: "Somur", type: "village", parent: "Karur District" },
  { name: "Thalapatti", type: "village", parent: "Karur District" },
  { name: "Thirumanilaiyur", type: "village", parent: "Karur District" },
  { name: "Uppidamangalam", type: "village", parent: "Karur District" },
  { name: "Vangal", type: "village", parent: "Karur District" },
  { name: "Vellianai", type: "village", parent: "Karur District" },

  // ======================== KARUR VILLAGES — BLOCK 4 (Kulithalai / Thanthoni) ========================
  { name: "Kodaiyur", type: "village", parent: "Karur District" },
  { name: "Modakkur", type: "village", parent: "Karur District" },
  { name: "Monjanur", type: "village", parent: "Karur District" },
  { name: "Munnur", type: "village", parent: "Karur District" },
  { name: "Nadanthai", type: "village", parent: "Karur District" },
  { name: "Nagamballi", type: "village", parent: "Karur District" },
  { name: "Nedungur", type: "village", parent: "Karur District" },
  { name: "Pallapatti", type: "village", parent: "Karur District" },
  { name: "Pavithiram", type: "village", parent: "Karur District" },
  { name: "Punnam", type: "village", parent: "Karur District" },
  { name: "Rajapuram", type: "village", parent: "Karur District" },
  { name: "Santhapadi", type: "village", parent: "Karur District" },
  { name: "Sendamangalam", type: "village", parent: "Karur District" },
  { name: "Thukkachi", type: "village", parent: "Karur District" },
  { name: "Thumbivadi", type: "village", parent: "Karur District" },
  { name: "Velambadi", type: "village", parent: "Karur District" },
  { name: "Venjamangudalur", type: "village", parent: "Karur District" },
  { name: "Viswanathapuri", type: "village", parent: "Karur District" },
];

/**
 * Search locations by keyword.
 * Returns top matches sorted: exact → starts-with → includes.
 */
export function searchLocations(query: string, limit = 8): LocationEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];

  const exact: LocationEntry[] = [];
  const startsWith: LocationEntry[] = [];
  const includes: LocationEntry[] = [];

  for (const loc of TAMILNADU_LOCATIONS) {
    const name = loc.name.toLowerCase();
    if (name === q) {
      exact.push(loc);
    } else if (name.startsWith(q)) {
      startsWith.push(loc);
    } else if (name.includes(q)) {
      includes.push(loc);
    }
  }

  return [...exact, ...startsWith, ...includes].slice(0, limit);
}

/**
 * Geocode a location name using Nominatim (OpenStreetMap).
 * Returns accurate lat/lng for the given place name.
 */
export async function geocodeLocation(
  name: string,
  parent: string
): Promise<{ lat: number; lng: number; displayName: string } | null> {
  try {
    // Build query: "Thogamalai, Karur District, Tamil Nadu"
    const query = `${name}, ${parent}, Tamil Nadu, India`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&limit=1&addressdetails=1`;

    const res = await fetch(url, {
      headers: { "User-Agent": "VillageMart-Transport/1.0" },
    });
    const data = await res.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        displayName: data[0].display_name,
      };
    }

    // Fallback: try with just the name + Tamil Nadu
    const fallbackUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      `${name}, Tamil Nadu, India`
    )}&format=json&limit=1`;

    const fallbackRes = await fetch(fallbackUrl, {
      headers: { "User-Agent": "VillageMart-Transport/1.0" },
    });
    const fallbackData = await fallbackRes.json();

    if (fallbackData && fallbackData.length > 0) {
      return {
        lat: parseFloat(fallbackData[0].lat),
        lng: parseFloat(fallbackData[0].lon),
        displayName: fallbackData[0].display_name,
      };
    }

    return null;
  } catch (err) {
    console.error("Geocoding failed for:", name, err);
    return null;
  }
}
