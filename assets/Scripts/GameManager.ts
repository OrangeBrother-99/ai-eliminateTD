import { _decorator, Component, director, PhysicsSystem2D, Vec2, resources, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

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
        // 在游戏启动场景（如Loading场景）执行预加载
        // resources.preloadDir("Eliminat/", SpriteFrame,
        //      (completed, total) => {
        //     console.log(`预加载进度: ${completed}/${total}`);
        // });
    }


}