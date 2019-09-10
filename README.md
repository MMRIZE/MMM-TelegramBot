# MMM-TelegramBot
TelegramBot module for MagicMirror

## Feature
- You can remote-control your `MagicMirror` and modules within `Telegram`.
- The Bot is implemented in this module thus you don't need to manage antoher daemon.
- Other module developers can add their commands easily. (See the Wiki : https://github.com/eouia/MMM-TelegramBot/wiki )

## Update History
**[1.0.1] : 2019-09-10**
- Added: `useWelcomeMessage` and `verbose`


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
  config: {
    telegramAPIKey : '<your Telegram API Token>',
    allowedUser : ['<your Telegram username without @>'],
    adminChatId : <your admin chat id>,

    useWelcomeMessage: false,
    verbose: false,
  }
},
```
- `useWelcomeMessage` : if set as `false`, Wake-up message will not happen.
- `verbose` : if set as `false`, log will not be logged.

## More Information
See the [Wiki](https://github.com/eouia/MMM-TelegramBot/wiki)
