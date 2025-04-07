import { _decorator, Component, director, PhysicsSystem2D, Vec2 } from 'cc';
const { ccclass,property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    static instance: GameManager;
    private _score: number = 0;

    protected onLoad(): void {
        if (GameManager.instance) {
            this.node.destroy();
            return;
        }
        GameManager.instance = this;
        director.addPersistRootNode(this.node);

        // 初始化物理系统（2D）
        PhysicsSystem2D.instance.enable = true;
        PhysicsSystem2D.instance.gravity = Vec2.ZERO;
    }

    // 分数操作（后续步骤扩展）
    // 添加分数并触发事件
    public addScore(value: number): void {
      this._score += value;
      this.node.emit('score-updated', this._score);
  }
}