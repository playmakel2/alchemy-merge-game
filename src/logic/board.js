// ตรรกะกระดานแบบ pure functions (ทดสอบง่าย แยกจาก Phaser)

export function createBoard(size) {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

export function isFull(board) {
  return board.every((row) => row.every((cell) => cell !== null));
}

// Flood fill: หาบล็อก tier เดียวกันที่ติดกัน 4 ทิศ ครอบคลุมเซลล์เริ่มต้น
export function findConnected(board, row, col) {
  const target = board[row][col];
  if (target === null) return [];
  const size = board.length;
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const stack = [[row, col]];
  const group = [];
  visited[row][col] = true;
  while (stack.length) {
    const [r, c] = stack.pop();
    group.push([r, c]);
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      if (visited[nr][nc]) continue;
      if (board[nr][nc] !== null && board[nr][nc] === target) {
        visited[nr][nc] = true;
        stack.push([nr, nc]);
      }
    }
  }
  return group;
}

// แก้ไข board แบบ in-place: คืน { merged: [...] , upgraded: [r,c] | null }
export function tryMerge(board, row, col, maxTier, noMergeTiers = []) {
  const current = board[row][col];
  if (current === null || noMergeTiers.includes(current)) {
    return { merged: false };
  }
  const group = findConnected(board, row, col);
  if (group.length < 3) return { merged: false };
  for (const [r, c] of group) board[r][c] = null;
  if (current < maxTier) {
    board[row][col] = current + 1;
    return { merged: true, upgraded: [row, col], newTier: current + 1 };
  }
  return { merged: true, upgraded: null, newTier: current };
}
