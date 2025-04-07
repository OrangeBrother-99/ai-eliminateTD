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

    protected onLoad(): void {
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
        if (this.blockPrefab === null) {
            return;
        }
        const block = this.blockPool.pop() || instantiate(this.blockPrefab!);
        block.setPosition(new Vec3(col * Block.SIZE, row * Block.SIZE, 0));
        block.parent = this.node;
        this.setupBlock(block, col, row);
    }


    private onBlockTouched(block: Block): void {
        console.log('[点击] 方块:', block.gridPosition);
        this.scaleBlock(block, 1.5);

        if (this.isProcessing || !block.node.isValid) {
            console.log('[跳过] 当前正忙或方块无效');
            return;
        }

        if (!this.selectedBlock) {
            this.selectedBlock = block;
            console.log('[选中第一个] ', block.gridPosition);
            return;
        }

        // 第二次点击（尝试交换）
        const otherBlock = this.selectedBlock;
        this.selectedBlock = null;


        if (!this.areAdjacent(block, otherBlock)) {
            console.log('[非相邻] 取消选择');
            this.scaleBlock(otherBlock, 1);
            this.scaleBlock(block, 1);
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

    private clearMatches(matches: Set<Block>): void {
        console.log(`[GridManager] clearMatches: clearing ${matches.size} blocks`);

        const affectedPositions = new Set<{ x: number, y: number }>();

        matches.forEach(block => {
            const pos = block.gridPosition;
            console.log(`  -> Clearing block at (${pos.x}, ${pos.y}), type: ${block.type}`);

            this.grid[pos.x][pos.y] = null;
            block.node.active = false;
            this.blockPool.push(block.node);
            affectedPositions.add(pos);
        });

        this.dropBlocks(affectedPositions);
        this.refillGrid(Array.from(affectedPositions));
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
                        //  block.gridPosition = { x: col, y: writeRow }; // 可选：如果你手动维护
                        tween(block.node)
                            .to(0.3, { position: new Vec3(col * Block.SIZE, writeRow * Block.SIZE, 0) })
                            .start();
                    }
                    writeRow++;
                }
            }

            // 添加空位信息用于 refill
            for (let row = writeRow; row < Block.ROWS; row++) {
                this.grid[col][row] = null;
                refillNeeded.push({ x: col, y: row });
            }
        });

        this.scheduleOnce(() => {
            this.refillGrid(refillNeeded);
        }, 0.5); // 给动画留一点时间
    }

    private setupBlock(block: Node, col: number, row: number): void {
        const blockComp = block.getComponent(Block)!;
        block.active = true;
        blockComp.type = math.randomRangeInt(0, 5);  // 随机生成方块类型
        this.grid[col][row] = blockComp;
        block.getComponent(BoxCollider2D)?.apply();
        block.on('block-touched', this.onBlockTouched, this);
    
        console.log(`[GridManager] setupBlock: (${col}, ${row}) - Type ${blockComp.type}`);
    }
    

    private refillGrid(affectedPositions: { x: number, y: number }[]): void {
        affectedPositions.forEach(({ x: col, y: row }) => {
            if (!this.grid[col][row]) {
                this.createNewBlock(col, row);
            }
        });
        for (let col = 0; col < Block.COLUMNS; col++) {
            for (let row = 0; row < Block.ROWS; row++) {
                if (!this.grid[col][row]) {
                    this.createNewBlock(col, row);
                }
            }
        }
    }

    private createNewBlock(col: number, row: number): void {
        const block = instantiate(this.blockPrefab!);
        block.setPosition(new Vec3(col * Block.SIZE, (Block.ROWS + 1) * Block.SIZE, 0));
        block.parent = this.node;

        tween(block)
            .to(0.4, { position: new Vec3(col * Block.SIZE, row * Block.SIZE, 0) })
            .call(() => {
                this.setupBlock(block, col, row);
                this.checkMatches([{ x: col, y: row }]);  // 检查刚刚下落的方块

            })
            .start();
    }
    // 放大或缩小方块
    private scaleBlock(block: Block, scaleFactor: number): void {
        tween(block.node)
            .to(0.1, { scale: new Vec3(scaleFactor, scaleFactor, 1) })
            .start();
    }
    private checkMatches(positions: { x: number, y: number }[]): void {
        console.log(`[GridManager] checkMatches: ${positions.map(p => `(${p.x}, ${p.y})`).join(', ')}`);

        const matches = new Set<Block>();
        positions.forEach(({ x: col, y: row }) => {
            this.checkChain(col, row, matches);
        });

        if (matches.size > 0) {
            console.log(`[GridManager] Matches found: ${matches.size}`);

            this.clearMatches(matches);
        } else {
            console.log(`[GridManager] No matches found`);
        }
    }

    private checkChain(col: number, row: number, matches: Set<Block>): void {
        if (col < 0 || col >= Block.COLUMNS || row < 0 || row >= Block.ROWS) return;

        const centerBlock = this.grid[col][row];
        if (!centerBlock) return;

        const horizontal = this.getLineMatches(col, row, 1, 0).concat(centerBlock, this.getLineMatches(col, row, -1, 0));
        const vertical = this.getLineMatches(col, row, 0, 1).concat(centerBlock, this.getLineMatches(col, row, 0, -1));

        if (horizontal.length >= this.matchMinCount) {
            horizontal.forEach(b => matches.add(b));
        }
        if (vertical.length >= this.matchMinCount) {
            vertical.forEach(b => matches.add(b));
        }
    }

    private getLineMatches(col: number, row: number, dCol: number, dRow: number): Block[] {
        const type = this.grid[col][row]?.type;
        const matched: Block[] = [];

        let x = col + dCol;
        let y = row + dRow;

        while (x >= 0 && x < Block.COLUMNS && y >= 0 && y < Block.ROWS) {
            const b = this.grid[x][y];
            if (!b || b.type !== type) break;
            matched.push(b);
            x += dCol;
            y += dRow;
        }

        return matched;
    }
    private async swapBlocks(a: Block, b: Block): Promise<void> {
        console.log(`尝试交换方块: [${a.gridPosition.x}, ${a.gridPosition.y}] <-> [${b.gridPosition.x}, ${b.gridPosition.y}]`);
    
        // 检查交换是否会导致匹配
        if (!this.canSwap(a, b)) {
            console.log("[取消交换] 交换后没有匹配");
            this.scaleBlock(a, 1);
            this.scaleBlock(b, 1);
            return;
        }
    
        this.isProcessing = true;
    
        // 交换网格中的位置
        const posA = a.gridPosition;
        const posB = b.gridPosition;
    
        // 在 grid 中交换位置
        this.grid[posA.x][posA.y] = b;
        this.grid[posB.x][posB.y] = a;
    
        // 交换方块的位置
        const tempPos = { ...a.node.position };
        a.node.position = b.node.position;
        b.node.position = tempPos;
    
        // 执行动画
        tween(a.node).to(0.2, { position: new Vec3(posB.x * Block.SIZE, posB.y * Block.SIZE, 0) }).start();
        tween(b.node)
            .to(0.2, { position: new Vec3(posA.x * Block.SIZE, posA.y * Block.SIZE, 0) })
            .call(() => {
                // 交换后检查是否有匹配
                this.checkMatches([posA, posB]);
    
                this.isProcessing = false;
            })
            .start();
    }
    

    // 检查是否可以交换方块（即交换后是否会产生匹配）
    private canSwap(a: Block, b: Block): boolean {
        const posA = a.gridPosition;
        const posB = b.gridPosition;
    
        // 临时交换方块位置
        this.grid[posA.x][posA.y] = b;
        this.grid[posB.x][posB.y] = a;
    
        // 检查是否有匹配
        const matches = new Set<Block>();
        this.checkChain(posA.x, posA.y, matches);
        this.checkChain(posB.x, posB.y, matches);
    
        // 还原交换
        this.grid[posA.x][posA.y] = a;
        this.grid[posB.x][posB.y] = b;
    
        return matches.size > 0;  // 只有在有匹配时才允许交换
    }
    


}
