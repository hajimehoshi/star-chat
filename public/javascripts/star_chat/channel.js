'use strict';

starChat.Channel = (function () {
    /**
     * @constructor
     */
    var Channel = function (obj) {
        var name = obj.name;
        name = name.replace(/^\s*(.*?)\s*$/, '$1').replace(/(?![\n\r\t])[\x00-\x1f\x7f]/mg, '');
        name = name.substring(0, 32);
        this.name_               = name;
        this.users_              = [];
        this.messagesByTimeSpan_ = {};
        this.firstMessage_       = null;
        this.update(obj);
    };
    var cache = {};
    Channel.find = function (name) {
        if (name in cache) {
            return cache[name];
        }
        return cache[name] = new Channel({
            name: name
        });
    };
    Channel.prototype.update = function (obj) {
        if ('topic' in obj) {
            this.topic_ = obj.topic;
        }
        if ('privacy' in obj) {
            this.privacy_ = obj.privacy;
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
    Channel.prototype.firstMessage = function () {
        return this.firstMessage_;
    };
    Channel.prototype.messagesByTimespan = function (startTime, endTime) {
        var key = startTime + ',' + endTime;
        if (key in this.messagesByTimeSpan_) {
            return this.messagesByTimeSpan_[key];
        } else {
            return [];
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
    Channel.prototype.loadFirstMessage = function (session, callback) {
        var url = '/channels/' + encodeURIComponent(this.name()) + '/messages/by_index/1,1';
        var self = this;
        starChat.ajaxRequest(session, url, 'GET', null, function (sessionId, url, method, data) {
            self.firstMessage_ = data[0];
            if (callback !== void(0)) {
                callback(sessionId, data.key);
            }
        });
    };
    Channel.prototype.loadMessagesByTimeSpan = function (session, startTime, endTime, callback) {
        var url = '/channels/' + encodeURIComponent(this.name()) + '/messages/by_time_span/' +
            encodeURIComponent(startTime) + ',' + encodeURIComponent(endTime);
        var self = this;
        starChat.ajaxRequest(session, url, 'GET', null, function (sessionId, url, method, data) {
            var key = startTime + ',' + endTime;
            self.messagesByTimeSpan[key] = data;
            if (callback !== void(0)) {
                callback(sessionId, data.key);
            }
        });
    };
    Channel.prototype.generateKey = function (session, callback) {
        var url = '/channels/' + encodeURIComponent(this.name()) + '/keys';
        var self = this;
        starChat.ajaxRequest(session, url, 'POST', null, function (sessionId, url, method, data) {
            if (callback !== void(0)) {
                callback(sessionId, data.key);
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
                topicBody = topicBody.replace(/^\s*(.*?)\s*$/, '$1').replace(/(?![\n\r\t])[\x00-\x1f\x7f]/mg, '');
                topicBody = topicBody.substring(0, 1024);
                if (lastTopicBody !== topicBody) {
                    params.topic = {
                        body: topicBody
                    }
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
