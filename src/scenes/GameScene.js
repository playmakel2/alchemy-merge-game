import Phaser from 'phaser';
import {
  GRID_SIZE,
  TIERS,
  PLACE_SCORE,
  MAGMA_BONUS,
  MAGMA_TIER,
  FIRE_ITEM,
  mergeScore,
  randomItem,
} from '../config.js';
import { createBoard, isFull, tryMerge } from '../logic/board.js';

const CELL = 72;
const OFFSET_X = (560 - 6 * CELL) / 2 + CELL / 2;
const OFFSET_Y = 180;

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, (n >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amt));
  const b = Math.min(255, Math.max(0, (n & 0xff) + amt));
  return `rgb(${r},${g},${b})`;
}

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.board = createBoard(GRID_SIZE);
    this.score = 0;
    this.gameOver = false;

    this.currentItem = randomItem();
    this.nextItem = randomItem();
    this.storeItem = null;

    // พื้นหลังไล่เฉดสี + กรอบเวที
    const bg = this.textures.createCanvas('bgGrad', this.scale.width, this.scale.height);
    const ctx = bg.getContext();
    const grad = ctx.createLinearGradient(0, 0, 0, this.scale.height);
    grad.addColorStop(0, '#1b1b3a');
    grad.addColorStop(0.6, '#16213e');
    grad.addColorStop(1, '#0f3460');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.scale.width, this.scale.height);
    bg.refresh();
    this.add.image(this.scale.width / 2, this.scale.height / 2, 'bgGrad');

    // แผงหลังกระดาน
    const boardW = GRID_SIZE * CELL;
    const boardH = GRID_SIZE * CELL;
    this.add
      .graphics()
      .fillStyle(0x1e1e3f, 0.85)
      .fillRoundedRect(OFFSET_X - CELL / 2 - 12, OFFSET_Y - CELL / 2 - 12, boardW + 24, boardH + 24, 16)
      .lineStyle(3, 0x6c5ce7, 1)
      .strokeRoundedRect(OFFSET_X - CELL / 2 - 12, OFFSET_Y - CELL / 2 - 12, boardW + 24, boardH + 24, 16);

    this.scoreText = this.add.text(this.scale.width / 2, 30, 'คะแนน: 0', {
      fontSize: '26px',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(this.scale.width / 2, 62, 'วางธาตุตามคิว — รวม 3 ชิ้นเหมือนกันเพื่ออัปเกรด', {
      fontSize: '13px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // UI คิว/คลัง: 3 แผงแยกกันชัดเจน
    const cx = this.scale.width / 2;
    const panelY = 100;
    const pw = 150, ph = 44, gap = 20;
    const x1 = cx - pw - gap, x2 = cx, x3 = cx + pw + gap;

    const mkPanel = (x, color) =>
      this.add.graphics().fillStyle(0x1e1e3f, 0.9)
        .fillRoundedRect(x - pw / 2, panelY - ph / 2, pw, ph, 10)
        .lineStyle(2, color, 1)
        .strokeRoundedRect(x - pw / 2, panelY - ph / 2, pw, ph, 10);

    mkPanel(x1, 0x564d8a);
    this.add.text(x1, panelY - 14, 'ในมือ', { fontSize: '11px', color: '#aaaacc' }).setOrigin(0.5);
    this.currentText = this.add.text(x1, panelY + 8, '', { fontSize: '17px', color: '#ffffff' }).setOrigin(0.5);

    mkPanel(x2, 0x564d8a);
    this.add.text(x2, panelY - 14, 'ถัดไป', { fontSize: '11px', color: '#aaaacc' }).setOrigin(0.5);
    this.nextText = this.add.text(x2, panelY + 8, '', { fontSize: '17px', color: '#ffffff' }).setOrigin(0.5);

    mkPanel(x3, 0x88aa66);
    this.add.text(x3, panelY - 14, 'คลัง (กดสลับ)', { fontSize: '11px', color: '#aaccaa' }).setOrigin(0.5);
    this.storeText = this.add.text(x3, panelY + 8, '(ว่าง)', { fontSize: '17px', color: '#ffffff' }).setOrigin(0.5);
    // ปุ่มกดโปร่งใสทับแผงคลัง
    this.add.rectangle(x3, panelY, pw, ph, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.swapStore());

    // สร้างเท็กซ์เจอร์ "การ์ดธาตุ" ไล่เฉด + ขอบมน สำหรับแต่ละเทียร์
    TIERS.forEach((tier, i) => {
      const size = CELL - 10;
      const cv = this.textures.createCanvas(`tier${i}`, size, size);
      const c = cv.getContext();
      const hex = '#' + tier.color.toString(16).padStart(6, '0');
      const g = c.createLinearGradient(0, 0, 0, size);
      g.addColorStop(0, shade(hex, 40));
      g.addColorStop(1, shade(hex, -30));
      c.fillStyle = g;
      roundRect(c, 0, 0, size, size, 12);
      c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.5)';
      c.lineWidth = 2;
      roundRect(c, 1, 1, size - 2, size - 2, 12);
      c.stroke();
      cv.refresh();
    });

    // เท็กซ์เจอร์ประกายสำหรับ particle
    const spark = this.textures.createCanvas('spark', 16, 16);
    const sc = spark.getContext();
    const sg = sc.createRadialGradient(8, 8, 0, 8, 8, 8);
    sg.addColorStop(0, 'rgba(255,255,255,1)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    sc.fillStyle = sg;
    sc.fillRect(0, 0, 16, 16);
    spark.refresh();

    this.cells = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const x = OFFSET_X + c * CELL;
        const y = OFFSET_Y + r * CELL;
        this.add.rectangle(x, y + 3, CELL - 6, CELL - 6, 0x000000, 0.35);
        const rect = this.add
          .rectangle(x, y, CELL - 6, CELL - 6, 0x2a2a4a)
          .setStrokeStyle(2, 0x564d8a)
          .setInteractive();
        rect.on('pointerdown', () => this.onCellClick(r, c));
        this.cells.push({ rect, tile: null, tier: null });
      }
    }

    this.renderQueue();
    this.setupCursorItem();
    this.showHelpPopup();
  }

  setupCursorItem() {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) return; // มือถือไม่ต้องแปะไอเท็มบน cursor
    this.cursorItem = this.add.container(0, 0).setDepth(50);
    this.refreshCursorItem();
    this.input.on('pointermove', (p) => {
      this.cursorItem.setPosition(p.x, p.y);
      const left = OFFSET_X - CELL / 2;
      const right = OFFSET_X + (GRID_SIZE - 1) * CELL + CELL / 2;
      const top = OFFSET_Y - CELL / 2;
      const bottom = OFFSET_Y + (GRID_SIZE - 1) * CELL + CELL / 2;
      const overBoard = p.x >= left && p.x <= right && p.y >= top && p.y <= bottom;
      this.game.canvas.style.cursor = overBoard ? 'none' : 'default';
      this.cursorItem.setVisible(overBoard);
    });
  }

  refreshCursorItem() {
    if (!this.cursorItem) return;
    this.cursorItem.removeAll(true);
    const item = this.currentItem;
    if (item === FIRE_ITEM) {
      this.cursorItem.add(this.add.text(0, 0, '🔥', { fontSize: '36px' }).setOrigin(0.5));
    } else if (item !== null) {
      this.cursorItem.add(this.add.image(0, 0, `tier${item}`).setScale(0.8));
      this.cursorItem.add(
        this.add.text(0, 0, TIERS[item].emoji, { fontSize: '24px' }).setOrigin(0.5)
      );
    }
  }

  showHelpPopup() {
    this.inputEnabled = false;

    const w = this.scale.width;
    const h = this.scale.height;
    this.helpOverlay = this.add.container(w / 2, h / 2).setDepth(20);

    this.helpOverlay.add(
      this.add.rectangle(0, 0, w, h, 0x000000, 0.7).setInteractive()
    );
    this.helpOverlay.add(
      this.add
        .graphics()
        .fillStyle(0x1e1e3f, 1)
        .fillRoundedRect(-230, -230, 460, 460, 16)
        .lineStyle(3, 0x6c5ce7, 1)
        .strokeRoundedRect(-230, -230, 460, 460, 16)
    );
    this.helpOverlay.add(
      this.add.text(0, -200, '🧪 วิธีเล่น Alchemy Merge', {
        fontSize: '22px',
        color: '#ffd700',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5)
    );

    const lines = [
      '• คลิกช่องว่างเพื่อวางธาตุจาก "ในมือ"',
      '• ธาตุเหมือนกัน 3 ชิ้นติดกัน → ผสมเป็นธาตุใหม่',
      '  💧→🟤→💩→⛏️→🔮 (คะแนนยิ่งสูงยิ่งได้เยอะ)',
      '• ผสมต่อเนื่องเป็นคอมโบได้ในเทิร์นเดียว',
      '• 🔥 ไฟ: เผาช่องรอบๆ ดิน 🟤 จะกลายเป็น 🌋',
      '• กด "คลัง" เพื่อพักธาตุ 1 ช่อง',
      '• กระดานเต็ม = จบเกม ทำคะแนนให้สูงสุด!',
    ];
    this.helpOverlay.add(
      this.add.text(-200, -150, lines.join('\n'), {
        fontSize: '15px',
        color: '#ffffff',
        lineSpacing: 8,
      })
    );

    const btn = this.add
      .rectangle(0, 190, 180, 48, 0x6c5ce7)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      this.helpOverlay.destroy();
      this.inputEnabled = true;
    });
    this.helpOverlay.add(btn);
    this.helpOverlay.add(
      this.add.text(0, 190, '▶ เริ่มเล่น', { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5)
    );
  }

  itemLabel(item) {
    if (item === null) return '(ว่าง)';
    if (item === FIRE_ITEM) return '🔥 ไฟ';
    return `${TIERS[item].emoji} ${TIERS[item].name}`;
  }

  renderQueue() {
    this.currentText.setText(this.itemLabel(this.currentItem));
    this.nextText.setText(this.itemLabel(this.nextItem));
    this.storeText.setText(this.itemLabel(this.storeItem));
  }

  swapStore() {
    if (this.gameOver || this.inputEnabled === false) return;
    if (this.storeItem === null) {
      // คลังว่าง: ฝากของในมือเข้าคลัง แล้วดึงคิวใหม่มาในมือ
      this.storeItem = this.currentItem;
      this.advanceQueue();
    } else {
      [this.currentItem, this.storeItem] = [this.storeItem, this.currentItem];
      this.renderQueue();
      this.refreshCursorItem();
    }
  }

  onCellClick(row, col) {
    if (this.gameOver || this.inputEnabled === false || this.board[row][col] !== null) return;

    if (this.currentItem === FIRE_ITEM) {
      this.resolveFire(row, col);
    } else {
      this.board[row][col] = this.currentItem;
      this.score += PLACE_SCORE;
      this.runMergeChain(row, col);
    }

    this.advanceQueue();
    this.scoreText.setText(`คะแนน: ${this.score}`);
    this.renderBoard();
    if (this.lastPop) {
      this.popAt(this.lastPop[0], this.lastPop[1]);
      this.lastPop = null;
    } else {
      // วางธรรมดา: เด้งการ์ดใหม่ที่ช่องที่เพิ่งวาง
      this.popAt(row, col);
    }

    if (isFull(this.board)) {
      this.gameOver = true;
      this.add
        .text(this.scale.width / 2, this.scale.height / 2, 'กระดานเต็ม! เกมจบ', {
          fontSize: '40px',
          color: '#ff5555',
          backgroundColor: '#000000aa',
        })
        .setOrigin(0.5)
        .setDepth(10);
    }
  }

  advanceQueue() {
    this.currentItem = this.nextItem;
    this.nextItem = randomItem();
    this.renderQueue();
    this.refreshCursorItem();
  }

  // ไฟ: เผาทำลายช่อง 4 ทิศ (ดิน -> แมกม่า) แล้วไฟหายไป
  resolveFire(row, col) {
    const neighbors = [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1],
    ];
    for (const [r, c] of neighbors) {
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) continue;
      const v = this.board[r][c];
      if (v === null) continue;
      if (v === 1) {
        this.board[r][c] = MAGMA_TIER;
        this.score += MAGMA_BONUS;
        this.burst(r, c, 0xff6b35);
      } else if (v !== MAGMA_TIER) {
        this.board[r][c] = null;
        this.score += 5;
        this.burst(r, c, 0xffa500);
      }
    }
  }

  runMergeChain(row, col) {
    let r = row;
    let c = col;
    for (;;) {
      const result = tryMerge(this.board, r, c, TIERS.length - 2, [MAGMA_TIER]);
      if (!result.merged) break;
      this.score += mergeScore(result.newTier);
      this.burst(r, c, TIERS[result.newTier].color);
      if (!result.upgraded) break;
      [r, c] = result.upgraded;
      this.lastPop = [r, c];
    }
  }

  burst(row, col, color) {
    const x = OFFSET_X + col * CELL;
    const y = OFFSET_Y + row * CELL;
    const p = this.add.particles(x, y, 'spark', {
      speed: { min: 40, max: 160 },
      lifespan: 400,
      quantity: 12,
      tint: color,
      scale: { start: 1, end: 0 },
    });
    this.time.delayedCall(500, () => p.destroy());
  }

  popAt(row, col) {
    // เรียกหลัง renderBoard เพื่อเด้งการ์ดที่เพิ่งสร้าง
    const cell = this.cells[row * GRID_SIZE + col];
    if (!cell.tile) return;
    this.tweens.add({
      targets: cell.tile,
      scale: { from: 0.4, to: 1 },
      duration: 220,
      ease: 'Back.easeOut',
    });
  }

  renderBoard() {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = this.cells[r * GRID_SIZE + c];
        const value = this.board[r][c];
        if (value === null) {
          cell.rect.setFillStyle(0x2a2a4a);
          if (cell.tile) {
            cell.tile.destroy();
            cell.tile = null;
            cell.tier = null;
          }
        } else {
          cell.rect.setFillStyle(0x2a2a4a);
          if (cell.tier !== value) {
            if (cell.tile) cell.tile.destroy();
            const container = this.add.container(cell.rect.x, cell.rect.y);
            container.add(this.add.image(0, 0, `tier${value}`));
            container.add(
              this.add
                .text(0, -4, TIERS[value].emoji, { fontSize: '26px' })
                .setOrigin(0.5)
            );
            container.add(
              this.add
                .text(0, 20, TIERS[value].name, {
                  fontSize: '10px',
                  color: '#ffffff',
                  stroke: '#000000',
                  strokeThickness: 3,
                })
                .setOrigin(0.5)
            );
            cell.tile = container;
            cell.tier = value;
          }
        }
      }
    }
  }
}
