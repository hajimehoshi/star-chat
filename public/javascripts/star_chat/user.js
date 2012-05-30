'use strict';

starChat.User = (function () {
    var User = function (name) {
        this.name_ = name;
        this.channelObjects_ = [];
        this.keywords_ = [];
    };
    User.prototype.name = function () {
        return this.name_;
    };
    User.prototype.channels = (function () {
        var cache = {};
        return function () {
            return this.channelObjects_.map(function (obj) {
                if (obj.name in cache) {
                    return cache[obj.name];
                }
                return cache[obj.name] = new starChat.Channel(obj);
            });
        };
    })();
    User.prototype.addChannel = function(name) {
        var r = $.grep(this.channelObjects_, function (channel) {
            return channel.name === name;
        });
        if (r.length === 0) {
            this.channelObjects_.push({name: name});                        
        }
    };
    User.prototype.removeChannel = function(name) {
        var idx = -1;
        for (var i = 0; i < this.channelObjects_.length; i++) {
            if (this.channelObjects_[i].name === name) {
                idx = i;
                break;
            }
        }
        if (idx !== -1) {
            this.channelObjects_.splice(idx, 1);
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
            self.channelObjects_ = data;
            if (callback !== void(0)) {
                callback(sessionId);
            }
        });
    };
    User.prototype.save = function (session, callback) {
        var url = '/users/' + encodeURIComponent(this.name_);
        starChat.ajaxRequest(session, url, 'PUT', {
            keywords: this.keywords_,
        }, function (sessionId, url, method, data) {
            if (callback !== void(0)) {
                callback(sessionId);
            }
        });
    };
    return User;
})();
