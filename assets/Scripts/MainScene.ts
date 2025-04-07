import { _decorator, Component, view, Size, sys } from 'cc';
const { ccclass } = _decorator;

@ccclass('MainScene')
export class MainScene extends Component {
    // 设计分辨率（必须与编辑器设置一致）
    private readonly DESIGN_WIDTH = 720;
    private readonly DESIGN_HEIGHT = 1280;

    protected start(): void {
        this.initScreenAdapter();
    }

    private initScreenAdapter(): void {
        // 核心配置：设置设计分辨率和适配策略
        view.setDesignResolutionSize(
            this.DESIGN_WIDTH,
            this.DESIGN_HEIGHT,
            2
        );

        // 调试输出验证
        console.log('生效分辨率:', view.getDesignResolutionSize());
        console.log('实际屏幕:', view.getVisibleSize());
    }
}