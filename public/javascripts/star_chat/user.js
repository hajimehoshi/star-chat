'use strict';

starChat.User = (function () {
    /**
     * @constructor
     */
    var User = function (name) {
        this.name_ = name;
        this.nick_ = name;
        this.channels_ = [];
        this.keywords_ = [];
    };
    var cache = {};
    User.find = function (name) {
        if (name in cache) {
            return cache[name];
        }
        return cache[name] = new User(name);
    };
    User.prototype.update = function (obj) {
        if ('nick' in obj) {
            this.nick_ = obj.nick;
        }
        if ('keywords' in obj) {
            this.keywords_ = obj.keywords;
        }
    };
    User.prototype.name = function () {
        return this.name_;
    };
    User.prototype.nick = function (value) {
        if (value !== void(0)) {
            this.nick_ = value;
            return this;
        } else {
            return this.nick_;
        }
    };
    User.prototype.channels = function () {
        return this.channels_;
    };
    User.prototype.addChannel = function(name) {
        var r = $.grep(this.channels_, function (channel) {
            return channel.name() === name;
        });
        if (r.length === 0) {
            this.channels_.push(starChat.Channel.find(name));
        }
    };
    User.prototype.removeChannel = function(name) {
        var idx = -1;
        for (var i = 0; i < this.channels_.length; i++) {
            if (this.channels_[i].name() === name) {
                idx = i;
                break;
            }
        }
        if (idx !== -1) {
            this.channels_.splice(idx, 1);
        }
    };
    User.prototype.keywords = function (keywords) {
        if (keywords !== void(0)) {
            if (!$.isArray(keywords)) {
                throw 'Invalid assignment: keywords is not an array';
            }
            this.keywords_ = keywords;
            return this;
        } else {
            return this.keywords_;
        }
    };
    User.prototype.load = function (session, callback) {
        var url = '/users/' + encodeURIComponent(this.name_);
        var self = this;
        starChat.ajaxRequest(session, url, 'GET', null, function (sessionId, url, method, data) {
            self.keywords_ = data.keywords;
            if (callback !== void(0)) {
                callback(sessionId);
            }
        });
    };
    User.prototype.loadChannels = function (session, callback) {
        var url = '/users/' + encodeURIComponent(this.name_) + '/channels';
        var self = this;
        starChat.ajaxRequest(session, url, 'GET', null, function (sessionId, url, method, data) {
            self.channels_ = data.map(function (obj) {
                var channel = starChat.Channel.find(obj.name);
                channel.update(obj);
                return channel;
            });
            if (callback !== void(0)) {
                callback(sessionId);
            }
        });
    };
    User.prototype.save = function (session, callback) {
        var url = '/users/' + encodeURIComponent(this.name_);
        starChat.ajaxRequest(session, url, 'PUT', {
            nick:     this.nick_,
            keywords: this.keywords_
        }, function (sessionId, url, method, data) {
            if (callback !== void(0)) {
                callback(sessionId);
            }
        });
    };
    return User;
})();
