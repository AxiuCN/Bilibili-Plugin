import { onCronTick } from '../components/IncentiveScheduler.js'

/**
 * 激励调度器 — 只注册 1 个定时任务
 * cron: 55 28,58 0,23 * * ?
 * 对应于每天 00:28:55 / 00:58:55 / 23:28:55 / 23:58:55
 */
export class BiliSchedule extends plugin {
  constructor() {
    super({
      name: '[b站插件]调度器',
      dsc: 'B站激励调度器',
      event: 'message',
      priority: 500,
      rule: [],
    })

    this.task = {
      name: 'biliIncentiveSchedule',
      fnc: () => this.tick(),
      cron: '55 28,58 0,23 * * ?',
      log: false,
    }
  }

  async tick() {
    await onCronTick()
  }
}
