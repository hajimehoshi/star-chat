'use strict';

starChat.Subscribing = (function () {
    var Subscribing = function (channelName, userName) {
        this.channelName_ = channelName;
        this.userName_    = userName;
        this.key_         = null;
    };
    Subscribing.prototype.key = function (value) {
        if (value !== void(0)) {
            this.key_ = value;
            return this;
        } else {
            return this.key_;
        }
    };
    Subscribing.prototype.save = function (session, callback) {
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
    Subscribing.prototype.destroy = function (session, callback) {
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
    return Subscribing;
})();
