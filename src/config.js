export const GRID_SIZE = 6;

export const TIERS = [
  { name: 'น้ำ', emoji: '💧', color: 0x3fa7f5, score: 0 },
  { name: 'ดิน', emoji: '🟤', color: 0x8b5a2b, score: 10 },
  { name: 'โคลน', emoji: '💩', color: 0x6b4423, score: 30 },
  { name: 'แร่เหล็ก', emoji: '⛏️', color: 0x9aa0a6, score: 100 },
  { name: 'ศิลาปราชญ์', emoji: '🔮', color: 0xb04df0, score: 300 },
  { name: 'แมกม่า', emoji: '🌋', color: 0xff4500, score: 200 }, // เทียร์พิเศษ ผสมซ้ำไม่ได้
];

export const MAGMA_TIER = 5;
export const FIRE_ITEM = 'fire';

export const PLACE_SCORE = 1;
export const MAGMA_BONUS = 200;

export function mergeScore(newTier) {
  return TIERS[newTier].score;
}

export function randomItem() {
  const roll = Math.random();
  if (roll < 0.6) return 0; // น้ำ
  if (roll < 0.9) return 1; // ดิน
  return FIRE_ITEM; // ไฟ (สุ่มน้อย)
}
