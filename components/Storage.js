import fs from 'node:fs'
import path from 'node:path'
import { pluginData } from './constants.js'

const COOKIE_FILE = path.join(pluginData, 'bilibili_cookie.json')
const LINKS_FILE = path.join(pluginData, 'links.json')

// ========== Cookie 管理 ==========

/**
 * 校验 Cookie 对象是否包含必要字段
 * @param {object} cookies
 * @returns {boolean}
 */
function validateCookies(cookies) {
  if (!cookies || typeof cookies !== 'object') return false
  return !!(cookies.SESSDATA && cookies.bili_jct)
}

/**
 * 从文件加载 Cookie
 * @returns {object|null} cookies 对象，或 null
 */
function loadCookies() {
  try {
    if (!fs.existsSync(COOKIE_FILE)) return null
    const raw = fs.readFileSync(COOKIE_FILE, 'utf8')
    const payload = JSON.parse(raw)
    const cookies = payload?.cookies
    if (!validateCookies(cookies)) return null
    return cookies
  } catch (e) {
    logger.error('[Bilibili-Plugin] 读取Cookie失败:', e)
    return null
  }
}

/**
 * 保存 Cookie 到文件
 * @param {object} cookies
 */
function saveCookies(cookies) {
  if (!validateCookies(cookies)) {
    throw new Error('[Bilibili-Plugin] Cookie 缺少关键字段: SESSDATA 或 bili_jct')
  }
  fs.mkdirSync(pluginData, { recursive: true })
  const payload = {
    saved_at: new Date().toLocaleString('zh-CN', { hour12: false }),
    cookies,
  }
  fs.writeFileSync(COOKIE_FILE, JSON.stringify(payload, null, 2), 'utf8')
  logger.info('[Bilibili-Plugin] Cookie 已保存')
}

/**
 * 删除本地 Cookie 文件
 */
function clearCookies() {
  try {
    if (fs.existsSync(COOKIE_FILE)) fs.unlinkSync(COOKIE_FILE)
  } catch (e) {
    logger.error('[Bilibili-Plugin] 删除Cookie失败:', e)
  }
}

// ========== 活动链接管理 ==========

/**
 * 从文件加载所有链接
 * @returns {Array<{id: number, task_id: string, url: string, added_at: string}>}
 */
function loadLinks() {
  try {
    if (!fs.existsSync(LINKS_FILE)) return []
    const raw = fs.readFileSync(LINKS_FILE, 'utf8')
    const payload = JSON.parse(raw)
    return Array.isArray(payload?.links) ? payload.links : []
  } catch (e) {
    logger.error('[Bilibili-Plugin] 读取链接列表失败:', e)
    return []
  }
}

/**
 * 保存链接列表
 * @param {Array} links
 */
function saveLinks(links) {
  fs.mkdirSync(pluginData, { recursive: true })
  fs.writeFileSync(LINKS_FILE, JSON.stringify({ links }, null, 2), 'utf8')
}

/**
 * 添加一个活动链接
 * @param {{task_id: string, url: string}} item
 * @returns {object} 添加后的链接对象
 */
function addLink(item) {
  const links = loadLinks()
  // 去重：相同 task_id 不重复添加
  if (links.some(l => l.task_id === item.task_id)) {
    return null
  }
  const maxId = links.reduce((max, l) => Math.max(max, l.id || 0), 0)
  const link = {
    id: maxId + 1,
    task_id: item.task_id,
    url: item.url,
    added_at: new Date().toLocaleString('zh-CN', { hour12: false }),
  }
  links.push(link)
  saveLinks(links)
  return link
}

/**
 * 按 id 删除链接
 * @param {number} id
 * @returns {object|null} 被删除的链接对象，或 null
 */
function removeLink(id) {
  const links = loadLinks()
  const index = links.findIndex(l => l.id === id)
  if (index === -1) return null
  const [removed] = links.splice(index, 1)
  saveLinks(links)
  return removed
}

export { loadCookies, saveCookies, clearCookies, validateCookies, loadLinks, addLink, removeLink, COOKIE_FILE, LINKS_FILE }
