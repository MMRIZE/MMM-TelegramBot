# MMM-TelegramBot
TelegramBot module for MagicMirror

## Feature
- You can remote-control your `MagicMirror` and modules within `Telegram`.
- The Bot is implemented in this module thus you don't need to manage antoher daemon.
- Other module developers can add their commands easily. (See the Wiki : https://github.com/eouia/MMM-TelegramBot/wiki )

## New Updates
**[1.2.1] 2020-03-15**
- added: text identifier on no profile photo.
- added: `TELBOT_TELECAST` notification.

**[1.2.0] 2020-03-13**
- Added: `Telecast`. Now you can telecast your chat or message on MagicMirror screen. (Read the [wiki](https://github.com/eouia/MMM-TelegramBot/wiki/Telecast))
- Changed: `position` is needed for `telecast` (You need to re-configure)

## Installation
### 1) Create Telegram Bot
**Ref : https://core.telegram.org/bots#6-botfather**
1. Open your browser in Desktop PC(or your mirror or your phone, anywhere) and Navigate to https://telegram.me/botfather
2. Click `Send Message` button, then your telegram will be opened in your phone or your PC which `Telegram` is already installed on. Meet `BotFather`.
3. Command `/newbot`, give a `name` to the bot created, give an `username`. `username` should end with `bot`. (e.g. `MyMagicMirrorBot` or `mystupidslave-bot`... )
4. After created, you can get API Token. It looks like `110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw`. Remember that.
5. Read messages from `BotFather`. You can find your bot and change chat room of your Bot. Type anything, but your bot will not react yet.

### 2) Install Module
1. In your mirror, open terminal and execute below;
```js
cd ~/MagicMirror/modules
git clone https://github.com/eouia/MMM-TelegramBot.git
cd MMM-TelegramBot
npm install
```

### 3) Configuration (Pre-use)
1. Open `config.js` of `MagicMirror`, add these;
```js
{
  module: 'MMM-TelegramBot',
  config: {
    telegramAPIKey : '<your Telegram API Token>',
    allowedUser : ['<your Telegram username without @>'], // This is NOT the username of bot.
  }
},

```
2. restart your `MagicMirror`.

### 4) Back to your Bot and test
1. Back to the chat room with your Bot in Telegram, try `/help` or `/commands`. Your bot will react!
2. Now,try `/mychatid`. This command will show the id of this chat room. The `chat id` looks like `12345678`. Remember that. We will use this id for admin.

### 5) Register admin Chat id
1. Open `config.js` again.
```js
{
  module: 'MMM-TelegramBot',
  config: {
    telegramAPIKey : '<your Telegram API Token>',
    allowedUser : ['<your Telegram username without @>'],
    adminChatId : <your admin chat id>,
  }
},

```
2. Restart your `MagicMirror`.
3. You can get welcome message in your admin chat room. Now you can use Bot!


## Other configuration option
```js
{
  module: 'MMM-TelegramBot',
  position: "top_left", // Required since 1.2.0
  config: {
    telegramAPIKey : '<your Telegram API Token>',
    allowedUser : ['<your Telegram username without @>'],
    adminChatId : <your admin chat id>,

    useWelcomeMessage: false,
    verbose: false,

    /** added since 1.1.0 **/
    favourites:["/commands", "/modules", "/hideall", "/showall"],
    screenshotScript: "scrot",
    detailOption: {},
    customCommands: [],

    /** added since 1.2.0 **/
    telecast: null, // true or chat_id
    telecastLife: 1000 * 60 * 60 * 6, //
    telecastLimit: 5,
    telecastHideOverflow: true,
  }
},
```
- **`useWelcomeMessage`** : if set as `false`, Wake-up message will not happen.
- **`verbose`** : if set as `false`, log will not be logged.
- **`favourites`** : put your favourite commands to telegram keyboard. They will be loaded by command `/favor`
- **`screenshotScript`** : set your screencapture program(if needed with option parameters but not target filename. The filename will be added in the end of this command automatically.) if set as null, `/screenshot` will not work.
> If you are using another platform, find a proper screencapture program for your environment. (e.g: for OSX, `screencapture` will be valid.)

- **`detailOption`** : For Developer/Expert. Set detail options for `note-telegram-bot-api` constructor (https://github.com/yagop/node-telegram-bot-api/blob/5169d79bd92495d169f9e49302b9f5c630c6ccfc/src/telegram.js#L186)
- **`customCommands`** : You can add your own command (Finally!!!)
- **`telecast`** : `null` for disallowance. `true` for activating by only `/telecast` command. `"{chatId}"` for telecasting whole chats in specific chat room. (Read the wiki)
- **`telecastLife`** : ms of lifetime of chat. After this time, chat will be disappeared and cache data also be removed.
- **`telecastLimit`** : How many chats be displayed. Older chat will be shifted by new one.
- **`telecastHideOverflow`** : on `true`, when overflowed old chats will be hidden. (defined by CSS) If you have touch/mouse interface, you can scroll hidden area.
> Telecast might have different look by position of module. on .bar, .middle.center, .third region, `telecastLimit:1` would be better. Or modify CSS by yourself.

## Update History
**[1.1.1] 2020-03-09**
- changed: `TELBOT_TELL_ADMIN` can get rich format.

**[1.1.0] 2020-02-27**
- added: new commands
  - **`/recent`** : load telegram keyboard for recent used commands
  - **`/favor`** : load telegram keyboard for favorite commands
  - **`/shell`** : execute shell script or shell command (e.g: `/shell echo hello world`)
  - **`/notification`** : emit MagicMirror notification (e.g: `/notification SHOW_ALERT {"title":"test", "timer":1000}`)
  - **`/screenshot`** : take a screenshot of MagicMirror
  > I will remove screenshot feature from `MMM-Tools` on next updates at near future, so use this instead.

- added: new features
  - custom command by user available.
  - abbreviation of command available (e.g: You can use just `/noti` or `/n` instead of full `/notification`)
  - detail option of telegramBot constructor(API) available. (e.g: proxy setting) - experimental

- changed: kinder logging message.
- changed: `parse_mode:"MarkdownV2"` is supported.(natively by API)
- **Some translate files are not completed. Please PR for others.**

**[1.0.2] : 2019-12-16**
- Added: Now `command` is registrable on runtime through notification `TELBOT_REGISTER_COMMAND`

**[1.0.1] : 2019-09-10**
- Added: `useWelcomeMessage` and `verbose`

## More Information
See the [Wiki](https://github.com/eouia/MMM-TelegramBot/wiki)
