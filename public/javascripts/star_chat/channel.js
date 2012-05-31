'use strict';

starChat.Channel = (function () {
    var Channel = function (object) {
        this.name_  = object.name;
        this.topic_ = object.topic;
        this.users_ = [];
    };
    var cache = {};
    Channel.find = function (name) {
        if (name in cache) {
            return cache[name];
        }
        return cache[name] = new Channel({
            name: name,
        });
    };
    Channel.prototype.update = function (obj) {
        if ('topic' in obj) {
            this.topic_ = obj.topic;
        }
    };
    Channel.prototype.name = function () {
        return this.name_;
    };
    Channel.prototype.topic = function (topic) {
        if (topic !== void(0)) {
            this.topic_ = topic;
            return this;
        } else {
            return this.topic_;
        }
    };
    Channel.prototype.users = function () {
        return this.users_;
    };
    Channel.prototype.addUser = function (name) {
        var r = $.grep(this.users_, function (user) {
            return user.name() === name;
        });
        if (r.length === 0) {
            this.users_.push(starChat.User.find(name));
        }
    };
    Channel.prototype.removeUser = function (name) {
        var idx = -1;
        for (var i = 0; i < this.users_.length; i++) {
            if (this.users_[i].name() === name) {
                idx = i;
                break;
            }
        }
        if (idx !== -1) {
            this.users_.splice(idx, 1);
        }
    }
    Channel.prototype.load = function (session, callback) {
        var url = '/channels/' + encodeURIComponent(this.name_);
        var self = this;
        starChat.ajaxRequest(session, url, 'GET', null, function (sessionId, url, method, data) {
            self.topic_ = data.topic;
            if (callback !== void(0)) {
                callback(sessionId);
            }
        });
    };
    Channel.prototype.loadUsers = function (session, callback) {
        var url = '/channels/' + encodeURIComponent(this.name_) + '/users';
        var self = this;
        starChat.ajaxRequest(session, url, 'GET', null, function (sessionId, url, method, data) {
            self.users_ = data.map(function (obj) {
                var user = starChat.User.find(obj.name);
                user.update(obj);
                return user;
            });
            if (callback !== void(0)) {
                callback(sessionId);
            }
        });
    };
    Channel.prototype.save = (function () {
        var lastTopicBody = null;
        return function (session, callback) {
            var url = '/channels/' + encodeURIComponent(this.name_);
            var params = {};
            if (this.topic_ && lastTopicBody !== this.topic_.body) {
                params['topic_body'] = this.topic_.body;
                lastTopicBody = this.topic_.body;
            }
            starChat.ajaxRequest(session, url, 'PUT', params, function (sesionId, url, method, data) {
                if (callback !== void(0)) {
                    callback(sessionId);
                }
            });
        };
    })();
    return Channel;
})();


