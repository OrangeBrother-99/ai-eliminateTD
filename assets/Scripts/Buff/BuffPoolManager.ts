import { _decorator, Component, NodePool, Prefab, director, Node, UITransform,instantiate, Vec3 } from 'cc';
import { BuffItem } from './BuffItem';
import { BuffData } from './BuffData';
const { ccclass, property } = _decorator;

@ccclass('BuffPoolManager')
export class BuffPoolManager extends Component {

    @property(Prefab)
    buffPrefab: Prefab = null!;

    private _pool: NodePool = new NodePool();
    private _activeBuffs: BuffItem[] = [];
    private readonly MAX_BUFF_COUNT = 14;

    private readonly startX = 25;
    private readonly startY = 25;
    private readonly spacing = 3;

    onLoad() {
        this._pool = new NodePool();
        director.on('BUFF_ADD', this.addBuff, this);
    }

    public addBuff(buffData: BuffData) {
        let node: Node;
        let item: BuffItem;

        if (this._pool.size() > 0) {
            node = this._pool.get();
        } else {
            if (this._activeBuffs.length >= this.MAX_BUFF_COUNT) {
                const oldest = this._activeBuffs.shift()!;
                this.recycleBuff(oldest);
            }
            node = instantiate(this.buffPrefab);
        }

        item = node.getComponent(BuffItem)!;
        item.node.removeFromParent();
        item.init(buffData, this.recycleBuff.bind(this));
        this._activeBuffs.push(item);
        this.node.addChild(item.node);

        this.layoutBuffs(); // ⭐更新显示位置
    }

    private recycleBuff(item: BuffItem) {
        const index = this._activeBuffs.indexOf(item);
        if (index !== -1) {
            this._activeBuffs.splice(index, 1);
        }
        item.reset();
        item.node.removeFromParent();
        this._pool.put(item.node);

        this.layoutBuffs(); // ⭐重新排列
    }

    public preload(count: number) {
        for (let i = 0; i < count; i++) {
            const node = instantiate(this.buffPrefab);
            this._pool.put(node);
        }
    }

    // ⭐ 追加显示方法
    private layoutBuffs() {
        const baseX = this.startX;
        const baseY = this.startY;

        this._activeBuffs.forEach((buff, index) => {
            const width = buff.node.getComponent(UITransform)?.width || 50; // 默认宽度 50
            const posX = baseX + index * (width + this.spacing);
            buff.node.setPosition(new Vec3(posX, baseY, 0));
        });
    }
}
