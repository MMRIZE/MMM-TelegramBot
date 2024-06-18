function TelegramBotCommandRegister (module, registerCallback) {
  this.module = module
  this.registerCallback = registerCallback
}

TelegramBotCommandRegister.prototype.add = function (commandObj) {
  this.registerCallback(this.module, commandObj)
}


/** remove ExtraChars for telegramBot markdown **/
function TelegramBotExtraChars (str) {
  /** special markdown for Telegram **/
  str = str.replace(new RegExp("_", "g"), "\\_") //
  str = str.replace(new RegExp("\\*", "g"), "\\*")
  str = str.replace(new RegExp("\\[", "g"), "\\[")
  str = str.replace(new RegExp("`", "g"), "\\`")
  return str
}

function TelegramBotMessageHandler (message, args, callbacks) {
  this.args = args
  this.message = message
  this.chatId = message.chat.id
  this.userId = message.from.id
  this.messageId = message.message_id
  this.callbacks = callbacks
  this.sessionId = message.sessionId
}

TelegramBotMessageHandler.prototype.say = function(type, reqs, opts) {
  const messageObject = TLGMessage.createMessage(type, reqs, opts)
  if (!messageObject) return false
  if(messageObject.class !== 'TelegramBot') return false
  messageObject.chat_id = this.chatId
  this.callbacks.say(messageObject)
}


TelegramBotMessageHandler.prototype.reply = function(type, reqs, opts) {
  const messageObject = TLGMessage.createMessage(type, reqs, opts)
  if (!messageObject) return false
  if(messageObject.class !== 'TelegramBot') return false
  messageObject.chat_id = this.chatId
  messageObject.user_id = this.userId
  messageObject.option.reply_to_message_id = this.messageId
  this.callbacks.reply(messageObject)
}

TelegramBotMessageHandler.prototype.ask = function(
  type,
  reqs,
  opts,
  sessionId,
  callback
) {
  const messageObject = TLGMessage.createMessage(type, reqs, opts)
  if (!messageObject) return false
  if(messageObject.class !== 'TelegramBot') return false
  messageObject.chat_id = this.chatId
  messageObject.option.reply_to_message_id = this.messageId

  this.callbacks.ask(messageObject, sessionId, callback)
}

class TLGMessage {
  constructor() {
    this.class = 'TelegramBot'
    this.type = null
    this.chat_id = null
    this.user_id = null
    this.message_id = null
    this.reply_to_message_id = null
    this.option = {}
  }
  optionAssign(option) {
    for(const i in option) {
      if (i in this.option) {
        this.option[i] = option[i]
      }
    }
  }
  static createMessage(type, reqs, opts) {
    switch(type) {
      case 'CONTACT':
        return new TLGContactMessage(reqs, opts)
      case 'LOCATION':
        return new TLGLocationMessage(reqs, opts)
      case 'VENUE':
        return new TLGVenueMessage(reqs, opts)
      case 'VOICE_URL':
        return new TLGVoiceUrlMessage(reqs, opts)
      case 'VOICE_PATH':
        return new TLGVoicePathMessage(reqs, opts)
      case 'VIDEO_URL':
        return new TLGVideoUrlMessage(reqs, opts)
      case 'VIDEO_PATH':
        return new TLGVideoPathMessage(reqs, opts)
      case 'DOCUMENT_URL':
        return new TLGDocumentUrlMessage(reqs, opts)
      case 'DOCUMENT_PATH':
        return new TLGDocumentPathMessage(reqs, opts)
      case 'PHOTO_URL':
        return new TLGPhotoUrlMessage(reqs, opts)
      case 'PHOTO_PATH':
        return new TLGPhotoPathMessage(reqs, opts)
      case 'AUDIO_URL':
        return new TLGAudioUrlMessage(reqs, opts)
      case 'AUDIO_PATH':
        return new TLGAudioPathMessage(reqs, opts)
      case 'TEXT':
      default:
        return new TLGTextMessage(reqs, opts)
    }
  }
}

