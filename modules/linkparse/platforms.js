/**
 * 10 平台 URL 模式定义 + 链接提取
 *
 * 每个平台定义：
 *  - name: 显示名
 *  - key:  配置键名（如 bilibili, douyin）
 *  - hosts: 域名列表
 *  - patterns: 正则数组，匹配该平台的有效 URL 路径
 *  - match(pathname): 返回 true 表示该 URL 可能属于该平台
 */

const PLATFORM_DEFS = [
  {
    name: 'B站',
    key: 'bilibili',
    hosts: ['bilibili.com', 'www.bilibili.com', 'b23.tv', 't.bilibili.com', 'space.bilibili.com', 'live.bilibili.com'],
    patterns: [
      /\/video\/(BV[\w]+|av\d+)/i,
      /\/bangumi\/play\/(ss|ep)\d+/i,
      /\/blackboard\/[\w-]+\.html/i,
      /b23\.tv\/[\w]+/i,
      /t\.bilibili\.com\/\d+/i,
      /space\.bilibili\.com\/\d+/i,
      /live\.bilibili\.com\/\d+/i,
    ],
  },
  {
    name: '抖音',
    key: 'douyin',
    hosts: ['douyin.com', 'www.douyin.com', 'v.douyin.com', 'iesdouyin.com'],
    patterns: [
      /\/video\/\d+/i,
      /\/note\/\d+/i,
      /\/user\/[\w-]+/i,
      /v\.douyin\.com\/[\w]+\/?/i,
    ],
  },
  {
    name: 'TikTok',
    key: 'tiktok',
    hosts: ['tiktok.com', 'www.tiktok.com', 'vt.tiktok.com', 'vm.tiktok.com'],
    patterns: [
      /\/@[\w.-]+\/video\/\d+/i,
      /\/[\w]+\/?/i,  // 短链接
    ],
  },
  {
    name: '快手',
    key: 'kuaishou',
    hosts: ['kuaishou.com', 'www.kuaishou.com', 'v.kuaishou.com'],
    patterns: [
      /\/short-video\/[\w]+/i,
      /\/fw\/video\/[\w]+/i,
      /v\.kuaishou\.com\/[\w]+\/?/i,
    ],
  },
  {
    name: '微博',
    key: 'weibo',
    hosts: ['weibo.com', 'www.weibo.com', 'm.weibo.cn', 'weibo.cn'],
    patterns: [
      /\/\d+\/[\w]+/i,
      /\/detail\/[\w]+/i,
      /\/status\/[\w]+/i,
    ],
  },
  {
    name: '小红书',
    key: 'xiaohongshu',
    hosts: ['xiaohongshu.com', 'www.xiaohongshu.com', 'xhslink.com'],
    patterns: [
      /\/explore\/[\w]+/i,
      /\/discovery\/item\/[\w]+/i,
      /xhslink\.com\/[\w]+/i,
    ],
  },
  {
    name: '闲鱼',
    key: 'xianyu',
    hosts: ['goofish.com', 'www.goofish.com', '2.taobao.com'],
    patterns: [
      /\/item\?/i,
      /\/item\.htm/i,
    ],
  },
  {
    name: '头条',
    key: 'toutiao',
    hosts: ['toutiao.com', 'www.toutiao.com', 'm.toutiao.com'],
    patterns: [
      /\/item\/\d+/i,
      /\/article\/\d+/i,
      /\/video\/\d+/i,
    ],
  },
  {
    name: '小黑盒',
    key: 'xiaoheihe',
    hosts: ['xiaoheihe.cn', 'www.xiaoheihe.cn', 'api.xiaoheihe.cn'],
    patterns: [
      /\/app\/community\/[\w-]+\/post\/\d+/i,
      /\/app\/user\/post\/\d+/i,
    ],
  },
  {
    name: 'Twitter',
    key: 'twitter',
    hosts: ['twitter.com', 'www.twitter.com', 'x.com', 't.co'],
    patterns: [
      /\/\w+\/status\/\d+/i,
      /t\.co\/[\w]+\/?/i,
    ],
  },
]

/**
 * 根据 URL 匹配平台定义
 * @param {string} url
 * @returns {{ name: string, key: string }|null}
 */
function matchPlatform(url) {
  let parsed
  try { parsed = new URL(url) } catch { return null }

  // B站特殊处理：av号/BV号/b23短链 可能在文本中而不是 URL host 中
  // 但这里只处理 URL，独立 ID 由 resolvers.js 处理

  const hostname = parsed.hostname.toLowerCase().replace('www.', '')

  for (const def of PLATFORM_DEFS) {
    const matchedHost = def.hosts.some(h => {
      const hClean = h.toLowerCase().replace('www.', '')
      return hostname === hClean || hostname.endsWith('.' + hClean)
    })
    if (!matchedHost) continue

    const pathAndHost = parsed.hostname + parsed.pathname
    for (const pat of def.patterns) {
      if (pat.test(pathAndHost)) {
        return { name: def.name, key: def.key }
      }
    }
  }

  // 宽松匹配：只匹配域名
  for (const def of PLATFORM_DEFS) {
    const matchedHost = def.hosts.some(h => {
      const hClean = h.toLowerCase().replace('www.', '')
      return hostname === hClean || hostname.endsWith('.' + hClean)
    })
    if (matchedHost) return { name: def.name, key: def.key }
  }

  return null
}

/**
 * 从文本中提取平台 URL
 * @param {string} text
 * @returns {Array<{url: string, platform: {name: string, key: string}}>}
 */
function extractPlatformUrls(text) {
  if (!text) return []
  const results = []
  const seen = new Set()
  const re = /https?:\/\/[^\s<>"'，。）】]+/gi
  let m
  while ((m = re.exec(text)) !== null) {
    const url = m[0].replace(/[。,，)）】》>\]】]+$/, '')
    if (seen.has(url)) continue
    seen.add(url)

    const platform = matchPlatform(url)
    if (platform) {
      results.push({ url, platform })
    }
  }
  return results
}

/**
 * 检查 URL 是否是直播 URL（直播流不下载）
 * @param {string} url
 * @returns {boolean}
 */
function isLiveUrl(url) {
  return /live\.bilibili\.com\/\d+/i.test(url) ||
         /\.m3u8/i.test(url) ||
         /\/live\//i.test(url)
}

export { PLATFORM_DEFS, matchPlatform, extractPlatformUrls, isLiveUrl }
