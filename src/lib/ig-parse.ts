const BRANDS = [
  "Nike", "Adidas", "ASICS", "Yonex", "Li-Ning", "Victor", "Wilson", "Babolat", "HEAD", "New Balance",
  "Hoka", "Brooks", "Mizuno", "Converse", "Vans", "Puma", "Under Armour", "Saucony", "On Running", "Reebok", "Skechers",
];

/** `categories` are category slugs (a caption can match more than one). */
export type PostGuess = { categories: string[]; brand: string; name: string; price: number | null };

const CATEGORY_HINTS: [string, RegExp][] = [
  ["badminton", /badminton|shuttle|bwf/],
  ["tennis", /tennis|clay|baseline/],
  ["running", /run|marathon|trail|jog|5k|10k|tempo/],
];

export function guessFromCaption(caption: string): PostGuess {
  const lower = caption.toLowerCase();
  const categories = CATEGORY_HINTS.filter(([, re]) => re.test(lower)).map(([slug]) => slug);
  if (categories.length === 0) categories.push("casual");

  const brand = BRANDS.find((b) => new RegExp(`\\b${b.replace(/[-]/g, "[- ]?")}\\b`, "i").test(caption)) ?? "";

  const priceMatch = caption.match(/(?:₱|php\s?)\s?(\d[\d,]*(?:\.\d+)?)/i);
  const price = priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : null;

  const firstLine = caption.split("\n").find((l) => l.trim()) ?? "";
  let name = firstLine
    .replace(/#\S+/g, "")
    .replace(/(?:₱|php\s?)\s?\d[\d,]*(?:\.\d+)?/gi, "")
    .split(/\s[—–-]\s|[!|·,]|\p{Extended_Pictographic}|\.\s|\s(?:back in stock|in stock|now available|available|just landed|restock(?:ed)?|sizes?\b)/iu)[0]
    .replace(/[^\p{L}\p{N}\s'’.\-+/]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  name = name.split(" ").slice(0, brand ? 7 : 8).join(" ");
  if (brand) name = name.replace(new RegExp(`^${brand.replace(/[-]/g, "[- ]?")}\\s*`, "i"), "").trim();
  return { categories, brand, name: name.slice(0, 80), price };
}