class TLGMediaMessage extends TLGMessage {
  constructor(path, option={}) {
    super(path, option)
    this.option = {
      caption: "sent by MagicMirror",
      disable_notification : true,
      reply_to_message_id : null,
      reply_markup : null,
    }
    if (typeof path == 'string') {
      this.path = path
      this.optionAssign(option)
    } else {
      return {}
    }
  }
}
class TLGTextMessage extends TLGMessage {
  constructor(text, option={}) {
    if (!text) text = ""
    super(text, option)
    this.option = {
      parse_mode : null,
      disable_web_page_preview : false,
      disable_notification : true,
      reply_to_message_id : null,
      reply_markup : null,
    }
    if (typeof text == 'string' && text.trim().length > 0 ) {
      this.type = 'TEXT'
      this.text = text.substring(0, 4000)
      this.optionAssign(option)
    } else {
      return {}
    }
  }
}

class TLGLocationMessage extends TLGMessage {
  constructor(geo={}, option={}) {
    super(geo, option)
    this.option = {
      disable_notification : true,
      reply_to_message_id : null,
      reply_markup : null,
    }
    if (geo.latitude && geo.longitude) {
      this.type = 'LOCATION'
      this.latitude = geo.latitude
      this.longitude = geo.longitude
      this.optionAssign(option)
    } else {
      return {}
    }
  }
}

class TLGContactMessage extends TLGMessage {
  constructor(contact={}, option={}) {
    super(contact, option)
    this.option = {
      last_name : null,
      disable_notification : true,
      reply_to_message_id : null,
      reply_markup : null,
    }
    if (contact.phone_number && contact.first_name) {
      this.type = 'CONTACT'
      this.phoneNumber = contact.phone_number
      this.firstName = contact.first_name
      this.optionAssign(option)
    } else {
      return {}
    }
  }
}
class TLGVenueMessage extends TLGMessage {
  constructor(venue={}, option={}) {
    super(venue, option)
    this.option = {
      foursquare_id : null,
      disable_notification : true,
      reply_to_message_id : null,
      reply_markup : null,
    }
    const req = ['latitude', 'longitude', 'title', 'address']
    let fail = 0
    req.forEach((p)=>{
      if (venue.hasOwnProperty(p)) {
        this[p] = venue[p]
      } else {
        fail = 1
      }
    })
    if (fail == 1) return {}

    this.type = 'VENUE'
    this.optionAssign(option)
  }
}
class TLGPhotoUrlMessage extends TLGMediaMessage {
  constructor(path, option={}) {
    super(path, option)
    this.type = 'PHOTO_URL'
  }
}
class TLGPhotoPathMessage extends TLGMediaMessage {
  constructor(path, option={}) {
    super(path, option)
    this.type = 'PHOTO_PATH'
  }
}
class TLGAudioUrlMessage extends TLGMediaMessage {
  constructor(path, option={}) {
    super(path, option)
    this.type = 'AUDIO_URL'
  }
}
class TLGAudioPathMessage extends TLGMediaMessage {
  constructor(path, option={}) {
    super(path, option)
    this.type = 'AUDIO_PATH'
  }
}

class TLGDocumentUrlMessage extends TLGMediaMessage {
  constructor(path, option={}) {
    super(path, option)
    this.type = 'DOCUMENT_URL'
  }
}
class TLGDocumentPathMessage extends TLGMediaMessage {
  constructor(path, option={}) {
    super(path, option)
    this.type = 'DOCUMENT_PATH'
  }
}
class TLGVideoUrlMessage extends TLGMediaMessage {
  constructor(path, option={}) {
    super(path, option)
    this.type = 'VIDEO_URL'
  }
}
class TLGVideoPathMessage extends TLGMediaMessage {
  constructor(path, option={}) {
    super(path, option)
    this.type = 'VIDEO_PATH'
  }
}
class TLGVoiceUrlMessage extends TLGMediaMessage {
  constructor(path, option={}) {
    super(path, option)
    this.type = 'VOICE_URL'
  }
}
class TLGVoicePathMessage extends TLGMediaMessage {
  constructor(path, option={}) {
    super(path, option)
    this.type = 'VOICE_PATH'
  }
}
