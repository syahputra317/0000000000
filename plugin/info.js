let handler  = async (m, { conn, usedPrefix: _p }) => {
  conn.reply(m.chat, `
⚠️ *INGFO BOT* ⚠️
Dibuat dengan javascript via NodeJs,Ffmpeg,dan ImageMagick

*Sosmed :*
Kritik kami di sosmed ataupun YouTube.
Instagram: @armsptr_



`.trim(), m)
}
handler.help = ['info']
handler.tags = ['info']
handler.command = /^(info)$/i
handler.owner = false
handler.mods = false
handler.premium = false
handler.group = false
handler.private = false

handler.admin = false
handler.botAdmin = false

handler.fail = null

module.exports = handler

