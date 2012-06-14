'use strict';

/**
 * @constructor
 * @param {string} name
 */
starChat.User = function (name) {
    /**
     * @private
     * @type {string}
     */
    this.name_ = name;
    /**
     * @private
     * @type {string}
     */
    this.nick_ = name;
    /**
     * @private
     * @type {!Array.<!starChat.Channel>}
     */
    this.channels_ = [];
    /**
     * @private
     * @type {!Array.<string>}
     */
    this.keywords_ = [];
};

/**
 * @param {string} name
 * @return {!starChat.User}
 */
starChat.User.find = (function () {
    var cache = {};
    return function (name) {
        if (name in cache) {
            return cache[name];
        }
        return cache[name] = new starChat.User(name);
    };
})();

/**
 * @param {!Object.<string,*>} obj
 * @return {undefined}
 */
starChat.User.prototype.update = function (obj) {
    if ('nick' in obj) {
        this.nick_ = obj.nick;
    }
    if ('keywords' in obj) {
        this.keywords_ = obj.keywords;
    }
};

/**
 * @return {string}
 */
starChat.User.prototype.name = function () {
    return this.name_;
};

/**
 * @param {string=} value
 * @return {!starChat.User|string}
 */
starChat.User.prototype.nick = function (value) {
    if (value !== void(0)) {
        this.nick_ = value;
        return this;
    } else {
        return this.nick_;
    }
};

/**
 * @return {!Array.<!starChat.Channel>}
 */
starChat.User.prototype.channels = function () {
    return this.channels_;
};

/**
 * @param {string} name
 * @return {undefined}
 */
starChat.User.prototype.addChannel = function(name) {
    var r = $.grep(this.channels_, function (channel) {
        return channel.name() === name;
    });
    if (r.length === 0) {
        this.channels_.push(starChat.Channel.find(name));
    }
};

/**
 * @param {string} name
 * @return {undefined}
 */
starChat.User.prototype.removeChannel = function(name) {
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

/**
 * @param {!Array.<string>=} keywords
 * @return {!starChat.User|!Array.<string>}
 */
starChat.User.prototype.keywords = function (keywords) {
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

/**
 * @param {!starChat.Session} session
 * @param {function(number)=} callback
 * @return {undefined}
 */
starChat.User.prototype.load = function (session, callback) {
    var url = '/users/' + encodeURIComponent(this.name_);
    var self = this;
    starChat.ajaxRequest(session, url, 'GET', null, function (sessionId, url, method, data) {
        self.keywords_ = data.keywords;
        if (callback !== void(0)) {
            callback(sessionId);
        }
    });
};

/**
 * @param {!starChat.Session} session
 * @param {function(number)=} callback
 * @return {undefined}
 */
starChat.User.prototype.loadChannels = function (session, callback) {
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

/**
 * @param {!starChat.Session} session
 * @param {function(number)=} callback
 * @return {undefined}
 */
starChat.User.prototype.save = function (session, callback) {
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
