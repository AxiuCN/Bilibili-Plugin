import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

/**
 * spawn 封装，带超时控制和输出捕获
 * @param {string} command - 可执行文件路径
 * @param {string[]} args - 参数数组
 * @param {object} [opts]
 * @param {number} [opts.timeout] - 超时毫秒数
 * @param {string} [opts.cwd] - 工作目录
 * @param {boolean} [opts.rejectOnNonZero=true] - 非零退出码是否 reject
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
export function runSpawn(command, args = [], opts = {}) {
  const { timeout = 60000, cwd, rejectOnNonZero = true } = opts
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let settled = false

    child.stdout.on('data', chunk => { stdout += chunk.toString() })
    child.stderr.on('data', chunk => { stderr += chunk.toString() })

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        child.kill('SIGTERM')
        const err = new Error(`命令超时 (${timeout}ms): ${command} ${args.join(' ')}`)
        err.stdout = stdout
        err.stderr = stderr
        err.code = null
        reject(err)
      }
    }, timeout)

    child.on('close', code => {
      clearTimeout(timer)
      if (settled) return
      settled = true
      if (code !== 0 && rejectOnNonZero) {
        const err = new Error(`命令退出码 ${code}: ${command} ${args.join(' ')}\n${stderr}`)
        err.stdout = stdout
        err.stderr = stderr
        err.code = code
        reject(err)
      } else {
        resolve({ stdout, stderr: stderr.trimEnd(), code: code || 0 })
      }
    })

    child.on('error', err => {
      clearTimeout(timer)
      if (settled) return
      settled = true
      err.stdout = stdout
      err.stderr = stderr
      reject(err)
    })
  })
}

/**
 * sleep 工具
 * @param {number} ms
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 确保目录存在
 * @param {string} dir
 */
export function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/**
 * 从文本中提取所有 HTTP(S) URL
 * @param {string} text
 * @returns {string[]} 去重后的 URL 列表（按出现顺序）
 */
export function extractUrls(text) {
  if (!text) return []
  const urls = []
  const seen = new Set()
  const re = /https?:\/\/[^\s<>"'，。）】]+/gi
  let m
  while ((m = re.exec(text)) !== null) {
    const u = m[0].replace(/[。,，)）】》>\]】]+$/, '')
    if (!seen.has(u)) {
      seen.add(u)
      urls.push(u)
    }
  }
  return urls
}

/**
 * 文件存在检查（异步）
 * @param {string} p
 * @returns {Promise<boolean>}
 */
export function exists(p) {
  return fs.promises.access(p).then(() => true).catch(() => false)
}

/**
 * 同步文件存在检查
 * @param {string} p
 * @returns {boolean}
 */
export function existsSync(p) {
  return fs.existsSync(p)
}
