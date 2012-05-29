'use strict';

starChat.Channel = (function () {
    var Channel = function (name) {
        this.name_ = name;
        this.topic_ = {};
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
})();
