import { _decorator, Component, Prefab, instantiate, Node, Vec3, tween, math, CCInteger, BoxCollider2D } from 'cc';
import { Block } from './Block';

const { ccclass, property } = _decorator;

@ccclass('GridManager')
export class GridManager extends Component {
    @property({ type: Prefab }) blockPrefab: Prefab | null = null;
    @property({ type: CCInteger }) matchMinCount: number = 3;

    private grid: (Block | null)[][] = [];
    private blockPool: Node[] = [];
    private isProcessing: boolean = false;
    private selectedBlock: Block | null = null;
    static instance: GridManager;

    protected onLoad(): void {
        GridManager.instance = this;
        this.grid = Array.from({ length: Block.COLUMNS }, () => Array(Block.ROWS).fill(null));
        this.initGrid();
    }

    private initGrid(): void {
        for (let col = 0; col < Block.COLUMNS; col++) {
            for (let row = 0; row < Block.ROWS; row++) {
                this.createBlock(col, row);
            }
        }
    }

    private createBlock(col: number, row: number): void {
        if (!this.blockPrefab) return;

        const block = this.blockPool.pop() || instantiate(this.blockPrefab);
        block.setPosition(new Vec3(col * Block.SIZE, row * Block.SIZE, 0));
        block.parent = this.node;
        this.setupBlock(block, col, row);
    }

    private setupBlock(block: Node, col: number, row: number): void {
        const blockComp = block.getComponent(Block)!;
        block.active = true;
        blockComp.type = math.randomRangeInt(0, 5);
        this.grid[col][row] = blockComp;
        block.getComponent(BoxCollider2D)?.apply();
        block.on('block-touched', this.onBlockTouched, this);
    }

    private onBlockTouched(block: Block): void {
        if (this.isProcessing || !block.node.isValid) return;

        if (!this.selectedBlock) {
            this.selectedBlock = block;
            this.scaleBlock(block, 1.5);
            return;
        }

        const otherBlock = this.selectedBlock;
        this.selectedBlock = null;

        if (!this.areAdjacent(block, otherBlock)) {
            this.scaleBlock(otherBlock, 1);
            this.scaleBlock(block, 1);
            return;
        }

        if (!this.canSwap(block, otherBlock)) {
            this.scaleBlock(block, 1);
            this.scaleBlock(otherBlock, 1);
            return;
        }

        this.swapBlocks(block, otherBlock);
        this.scaleBlock(block, 1);
        this.scaleBlock(otherBlock, 1);
    }

    private areAdjacent(a: Block, b: Block): boolean {
        const dx = Math.abs(a.gridPosition.x - b.gridPosition.x);
        const dy = Math.abs(a.gridPosition.y - b.gridPosition.y);
        return (dx + dy === 1);
    }

    private scaleBlock(block: Block, scaleFactor: number): void {
        tween(block.node).to(0.1, { scale: new Vec3(scaleFactor, scaleFactor, 1) }).start();
    }

    private swapBlocks(a: Block, b: Block): void {
        this.isProcessing = true;

        const posA = a.gridPosition;
        const posB = b.gridPosition;

        this.grid[posA.x][posA.y] = b;
        this.grid[posB.x][posB.y] = a;

        const tempPos = a.node.position;
        tween(a.node).to(0.2, { position: b.node.position }).start();
        tween(b.node)
            .to(0.2, { position: tempPos })
            .call(() => {
                const area = this.getSurroundingPositions(posA, 2).concat(this.getSurroundingPositions(posB, 2));
                this.checkMatches(area);
                this.isProcessing = false;
            })
            .start();
    }

    private canSwap(a: Block, b: Block): boolean {
        const posA = a.gridPosition;
        const posB = b.gridPosition;

        this.grid[posA.x][posA.y] = b;
        this.grid[posB.x][posB.y] = a;

        const matches = new Set<Block>();
        this.checkChain(posA.x, posA.y, matches);
        this.checkChain(posB.x, posB.y, matches);

        this.grid[posA.x][posA.y] = a;
        this.grid[posB.x][posB.y] = b;

        return matches.size > 0;
    }

