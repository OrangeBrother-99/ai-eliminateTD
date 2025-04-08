import { _decorator, Component, director, PhysicsSystem2D, Vec2 } from 'cc';
const { ccclass,property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    static instance: GameManager;

    protected onLoad(): void {
        if (GameManager.instance) {
            this.node.destroy();
            return;
        }
        GameManager.instance = this;
        director.addPersistRootNode(this.node);

        // 初始化物理系统（2D）
        // PhysicsSystem2D.instance.enable = true;
        // PhysicsSystem2D.instance.gravity = Vec2.ZERO;
    }


}