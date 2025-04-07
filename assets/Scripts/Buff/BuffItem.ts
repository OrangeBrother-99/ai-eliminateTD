

// BuffItem.ts
import { _decorator, Component, Sprite, Label, ProgressBar, Material,resources ,SpriteFrame} from 'cc';
import { BuffData } from './BuffData';
const { ccclass, property } = _decorator;

@ccclass('BuffItem')
export class BuffItem extends Component {

    @property(Sprite)
    iconSprite: Sprite = null!;      // Buff图标

    @property(ProgressBar)
    progressBar: ProgressBar = null!; // 圆形进度条

    @property(Label)
    timeLabel: Label = null!;         // 剩余时间文本

    private _buffData: BuffData;
    private _onRecycle: (item: BuffItem) => void = null!;

    // 初始化Buff
    public init(buffData: BuffData, onRecycle: (item: BuffItem) => void) {
        this._buffData = buffData;
        this._onRecycle = onRecycle;

        // 加载图标（假设使用resources目录）
        resources.load(buffData.icon, (err, asset) => {
            if (asset) this.iconSprite.spriteFrame = asset as SpriteFrame;
        });

        // 初始化进度条
        this.progressBar.progress = 1;
        this.timeLabel.string = buffData.remainTime.toFixed(1);

        // 应用特效材质（示例：灰度材质）
        const mat = this.iconSprite.getSharedMaterial(0);
        if (mat) mat.setProperty('grayscale', 0);
    }

    // 每帧更新
    update(dt: number) {
        if (!this._buffData) return;

        // 更新剩余时间
        this._buffData.remainTime -= dt;
        this.progressBar.progress = this._buffData.remainTime / this._buffData.duration;
        this.timeLabel.string = this._buffData.remainTime.toFixed(1);

        // 时间归零时回收
        if (this._buffData.remainTime <= 0) {
            this._onRecycle(this);
        }
    }

    // 重置状态
    public reset() {
        this._buffData = null!;
        this.progressBar.progress = 1;
        this.timeLabel.string = '';
        this.node.removeFromParent();
    }
}