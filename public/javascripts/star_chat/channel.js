'use strict';

starChat.Channel = (function () {
    var Channel = function (obj) {
        this.name_    = obj.name;
        this.topic_   = obj.topic;
        this.privacy_ = obj.privacy;
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
        if ('password_locked' in obj) {
            this.isPasswordLocked_ = obj.password_locked;
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
    Channel.prototype.privacy = function (privacy) {
        if (privacy !== void(0)) {
            if (privacy == 'public' || privacy == 'private') {
                this.privacy_ = privacy;
            }
            return this;
        } else {
            return this.privacy_;
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
    };
    Channel.prototype.load = function (session, callback) {
        var url = '/channels/' + encodeURIComponent(this.name());
        var self = this;
        starChat.ajaxRequest(session, url, 'GET', null, function (sessionId, url, method, data) {
            self.topic(data.topic);
            if ('privacy' in data) {
                self.privacy(data.privacy);
            }
            if (callback !== void(0)) {
                callback(sessionId);
            }
        });
    };
    Channel.prototype.loadUsers = function (session, callback) {
        var url = '/channels/' + encodeURIComponent(this.name()) + '/users';
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
            var url = '/channels/' + encodeURIComponent(this.name());
            var params = {};
            if (this.topic()) {
                var topicBody = this.topic().body;
                topicBody = topicBody.replace(/(?![\n\r\t])[\x00-\x1f\x7f]/mg, '');
                topicBody = topicBody.substring(0, 1024);
                if (lastTopicBody !== topicBody) {
                    params['topic_body'] = topicBody;
                    lastTopicBody = topicBody
                }
            }
            params.privacy = this.privacy();
            starChat.ajaxRequest(session, url, 'PUT', params, function (sessionId, url, method, data) {
                if (callback !== void(0)) {
                    callback(sessionId);
                }
            });
        };
    })();
    return Channel;
})();
