let { WAConnection: _WAConnection, WA_MESSAGE_STUB_TYPES } = require('@adiwajshing/baileys')
let { generate } = require('qrcode-terminal')
let qrcode = require('qrcode')
let simple = require('./lib/simple')
let yargs = require('yargs/yargs')
let syntaxerror = require('syntax-error')
let chalk = require('chalk')
let fs = require('fs')
let path = require('path')
let util = require('util')
let WAConnection = simple.WAConnection(_WAConnection)


global.owner = ['6285802546577@s.whatsapp.net'] // Put your number here
global.mods = ['6285802546577@s.whatsapp.net'] // Want some help?
global.prems = ['6285802546577@s.whatsapp.net'] // Premium user has unlimited limit


global.timestamp = {
  start: new Date
}
const PORT = process.env.PORT || 3000
let opts = yargs(process.argv.slice(2)).exitProcess(false).parse()
global.opts = Object.freeze({...opts})
global.prefix = new RegExp('^[' + (opts['prefix'] || '\\/i!#$%\\-+£¢€¥^°=¶∆×÷π√✓©z®:;?&.') + ']')

global.DATABASE = new (require('./lib/database'))(opts._[0] ? opts._[0] + '_' : '' + 'database.json', null, 2)
if (!global.DATABASE.data.users) global.DATABASE.data = {
  users: {},
  groups: {},
  chats: {},
}
if (!global.DATABASE.data.groups) global.DATABASE.data.groups = {}
if (!global.DATABASE.data.chats) global.DATABASE.data.chats = {}
if (opts['server']) {
  let express = require('express')
  global.app = express()
  app.all('*', async (req, res) => {
    await global.conn.connect().catch(console.log)
    res.end(await qrcode.toBuffer(global.qr))
  })
  app.listen(PORT, () => console.log('App listened on port', PORT))
}
global.conn = new WAConnection()
let authFile = `${opts._[0] || 'session'}.data.json`
if (fs.existsSync(authFile)) conn.loadAuthInfo(authFile)
if (opts['big-qr'] || opts['server']) conn.on('qr', qr => generate(qr, { small: false }))
if (opts['server']) conn.on('qr', qr => { global.qr = qr })
conn.on('credentials-updated', () => fs.writeFileSync(authFile, JSON.stringify(conn.base64EncodedAuthInfo())))
let lastJSON = JSON.stringify(global.DATABASE.data)
setInterval(async () => {
  conn.logger.info('Saving database . . .')
  if (JSON.stringify(global.DATABASE.data) == lastJSON) conn.logger.info('Database is up to date')
  else {
    global.DATABASE.save()
    conn.logger.info('Done saving database!')
    lastJSON = JSON.stringify(global.DATABASE.data)
  }
}, 60 * 1000) // Save every minute
conn.handler = async function (m) {
  try {
  	simple.smsg(this, m)
    m.exp = 0
    m.limit = false
    if (!m.fromMe && opts['self']) return
    if (!m.text) return
    if (m.isBaileys) return
    try {
      if (global.DATABASE._data.users[m.sender]) {
        if (typeof global.DATABASE._data.users[m.sender].exp == 'number' &&
          !isNaN(global.DATABASE._data.users[m.sender].exp)
        ) m.exp += 1
        else global.DATABASE._data.users[m.sender].exp = 0
        if (typeof global.DATABASE._data.users[m.sender].limit != 'number' ||
          isNaN(global.DATABASE._data.users[m.sender].limit)
        ) global.DATABASE._data.users[m.sender].limit = 10
        if (typeof global.DATABASE._data.users[m.sender].lastclaim != 'number' ||
          isNaN(global.DATABASE._data.users[m.sender].lastclaim)
        ) global.DATABASE._data.users[m.sender].lastclaim = 0
      } else global.DATABASE._data.users[m.sender] = {
        exp: 0,
        limit: 20,
        lastclaim: 0,
      }
      if (global.DATABASE._data.chats[m.chat]) {
        if (!'isBanned' in global.DATABASE._data.chats[m.chat])
          global.DATABASE._data.chats[m.chat].isBanned = false
      } else global.DATABASE._data.chats[m.chat] = {
        isBanned: false
      }
    } catch (e) {
      console.log(e, global.DATABASE.data)
    }
    
  	let usedPrefix
  	for (let name in global.plugins) {
  	  let plugin = global.plugins[name]
      if (!plugin) continue
      if (plugin.tags && plugin.tags.includes('admin')) continue
      let _prefix = plugin.customPrefix ? plugin.customPrefix : conn.prefix ? conn.prefix : global.prefix
  	  if ((usedPrefix = (_prefix.exec(m.text) || '')[0])) {
        let noPrefix = m.text.replace(usedPrefix, '')
  		  let [command, ...args] = noPrefix.trim().split` `.filter(v=>v)
        let _args = noPrefix.trim().split` `.slice(1)
        let text = _args.join` `
  		  command = (command || '').toLowerCase()
        let isROwner = [global.conn.user.jid, ...global.owner].map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender)
        let isOwner = isROwner || m.fromMe
  			let isAccept = plugin.command instanceof RegExp ? plugin.command.test(command) :
        plugin.command instanceof Array ? plugin.command.includes(command) :
        plugin.command instanceof String ? plugin.command == command : false
  			if (!isAccept) continue
        let isMods = isOwner || global.mods.map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender)
        let isPrems = isROwner || global.prems.map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender)
        let groupMetadata = m.isGroup ? await this.groupMetadata(m.chat) : {}
        let participants = m.isGroup ? groupMetadata.participants : []
        let user = m.isGroup ? participants.find(u => u.jid == m.sender) : {}
        let bot = m.isGroup ? participants.find(u => u.jid == this.user.jid) : {}
        let isAdmin = user.isAdmin || user.isSuperAdmin || false
        let isBotAdmin = bot.isAdmin || bot.isSuperAdmin || false
        if (m.chat in global.DATABASE._data.chats) {
          let chat = global.DATABASE._data.chats[m.chat]
          if (name != 'unbanchat.js' && chat && chat.isBanned) return
        }
        if (plugin.before && plugin.before({
          usedPrefix
        })) return
        let fail = plugin.fail || global.dfail
        if (plugin.rowner && !isROwner) {
          fail('rowner', m, this)
          continue
        }
        if (plugin.owner && !isOwner) {
          fail('owner', m, this)
          continue
        }
        if (plugin.mods && !isMods) {
          fail('mods', m, this)
          continue
        }
        if (plugin.premium && !isPrems) {
          fail('premium', m, this)
          continue
        }
  			if (plugin.group && !m.isGroup) {
          fail('group', m, this)
          continue
        } else if (plugin.botAdmin && !isBotAdmin) {
          fail('botAdmin', m, this)
          continue
        } else if (plugin.admin && !isAdmin) {
          fail('admin', m, this)
          continue
        }
  			if (plugin.private && m.isGroup) {
          fail('private', m, this)
          continue
        }

        m.isCommand = true
        let xp = 'exp' in plugin ? parseInt(plugin.exp) : 9
        if (xp > 99) m.reply('Ciee Mau Curang Yaa :V')
        else m.exp += xp
        if (!isPrems && global.DATABASE._data.users[m.sender].limit < m.limit * 1 && plugin.limit) {
          this.reply(m.chat, `Limit anda habis, silahkan bemli melalui *${usedPrefix}buy*`, m)
          continue
        }
        try {
          await plugin(m, {
            usedPrefix,
            noPrefix,
            _args,
            args,
            command,
            text,
            conn: this,
            participants,
            groupMetadata,
            isROwner,
            isOwner,
            isAdmin,
            isBotAdmin,
            isPrems
          })
          if (!isPrems) m.limit = m.limit || plugin.limit || false
        } catch (e) {
          console.log(e)
          this.reply(m.chat, util.format(e), m)
        } finally {
          if (m.limit) this.reply(m.chat, + m.limit + ' Limit terpakai', m)
        }
  			break
  		}
  	}
  } finally {
    //console.log(global.DATABASE._data.users[m.sender])
    if (m && m.sender && global.DATABASE._data.users[m.sender]) {
      global.DATABASE._data.users[m.sender].exp += m.exp
      global.DATABASE._data.users[m.sender].limit -= m.limit * 1
    }
    try {
      require('./lib/print')(m, this)
    } catch (e) {
      console.log(m, e)
    }
  }
}
conn.welcome = 'Selamat Datang Semoga Betah Di Group Sini Ngab :) @user👋'
conn.bye = 'Akhir Nya Beban Keluarga Berkurang Semoga Tenang Di Sana ;-) @user👋'
conn.onAdd = async function ({ m, participants }) {
  for (let user of participants) {
    let pp = './src/avatar_contact.png'
    try {
      pp = await this.getProfilePicture(user).catch(() => {})
    } finally {
      let text = (this.welcome || conn.welcome || 'Welcome, @user!').replace('@user', '@' + user.split('@')[0])
      this.sendFile(m.key.remoteJid, pp, 'pp.jpg', text, m, false, {
        contextInfo: {
          mentionedJid: [user]
        }
      })
    }
  }
}

