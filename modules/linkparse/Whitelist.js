import fs from 'node:fs'
import path from 'node:path'
import YAML from 'yaml'
import { pluginRoot } from '../../components/constants.js'

/** 路径常量 */
const whitelistDir = path.join(pluginRoot, 'config', 'linkparse_config')
const whitelistPath = path.join(whitelistDir, 'whitelist.yaml')
const whitelistTemplate = path.join(pluginRoot, 'defSet', 'linkparse_config', 'whitelist.yaml')

/**
 * 读取群白名单（文件不存在时从模板创建）
 * @returns {{enabled: boolean, groups: string[]}}
 */
function loadWhitelist() {
  try {
    if (!fs.existsSync(whitelistPath)) {
      return createDefaultWhitelist()
    }
    return YAML.parse(fs.readFileSync(whitelistPath, 'utf8')) || { enabled: false, groups: [] }
  } catch (e) {
    logger?.error('[LinkFlow] 读取链接解析白名单失败:', e)
    return { enabled: false, groups: [] }
  }
}

/**
 * 从模板创建默认白名单文件（保留注释）
 * @returns {{enabled: boolean, groups: string[]}}
 */
function createDefaultWhitelist() {
  let content = 'enabled: false\ngroups: []\n'
  try {
    if (fs.existsSync(whitelistTemplate)) {
      content = fs.readFileSync(whitelistTemplate, 'utf8')
    }
  } catch (e) {
    logger?.warn('[LinkFlow] 读取群白名单模板失败，使用默认:', e)
  }
  content = renderTemplate(content, { linkparse_whitelist_enabled: 'false' })
  fs.mkdirSync(path.dirname(whitelistPath), { recursive: true })
  fs.writeFileSync(whitelistPath, content, 'utf8')
  return YAML.parse(content) || { enabled: false, groups: [] }
}

/**
 * 写入白名单（文本级更新，保留注释）
 * 空列表用 inline groups: []，有内容用 block 格式
 * @param {{enabled: boolean, groups: string[]}} data
 */
function saveWhitelist(data) {
  const filePath = whitelistPath
  fs.mkdirSync(path.dirname(filePath), { recursive: true })

  try {
    if (!fs.existsSync(filePath)) {
      createDefaultWhitelist()
    }

    let content = fs.readFileSync(filePath, 'utf8')
    const lines = content.split('\n')
    let groupsLineIdx = -1

    for (let i = 0; i < lines.length; i++) {
      if (/^enabled:/i.test(lines[i]) && !lines[i].trim().startsWith('#')) {
        const indent = lines[i].match(/^(\s*)/)[1]
        lines[i] = `${indent}enabled: ${data.enabled !== false}`
      }
      if (/^groups:/i.test(lines[i]) && !lines[i].trim().startsWith('#')) {
        groupsLineIdx = i
      }
    }

    // 跳过旧列表项（以 - 开头的行，以及紧接 groups: 后面的纯空行/注释行）
    let restStart = groupsLineIdx >= 0 ? groupsLineIdx + 1 : lines.length
    while (restStart < lines.length) {
      const t = lines[restStart].trim()
      if (t === '' || t.startsWith('-')) {
        restStart++
      } else {
        break
      }
    }

    const before = groupsLineIdx >= 0 ? lines.slice(0, groupsLineIdx) : lines
    const rest = lines.slice(restStart)
    const groups = data.groups || []

    const result = groups.length === 0
      // 空列表用 inline 格式，避免 yaml 歧义
      ? [...before, 'groups: []', ...rest]
      // 有内容用 block 格式
      : [...before, 'groups:', ...groups.map(g => `  - '${g}'`), ...rest]

    fs.writeFileSync(filePath, result.join('\n'), 'utf8')
  } catch (e) {
    logger?.warn('[LinkFlow] 文本更新群白名单失败，使用 YAML 回退:', e)
    fs.writeFileSync(filePath, YAML.stringify({
      enabled: data.enabled !== false,
      groups: data.groups || [],
    }, null, 2), 'utf8')
  }
}

/**
 * 检查指定群是否允许解析/下载
 * enabled=false → 不限制，所有群可用
 * enabled=true → 仅 groups 中的群可用
 * @param {string|number} groupId
 * @returns {boolean}
 */
function isGroupAllowed(groupId) {
  const wl = loadWhitelist()
  if (!wl.enabled) return true
  return (wl.groups || []).includes(String(groupId))
}

/**
 * 添加群到白名单
 * @param {string|number} groupId
 */
function addGroup(groupId) {
  const wl = loadWhitelist()
  const gid = String(groupId)
  if (!wl.groups.includes(gid)) {
    wl.groups.push(gid)
    saveWhitelist(wl)
  }
}

/**
 * 从白名单移除群
 * @param {string|number} groupId
 */
function removeGroup(groupId) {
  const wl = loadWhitelist()
  wl.groups = wl.groups.filter(g => g !== String(groupId))
  saveWhitelist(wl)
}

/**
 * 获取白名单中的群列表
 * @returns {string[]}
 */
function getGroupList() {
  return loadWhitelist().groups || []
}

/**
 * 模板变量替换，保留注释
 * @param {string} template
 * @param {object} values
 * @returns {string}
 */
function renderTemplate(template, values) {
  return template.replace(/\${(\w+)}/g, (_, name) =>
    values[name] !== undefined ? String(values[name]) : '',
  )
}

export { loadWhitelist, saveWhitelist, isGroupAllowed, addGroup, removeGroup, getGroupList, whitelistPath }
