'use strict';

/**
 * @constructor
 * @param {string} channelName
 * @param {string} userName
 */
starChat.Subscribing = function (channelName, userName) {
    /**
     * @type {string}
     */
    this.channelName_ = channelName;
    /**
     * @type {string}
     */
    this.userName_ = userName;
    /**
     * @type {?string}
     */
    this.key_ = null;
};

/**
 * @param {string=} value
 * @return {starChat.Subscribing|string}
 */
starChat.Subscribing.prototype.key = function (value) {
    if (value !== void(0)) {
        this.key_ = value;
        return this;
    } else {
        return this.key_;
    }
};

/**
 * @param {starChat.Session} session
 * @param {function(number)=} callback
 */
starChat.Subscribing.prototype.save = function (session, callback) {
    var url = '/subscribings?' +
        'channel_name=' + encodeURIComponent(this.channelName_) + ';' +
        'user_name=' + encodeURIComponent(this.userName_);
    var options = {};
    if (this.key_) {
        options['headers'] = {
            'X-StarChat-Channel-Key': this.key_
        };
    }
    var self = this;
    starChat.ajaxRequest(session, url, 'PUT', null, function (sessionId, url, method, data) {
        session.user().addChannel(self.channelName_);
        starChat.Channel.find(self.channelName_).load(session);
        if (callback !== void(0)) {
            callback(sessionId);
        }
    }, options);
};

/**
 * @param {starChat.Session} session
 * @param {function(number)=} callback
 */
starChat.Subscribing.prototype.destroy = function (session, callback) {
    var url = '/subscribings?' +
        'channel_name=' + encodeURIComponent(this.channelName_) + ';' +
        'user_name=' + encodeURIComponent(this.userName_);
    var self = this;
    starChat.ajaxRequest(session, url, 'DELETE', null, function (sessionId, url, method, data) {
        session.user().removeChannel(self.channelName_);
        if (callback !== void(0)) {
            callback(sessionId);
        }
    });
};
