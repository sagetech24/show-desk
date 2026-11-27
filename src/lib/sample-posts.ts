import { postArt } from "./shoe-art";

export type SamplePost = { igId: string; caption: string; hoursAgo: number; image: () => string };

const post = (igId: string, hoursAgo: number, palette: number, label: string, caption: string): SamplePost => ({
  igId,
  hoursAgo,
  caption,
  image: () => postArt(palette, label),
});

export const SAMPLE_POSTS: SamplePost[] = [
  post("sample_C1a", 5, 4, "Yonex", "Yonex Power Cushion 65 Z3 🏸 Back in stock!\n₱6,990 · US 7–10\nDM to reserve your pair. COD in Metro Manila.\n#badminton #yonex #badmintonph"),
  post("sample_C1b", 30, 0, "Nike", "Nike Pegasus 41 — daily trainer, responsive ReactX foam 🏃\nPHP 6,995. Sizes US 8-11 available.\n#running #nike #pegasus41 #runph"),
  post("sample_C1c", 52, 1, "Hoka", "HOKA Clifton 9 just landed! Max cushion for long runs ☁️\n₱8,995 | US 7.5-11\nDM us to reserve. #hoka #running"),
  post("sample_C1d", 76, 6, "Samba", "Adidas Samba OG in black/white 🖤 the one everyone's asking about\n₱5,400 — limited sizes\n#adidas #samba #sneakerph"),
  post("sample_C1e", 100, 8, "Wilson", "Wilson Kaos Comp 3.0 🎾 built for baseline grinders\n₱7,695\nSizes 8-11 · DM to reserve\n#tennis #wilson"),
  post("sample_C1f", 124, 3, "Li-Ning", "Li-Ning Ranger Pro badminton shoes — featherlight and grippy 🏸\n₱4,490. Sizes US 6-10.\n#lining #badminton #courtshoes"),
  post("sample_C1g", 150, 2, "Vomero", "Nike Vomero 18 — plush cushion, perfect recovery run shoe 🏃‍♂️\n₱7,995 · US 8-12\n#nike #vomero #running"),
  post("sample_C1h", 176, 7, "Converse", "Converse Chuck 70 High Top 🔥 timeless. ₱4,295\nSizes US 6-10 DM to reserve\n#converse #chuck70 #casual"),
  post("sample_C1i", 200, 5, "Victor", "Victor P9200 TD 🏸 pro-level cushioning\n₱5,290 · US 7-10\n#victor #badminton"),
  post("sample_C1j", 224, 9, "New Balance", "New Balance 530 — 90s runner vibes, everyday comfort\n₱5,495 | US 6-11\n#newbalance #530 #sneakers"),
  post("sample_C1k", 250, 1, "Babolat", "Babolat Propulse Fury 3 🎾 stability + speed on hard courts. PHP 7,890. US 8-11\n#babolat #tennis"),
  post("sample_C1l", 280, 4, "Vans", "Vans Knu Skool 🛹 chunky, retro, comfy. ₱4,599\nSizes 6-10\n#vans #knuskool #casualph"),
];