conn.onLeave = async function  ({ m, participants }) {
  for (let user of participants) {
    let pp = './src/avatar_contact.png'
    try {
      pp = await this.getProfilePicture(user).catch(() => {})
    } finally {
      let text = (this.bye || conn.bye || 'Bye, @user!').replace('@user', '@' + user.split('@')[0])
      this.sendFile(m.key.remoteJid, pp, 'pp.jpg', text, m, false, {
        contextInfo: {
          mentionedJid: [user]
        }
      })
    }
  }
}

conn.on('message-new', conn.handler)
conn.on('group-add', conn.onAdd)
conn.on('group-leave', conn.onLeave)
conn.on('error', conn.logger.error)
conn.on('close', async () => {
  await conn.loadAuthInfo(authFile)
  await conn.connect()
  global.timestamp.connect = new Date
})

global.dfail = (type, m, conn) => {
  let msg = {
    rOwner: 'Perintah ini hanya dapat digunakan oleh _*OWNER*_',
    owner: 'Perintah ini hanya dapat digunakan oleh *Owner Bot*!',
    mods: 'Perintah ini hanya dapat digunakan oleh _*Moderator BOT*_ !',
    premium: 'Perintah ini hanya untuk member _*Premium*_ !',
    group: 'Perintah ini hanya dapat digunakan di grup!',
    private: 'Perintah ini hanya dapat digunakan di Chat Pribadi!',
    admin: 'Perintah ini hanya untuk *Admin* grup!',
    botAdmin: 'Jadikan bot sebagai *Admin* untuk menggunakan perintah ini!'
  }[type]
  if (msg)conn.reply(m.chat, msg, m)
}

