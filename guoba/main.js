/**
 * guoba/main.js — 全局开关 + 登录配置
 *
 * 对应 defSet/config.yaml 模板变量:
 *   global_enabled, login_pollTimeout
 */
import path from 'node:path'
import { pluginRoot } from '../components/constants.js'

const configPath = path.join(pluginRoot, 'config', 'config.yaml')
const defaultConfigPath = path.join(pluginRoot, 'defSet', 'config.yaml')

const defaults = {
  global_enabled: 'true',
  login_pollTimeout: '180',
}

export function getSchema() {
  return [
    // ==================== 全局开关 ====================
    { label: '全局设置', component: 'SOFT_GROUP_BEGIN' },
    {
      field: 'global.enabled',
      label: '总开关',
      helpMessage: '关闭后除 #机器人b站登录 / #B站登录 / #B站状态 外所有功能停用',
      bottomHelpMessage: '不影响激励模块的 cron 任务',
      component: 'Switch',
      required: true,
      componentProps: { defaultValue: true },
    },

    // ==================== 登录 ====================
    { label: '登录设置', component: 'SOFT_GROUP_BEGIN' },
    {
      field: 'login.pollTimeout',
      label: '扫码超时（秒）',
      helpMessage: '扫码登录轮询超时时间',
      bottomHelpMessage: '超过此时间未扫码则自动取消，默认 180 秒',
      component: 'InputNumber',
      required: true,
      componentProps: { min: 30, max: 600, defaultValue: 180 },
    },
  ]
}

export function getDefaults() {
  return defaults
}

export { configPath, defaultConfigPath }
