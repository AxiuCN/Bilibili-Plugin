import fs from 'node:fs'
import path from 'node:path'
import YAML from 'yaml'
import { pluginRoot } from './constants.js'

/** 路径常量 */
const globalCfgPath = path.join(pluginRoot, 'config', 'incentive_config.yaml')
const userCfgDir = path.join(pluginRoot, 'config', 'incentive_config')
const whitelistPath = path.join(userCfgDir, 'whitelist.yaml')

// ========== 全局默认配置 ==========

/**
 * 读取全局默认配置
 * @returns {object}
 */
function loadGlobalConfig() {
  try {
    if (!fs.existsSync(globalCfgPath)) return { defaultTrigger: [] }
    return YAML.parse(fs.readFileSync(globalCfgPath, 'utf8')) || { defaultTrigger: [] }
  } catch (e) {
    logger.error('[Bilibili-Plugin] 读取全局激励配置失败:', e)
    return { defaultTrigger: [] }
  }
}

/**
 * 写入全局默认配置
 * @param {object} data
 */
function saveGlobalConfig(data) {
  fs.mkdirSync(path.dirname(globalCfgPath), { recursive: true })
  fs.writeFileSync(globalCfgPath, YAML.stringify(data, null, 2), 'utf8')
}

// ========== 白名单 ==========

/**
 * 读取白名单
 * @returns {{enabled: boolean, users: string[]}}
 */
function loadWhitelist() {
  try {
    if (!fs.existsSync(whitelistPath)) return { enabled: true, users: [] }
    return YAML.parse(fs.readFileSync(whitelistPath, 'utf8')) || { enabled: true, users: [] }
  } catch (e) {
    logger.error('[Bilibili-Plugin] 读取白名单失败:', e)
    return { enabled: true, users: [] }
  }
}

/**
 * 写入白名单
 * @param {{enabled: boolean, users: string[]}} data
 */
function saveWhitelist(data) {
  fs.mkdirSync(path.dirname(whitelistPath), { recursive: true })
  fs.writeFileSync(whitelistPath, YAML.stringify(data, null, 2), 'utf8')
}

/**
 * 检查指定 QQ 是否在白名单中
 * @param {string|number} qq
 * @returns {boolean}
 */
function isWhitelisted(qq) {
  const wl = loadWhitelist()
  if (!wl.enabled) return true
  return wl.users.includes(String(qq))
}

// ========== 个人配置 ==========

/**
 * 个人配置文件名后缀
 */
const USER_CFG_EXT = '.xxx'

/**
 * 获取指定 QQ 的配置文件路径
 * @param {string|number} qq
 * @returns {string}
 */
function userCfgPath(qq) {
  return path.join(userCfgDir, `${qq}${USER_CFG_EXT}`)
}

/**
 * 模板文件路径
 * @returns {string}
 */
function examplePath() {
  return path.join(userCfgDir, `qq${USER_CFG_EXT}.example`)
}

/**
 * 读取指定 QQ 的个人配置
 * @param {string|number} qq
 * @returns {object|null} { triggers: [...], notifyGroup: number } 或 null
 */
function loadUserConfig(qq) {
  try {
    const file = userCfgPath(qq)
    if (!fs.existsSync(file)) return null
    return YAML.parse(fs.readFileSync(file, 'utf8')) || null
  } catch (e) {
    logger.error(`[Bilibili-Plugin] 读取用户 ${qq} 配置失败:`, e)
    return null
  }
}

/**
 * 写入指定 QQ 的个人配置
 * @param {string|number} qq
 * @param {object} data
 */
function saveUserConfig(qq, data) {
  fs.mkdirSync(userCfgDir, { recursive: true })
  fs.writeFileSync(userCfgPath(qq), YAML.stringify(data, null, 2), 'utf8')
}

/**
 * 为指定 QQ 创建默认配置（从全局默认模板复制）
 * @param {string|number} qq
 * @param {number} [notifyGroup]
 * @returns {object} 创建后的配置
 */
function createDefaultUserConfig(qq, notifyGroup = 0) {
  const global = loadGlobalConfig()
  const cfg = {
    triggers: (global.defaultTrigger || []).map(t => ({
      time: t.time,
      links: [],
    })),
    notifyGroup: notifyGroup || 0,
  }
  saveUserConfig(qq, cfg)
  return cfg
}

/**
 * 列出所有有个人配置的 QQ
 * @returns {string[]}
 */
function listUserConfigs() {
  try {
    if (!fs.existsSync(userCfgDir)) return []
    return fs.readdirSync(userCfgDir)
      .filter(f => f.endsWith(USER_CFG_EXT) && !f.startsWith('qq.'))
      .map(f => f.replace(USER_CFG_EXT, ''))
  } catch {
    return []
  }
}

export { loadGlobalConfig, saveGlobalConfig, loadWhitelist, saveWhitelist, isWhitelisted, loadUserConfig, saveUserConfig, createDefaultUserConfig, listUserConfigs, userCfgDir }
