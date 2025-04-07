import { _decorator, Component, Node, RigidBody2D, Vec2, Vec3, input, Input, EventTouch, math, Sprite, Color, ERigidBody2DType, BoxCollider2D } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Block')
export class Block extends Component {
    // 静态配置参数（与GridManager共享）
    public static readonly COLUMNS = 9;  // 列数
    public static readonly ROWS = 10;    // 行数
    public static readonly SIZE = 80;    // 方块尺寸

    @property({ type: [Color] })
    public typeColors: Color[] = [      // 类型颜色配置
        Color.RED,
        Color.BLUE,
        Color.GREEN,
        Color.YELLOW,
        Color.MAGENTA
    ];

    @property({ type: Sprite })
    public blockSprite: Sprite = null!; // 精灵组件引用

    private _type: number = 0;

    // 方块类型（动态更新颜色）
    public get type(): number {
        return this._type;
    }
    public set type(value: number) {
        this._type = math.clamp(value, 0, this.typeColors.length - 1);
        this.updateColor();
    }

    protected onLoad(): void {
        this.initPhysics();
        this.initTouch();
    }

    // 初始化物理组件（适配锚点0,0）
    private initPhysics(): void {
        const rigidBody = this.node.addComponent(RigidBody2D);
        rigidBody.type = ERigidBody2DType.Static;

        const collider = this.node.addComponent(BoxCollider2D);
        collider.offset = new Vec2(Block.SIZE / 2, Block.SIZE / 2); // 锚点偏移修正
        collider.size = math.size(Block.SIZE, Block.SIZE);
        collider.apply();
    }

    // 初始化触摸检测（精确锚点坐标系）
    private initTouch(): void {
        this.node.on(Input.EventType.TOUCH_START, (event: EventTouch) => {
            // console.info(`Block ${this.node.name} touched`);
            const touchPos = event.getUILocation();
            const nodePos = this.node.position;

            // 转换为本地坐标（基于锚点0,0）
            const localPos = new Vec3(
                touchPos.x - nodePos.x,
                touchPos.y - nodePos.y,
                0
            );

            // 碰撞检测（0-80范围内有效）
            if (localPos.x >= 0 && localPos.x <= Block.SIZE &&
                localPos.y >= 0 && localPos.y <= Block.SIZE) {
                this.onBlockTouched();
            }
        }, this);
    }

    // 更新方块颜色
    private updateColor(): void {
        // console.info(`Block ${this.node.name} type changed to ${this._type}`);
        this.node.getComponent(Sprite)!.color = this.typeColors[ this._type ];
    }

    // 触摸事件回调
    private onBlockTouched(): void {
        this.node.emit('block-touched', this);
    }

    
    // 获取网格坐标（供GridManager使用）
    public get gridPosition(): Vec3 {
        return new Vec3(
            this.node.position.x / Block.SIZE,
            this.node.position.y / Block.SIZE,
            0
        );
    }

    // 销毁时清理监听
    protected onDestroy(): void {
        input.off(Input.EventType.TOUCH_START, this.onBlockTouched, this);
    }
}