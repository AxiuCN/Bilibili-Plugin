export const helpCfg = {
  title: '#B站帮助',
  subTitle: 'Bilibili-Plugin 帮助'
}

export const helpList = [
  {
    group: 'B站账号',
    list: [
      { icon: 0, title: '#b站登录', desc: '扫码登录B站账号' },
      { icon: 0, title: '#b站状态', desc: '查看登录状态与Cookie有效期' }
    ]
  },
  {
    group: '激励计划',
    list: [
      { icon: 0, title: '#激励创建配置', desc: '从全局默认生成个人配置' },
      { icon: 0, title: '#激励添加 <链接>', desc: '向个人配置添加兑换链接' },
      { icon: 0, title: '#激励列表', desc: '查看个人兑换配置' },
      { icon: 0, title: '#激励删除 <编号>', desc: '删除指定链接' }
    ]
  },
  {
    group: '激励管理（仅主人）',
    auth: 'master',
    list: [
      { icon: 0, title: '#添加激励白名单', desc: '将QQ添加到激励白名单' },
      { icon: 0, title: '#删除激励白名单', desc: '从激励白名单移除QQ' },
      { icon: 0, title: '#激励白名单', desc: '查看激励白名单' }
    ]
  },
  {
    group: '通用',
    list: [
      { icon: 0, title: '#b站帮助', desc: '查看Bilibili-Plugin帮助图' }
    ]
  }
]
