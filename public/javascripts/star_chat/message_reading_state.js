'use strict';

/**
 * @constructor
 * @param {string} userName
 */
starChat.MessageReadingState = function (userName) {
    /**
     * @private
     * @type {string}
     */
    this.userName_ = userName;

    if (!localStorage.readMessageIds) {
        localStorage.readMessageIds = JSON.stringify({});
    }
    
    try {
        var readMessageIds = JSON.parse(localStorage.readMessageIds);
    } catch (e) {
        var readMessageIds = {};
    }

    if (!(userName in readMessageIds)) {
        readMessageIds[userName] = {};
    }
    localStorage.readMessageIds = JSON.stringify(readMessageIds);
};

/**
 * @param {string} channelName
 * @return {number}
 */
starChat.MessageReadingState.prototype.getMessageId = function (channelName) {
    var ids = JSON.parse(localStorage.readMessageIds)[this.userName_];
    if (!(channelName in ids)) {
        ids[channelName] = 0;
    }
    return ids[channelName];
};


/**
 * @param {string} channelName
 * @param {number} messageId
 * @return {undefined}
 */
starChat.MessageReadingState.prototype.setMessageId = function (channelName, messageId) {
    var obj = JSON.parse(localStorage.readMessageIds);
    var ids = obj[this.userName_];
    var currentMessageId = this.getMessageId(channelName);
    if (currentMessageId < messageId) {
        ids[channelName] = messageId;
    }
    localStorage.readMessageIds = JSON.stringify(obj);
};


