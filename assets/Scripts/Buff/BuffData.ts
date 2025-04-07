import { _decorator, Component, Node,Sprite, Label } from 'cc';
const { ccclass, property } = _decorator;
// Buff基础数据类型
// BuffData.ts
export class BuffData {
  public id: number;         // 唯一ID
  public type: string;       // Buff类型（如"ATK_UP"）
  public duration: number;  // 总持续时间
  public remainTime: number;// 剩余时间
  public icon: string;      // 图标资源路径
  public params: any;       // 动态参数（如加成数值）

  constructor(type: string, duration: number, icon: string, params?: any) {
      this.id = Date.now();
      this.type = type;
      this.duration = this.remainTime = duration;
      this.icon = icon;
      this.params = params || {};
  }
}