if (opts['test']) {
  conn.user = {
    jid: '2219191@s.whatsapp.net',
    name: 'test',
    phone: {}
  }
  conn.sendMessage = (chatId, content, type, opts) => conn.emit('message-new', {
    messageStubParameters: [],
    key: {
      fromMe: true,
      remoteJid: chatId,
      id: opts ? '3EB0ABCDEF45' : 'biasa'
    },
    message: {
      [type]: content
    },
    messageStubType: 0,
    timestamp: +new Date
  })
  process.stdin.on('data', chunk => conn.sendMessage('123@s.whatsapp.net', chunk.toString().trimEnd(), 'conversation'))
} else {
  process.stdin.on('data', chunk => {
    process.send(chunk.toString().trimEnd())
  })
  conn.connect().then(() => {
    global.timestamp.connect = new Date
  })
}
process.on('uncaughtException', console.error)
// let strQuot = /(["'])(?:(?=(\\?))\2.)*?\1/

let pluginFilter = filename => /\.js$/.test(filename)
global.plugins = Object.fromEntries(
  fs.readdirSync(path.join(__dirname, 'plugins'))
    .filter(pluginFilter)
    .map(filename => [filename, {}])
)
for (let filename in global.plugins) {
  try {
    global.plugins[filename] = require('./plugins/' + filename)
  } catch (e) {
    conn.logger.error(e)
    delete global.plugins[filename]
  }
}
console.log(Object.keys(global.plugins))
global.reload = (event, filename) => {
  if (pluginFilter(filename)) {
    let dir = './plugins/' + filename
    if (require.resolve(dir) in require.cache) {
      delete require.cache[require.resolve(dir)]
      if (fs.existsSync(require.resolve(dir))) conn.logger.info(`re - require plugin '${dir}'`)
      else {
        conn.logger.warn(`deleted plugin '${dir}'`)
        return delete global.plugins[filename]
      }
    } else conn.logger.info(`requiring new plugin '${dir}'`)
    let err = syntaxerror(fs.readFileSync(dir))
    if (err) conn.logger.error(`syntax error while loading '${dir}'\n${err}`)
    else try {
      global.plugins[filename] = require(dir)
    } catch (e) {
      conn.logger.error(e)
    }
  }
}
Object.freeze(global.reload)
fs.watch(path.join(__dirname, 'plugins'), global.reload)

process.on('exit', () => global.DATABASE.save())
