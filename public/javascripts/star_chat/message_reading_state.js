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

    if (!localStorage.locals) {
        localStorage.locals = JSON.stringify({});
    }
    
    try {
        var locals = JSON.parse(localStorage.locals);
    } catch (e) {
        var locals = {};
    }

    if (!(userName in locals)) {
        locals[userName] = {};
    }
    if (!('maxMessageIds' in locals[userName])) {
        locals[userName].maxMessageIds = {};
    }
    localStorage.locals = JSON.stringify(locals);
};

/**
 * @param {string} channelName
 * @return {number}
 */
starChat.MessageReadingState.prototype.getMaxMessageId = function (channelName) {
    var locals = JSON.parse(localStorage.locals);
    var ids = locals[this.userName_].maxMessageIds;
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
starChat.MessageReadingState.prototype.setMaxMessageId = function (channelName, messageId) {
    var locals = JSON.parse(localStorage.locals);
    var ids = locals[this.userName_].maxMessageIds;
    var currentMessageId = this.getMaxMessageId(channelName);
    if (currentMessageId < messageId) {
        ids[channelName] = messageId;
    }
    localStorage.locals = JSON.stringify(locals);
};