    private checkMatches(positions: { x: number, y: number }[]): void {
        const matches = new Set<Block>();
        positions.forEach(({ x, y }) => this.checkChain(x, y, matches));

        if (matches.size > 0) {
            const score = this.calculateScore(matches.size);
            this.emitScoreEvent(score);
            this.clearMatches(matches);
        }
    }

    private getSurroundingPositions(center: { x: number, y: number }, radius: number): { x: number, y: number }[] {
        const positions: { x: number, y: number }[] = [];
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                const x = center.x + dx;
                const y = center.y + dy;
                if (x >= 0 && x < Block.COLUMNS && y >= 0 && y < Block.ROWS) {
                    positions.push({ x, y });
                }
            }
        }
        return positions;
    }

    private checkChain(col: number, row: number, matches: Set<Block>): void {
        const center = this.grid[col][row];
        if (!center) return;

        const horizontal = this.getLineMatches(col, row, 1, 0).concat(center, this.getLineMatches(col, row, -1, 0));
        const vertical = this.getLineMatches(col, row, 0, 1).concat(center, this.getLineMatches(col, row, 0, -1));

        if (horizontal.length >= this.matchMinCount) horizontal.forEach(b => matches.add(b));
        if (vertical.length >= this.matchMinCount) vertical.forEach(b => matches.add(b));
    }

    private getLineMatches(col: number, row: number, dCol: number, dRow: number): Block[] {
        const type = this.grid[col][row]?.type;
        const matched: Block[] = [];

        let x = col + dCol;
        let y = row + dRow;

        while (x >= 0 && x < Block.COLUMNS && y >= 0 && y < Block.ROWS) {
            const block = this.grid[x][y];
            if (!block || block.type !== type) break;
            matched.push(block);
            x += dCol;
            y += dRow;
        }

        return matched;
    }

    private clearMatches(matches: Set<Block>): void {
        const affected = new Set<{ x: number, y: number }>();

        matches.forEach(block => {
            const pos = block.gridPosition;
            this.grid[pos.x][pos.y] = null;
            block.node.active = false;
            this.blockPool.push(block.node);
            affected.add(pos);
        });

        this.scheduleOnce(() => {
            this.dropBlocks(affected);
        }, 0.1);
    }

    private dropBlocks(affectedPositions: Set<{ x: number, y: number }>): void {
        const refillNeeded: { x: number, y: number }[] = [];

        affectedPositions.forEach(({ x: col }) => {
            let writeRow = 0;
            for (let readRow = 0; readRow < Block.ROWS; readRow++) {
                const block = this.grid[col][readRow];
                if (block) {
                    if (writeRow !== readRow) {
                        this.grid[col][writeRow] = block;
                        this.grid[col][readRow] = null;
                        tween(block.node).to(0.3, {
                            position: new Vec3(col * Block.SIZE, writeRow * Block.SIZE, 0)
                        }).start();
                    }
                    writeRow++;
                }
            }
            for (let row = writeRow; row < Block.ROWS; row++) {
                this.grid[col][row] = null;
                refillNeeded.push({ x: col, y: row });
            }
        });

        this.scheduleOnce(() => {
            this.refillGrid(refillNeeded);
        }, 0.35);
    }

    private refillGrid(positions: { x: number, y: number }[]): void {
        positions.forEach(({ x: col, y: row }) => {
            const block = instantiate(this.blockPrefab!);
            block.setPosition(new Vec3(col * Block.SIZE, (Block.ROWS + 1) * Block.SIZE, 0));
            block.parent = this.node;

            tween(block).to(0.3, { position: new Vec3(col * Block.SIZE, row * Block.SIZE, 0) })
                .call(() => {
                    this.setupBlock(block, col, row);
                    const area = this.getSurroundingPositions({ x: col, y: row }, 2);
                    this.checkMatches(area);
                })
                .start();
        });
    }

    private calculateScore(matchCount: number): number {
        const comboFactor = Math.floor(matchCount / this.matchMinCount);
        return comboFactor * 50 + matchCount * 10; // 连击奖励机制
    }

    private emitScoreEvent(score: number): void {
        this.node.emit('scoreChanged', score);
    }
}