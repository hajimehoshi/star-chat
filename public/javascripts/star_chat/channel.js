'use strict';

/**
 * @constructor
 * @param {Object.<string,*>} obj
 */
starChat.Channel = function (obj) {
    var name = obj.name;
    name = name.replace(/^\s*(.*?)\s*$/, '$1').replace(/(?![\n\r\t])[\x00-\x1f\x7f]/mg, '');
    name = name.substring(0, 32);
    this.name_               = name;
    this.users_              = [];
    this.messagesByTimeSpan_ = {};
    this.firstMessage_       = null;
    this.update(obj);
};

/**
 * @param {!string} name
 * @return {starChat.Channel}
 */
starChat.Channel.find = (function () {
    var cache = {};
    return function (name) {
        if (name in cache) {
            return cache[name];
        }
        return cache[name] = new starChat.Channel({
            name: name
        });
    };
})();

/**
 * @param {Object.<string,*>} obj
 */
starChat.Channel.prototype.update = function (obj) {
    if ('topic' in obj) {
        this.topic_ = obj.topic;
    }
    if ('privacy' in obj) {
        this.privacy_ = obj.privacy;
    }
};

/**
 * @return {string}
 */
starChat.Channel.prototype.name = function () {
    return this.name_;
};

/**
 * @param {Object.<string,*>=} topic
 * @return {starChat.Channel|Object.<string,*>}
 */
starChat.Channel.prototype.topic = function (topic) {
    if (topic !== void(0)) {
        this.topic_ = topic;
        return this;
    } else {
        return this.topic_;
    }
};

/**
 * @param {string=} privacy
 * @return {starChat.Channel|string}
 */
starChat.Channel.prototype.privacy = function (privacy) {
    if (privacy !== void(0)) {
        if (privacy == 'public' || privacy == 'private') {
            this.privacy_ = privacy;
        }
        return this;
    } else {
        return this.privacy_;
    }
};

/**
 * @return {Array.<starChat.User>}
 */
starChat.Channel.prototype.users = function () {
    return this.users_;
};

/**
 * @param {string} name
 */
starChat.Channel.prototype.addUser = function (name) {
    var r = $.grep(this.users_, function (user) {
        return user.name() === name;
    });
    if (r.length === 0) {
        this.users_.push(starChat.User.find(name));
    }
};

/**
 * @param {string} name
 */
starChat.Channel.prototype.removeUser = function (name) {
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

/**
 * @return {Object.<string,*>}
 */
starChat.Channel.prototype.firstMessage = function () {
    return this.firstMessage_;
};

/**
 * @param {number} startTime
 * @param {number} endTime
 */
starChat.Channel.prototype.messagesByTimespan = function (startTime, endTime) {
    var key = startTime + ',' + endTime;
    if (key in this.messagesByTimeSpan_) {
        return this.messagesByTimeSpan_[key];
    } else {
        return [];
    }
};

/**
 * @param {!starChat.Session} session
 * @param {function(number)=} callback
 */
starChat.Channel.prototype.load = function (session, callback) {
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

/**
 * @param {!starChat.Session} session
 * @param {function(number)=} callback
 */
starChat.Channel.prototype.loadUsers = function (session, callback) {
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

/**
 * @param {!starChat.Session} session
 * @param {function(number, Array.<string,*>)=} callback
 */
starChat.Channel.prototype.loadFirstMessage = function (session, callback) {
    var url = '/channels/' + encodeURIComponent(this.name()) + '/messages/by_index/0,1';
    var self = this;
    starChat.ajaxRequest(session, url, 'GET', null, function (sessionId, url, method, data) {
        self.firstMessage_ = data[0];
        if (callback !== void(0)) {
            callback(sessionId, data);
        }
    });
};

/**
 * @param {!starChat.Session} session
 * @param {number} startTime
 * @param {number} endTime
 * @param {function(number, Array.<string,*>)=} callback
 */
starChat.Channel.prototype.loadMessagesByTimeSpan = function (session, startTime, endTime, callback) {
    var url = '/channels/' + encodeURIComponent(this.name()) + '/messages/by_time_span/' +
        encodeURIComponent(String(startTime)) + ',' + encodeURIComponent(String(endTime));
    var self = this;
    starChat.ajaxRequest(session, url, 'GET', null, function (sessionId, url, method, data) {
        var key = startTime + ',' + endTime;
        self.messagesByTimeSpan_[key] = data;
        if (callback !== void(0)) {
            callback(sessionId, data);
        }
    });
};

/**
 * @param {!starChat.Session} session
 * @param {function(number, string)=} callback
 */
starChat.Channel.prototype.generateKey = function (session, callback) {
    var url = '/channels/' + encodeURIComponent(this.name()) + '/keys';
    var self = this;
    starChat.ajaxRequest(session, url, 'POST', null, function (sessionId, url, method, data) {
        if (callback !== void(0)) {
            callback(sessionId, data.key);
        }
    });
};

/**
 * @param {!starChat.Session} session
 * @param {function(number)=} callback
 */
starChat.Channel.prototype.save = (function () {
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
