# 🌟 Aurora Discord Bot

A powerful, feature-rich all-in-one Discord bot built with **Discord.js v14**.

---

## ✨ Features

| Feature | Commands |
|---|---|
| 🎨 **Embed System** | `/embed create` |
| ⚠️ **Warn System** | `/warn add/list/remove/clear` |
| 🛡️ **Moderation** | `/mod kick/ban/unban/timeout/purge/lock/unlock/slowmode` |
| 🤖 **AutoMod** | `/automod setup/badwords/status` |
| 📨 **DM System** | `/dm send` (by username) `/dm user` (by mention) |
| 📅 **Event System** | `/event create/list/info/cancel` |
| 🎫 **Ticket System** | `/ticket setup/panel/close/add/remove` |
| 🎉 **Giveaway System** | `/giveaway start/end/reroll/list` |
| 🎵 **Music System** | `/music play/pause/resume/skip/stop/queue/nowplaying/volume/loop/remove` |
| 📖 **Help** | `/help` |

---

## 🚀 Setup Guide

### 1. Prerequisites
- Node.js **v18+**
- MongoDB (local or [MongoDB Atlas](https://cloud.mongodb.com))
- FFmpeg installed on your system

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
```
Edit `.env` with your values:
```env
TOKEN=your_discord_bot_token
CLIENT_ID=your_application_id
MONGODB_URI=mongodb://localhost:27017/aurora_bot
OWNER_ID=your_discord_user_id
LOG_CHANNEL_ID=your_log_channel_id
```

### 4. Get Your Bot Token
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create New Application → name it "Aurora"
3. Go to **Bot** tab → Reset Token → copy it
4. Enable these **Privileged Intents**:
   - ✅ Server Members Intent
   - ✅ Message Content Intent

### 5. Invite the Bot
Go to **OAuth2 → URL Generator**:
- Scopes: `bot`, `applications.commands`
- Permissions: `Administrator` (or select individual permissions)

### 6. Deploy Slash Commands
```bash
node deploy-commands.js
```

### 7. Start the Bot
```bash
npm start
# or for development with auto-reload:
npm run dev
```

---

## 📋 Feature Details

### 🎨 Embed System
```
/embed create
  title: "My Announcement"
  description: "This is the body text"
  color: #FF5733          ← Custom hex color
  image: https://...      ← Full image in embed
  thumbnail: https://...  ← Small image top-right
  footer: "Footer text"
  timestamp: true
  button1_label: "Click Me"
  button1_url: "https://..."
  button1_emoji: 🎉
  button2_label: "More Info"
  channel: #announcements ← Send to specific channel
```

### ⚠️ Warn System
- Warns stored in MongoDB per user per server
- Each warn has a unique ID for easy removal
- DM notification sent to warned user
- Warn logs sent to mod-log channel

### 🤖 AutoMod Features
- **Anti-Spam**: Deletes if user sends 5+ messages in 5 seconds
- **Anti-Links**: Removes external URLs
- **Anti-Invites**: Removes Discord invite links
- **Anti-Caps**: Removes messages with >70% uppercase
- **Bad Words**: Custom word filter list
- All violations logged to a log channel

### 📨 DM System
```
/dm send username:johndoe message:Hello! anonymous:true
/dm user user:@johndoe message:Hello! anonymous:false
```
- Find users by username, display name, or tag
- Optional anonymous mode (hides your identity)
- Sends a beautifully formatted embed DM

### 🎫 Ticket System
1. `/ticket setup` — Set category, support role, log channel
2. `/ticket panel #channel` — Send the ticket panel
3. Users click "Open a Ticket" button
4. Private channel created automatically
5. `/ticket close` or button to close

### 🎉 Giveaway System
```
/giveaway start prize:"Nitro Classic" duration:1h winners:2
```
- Users click 🎉 button to enter/leave
- Auto-picks random winners when time ends
- `/giveaway reroll` to re-pick winners

### 🎵 Music System
- Powered by `play-dl` (supports YouTube)
- Full queue management with loop mode
- Volume control (1-100)
- Button controls on now-playing embed
- Auto-disconnect after 30s if queue empty

---

## 📁 Project Structure
```
aurora-bot/
├── index.js              ← Main entry point
├── deploy-commands.js    ← Register slash commands
├── .env                  ← Your config
├── commands/
│   ├── embed/
│   │   └── embed.js
│   ├── warn/
│   │   └── warn.js
│   ├── moderation/
│   │   ├── mod.js
│   │   ├── automod.js
│   │   └── help.js
│   ├── dm/
│   │   └── dm.js
│   ├── event/
│   │   └── event.js
│   ├── ticket/
│   │   └── ticket.js
│   ├── giveaway/
│   │   └── giveaway.js
│   └── music/
│       └── music.js
├── events/
│   ├── ready.js
│   ├── interactionCreate.js
│   └── messageCreate.js   ← AutoMod listener
└── utils/
    └── models.js          ← MongoDB schemas
```

---

## 🔧 Required Bot Permissions
- Manage Messages
- Manage Channels
- Kick Members
- Ban Members
- Moderate Members
- Read Message History
- Send Messages
- Embed Links
- Attach Files
- Connect & Speak (for music)

---

## 🆘 Troubleshooting

**Bot not responding to commands?**
→ Run `node deploy-commands.js` again and wait 1-2 minutes

**Music not working?**
→ Install FFmpeg: `sudo apt install ffmpeg` (Linux) or download from ffmpeg.org

**MongoDB connection failed?**
→ Check your `MONGODB_URI` in `.env`

---

Made with ❤️ using Discord.js v14
