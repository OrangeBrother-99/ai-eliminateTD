import { _decorator, Component, Label, director } from 'cc';
const { ccclass, property } = _decorator;
import { GridManager } from './GridManager';

@ccclass('TopUIManenger')
export class TopUIManenger extends Component {
    @property(Label)
    scoreLabel: Label | null = null;

    @property(Label)
    timerLabel: Label | null = null;

    private totalScore = 0;
    private elapsedTime = 0;  // 累计秒数
    private isPaused = false;  // 暂停状态

    start() {
        // 初始化事件监听
        GridManager.instance.node.on('scoreChanged', this.onScoreChanged, this);
        director.getScene()!.on('game-pause', this.onPause, this);
        director.getScene()!.on('game-resume', this.onResume, this);

        // 启动计时器（3.8.1 推荐使用箭头函数）
        this.schedule(() => this.updateTimer(), 1, Infinity, 0);
    }

    // 计时器更新方法（每秒触发）
    private updateTimer() {
        if (this.isPaused) return;

        this.elapsedTime++;
        if (this.timerLabel) {
            this.timerLabel.string = `${this.elapsedTime}s`; // 123s 格式
        }
    }

    // 暂停事件回调
    private onPause() {
        this.isPaused = true;
        this.unschedule(this.updateTimer); // 停止计时器
    }

    // 恢复事件回调
    private onResume() {
        this.isPaused = false;
        this.schedule(() => this.updateTimer(), 1, Infinity, 0); // 重启计时器
    }

    // 分数更新回调
    private onScoreChanged(score: number) {
        this.totalScore += score;
        if (this.scoreLabel) {
            this.scoreLabel.string = `总得分: ${this.totalScore}`;
        }
    }

    onDestroy() {
        // 清理事件监听
        GridManager.instance.node.off('scoreChanged', this.onScoreChanged, this);
        director.getScene()!.off('game-pause', this.onPause, this);
        director.getScene()!.off('game-resume', this.onResume, this);
        
        // 停止所有计时器
        this.unscheduleAllCallbacks();
    }
}