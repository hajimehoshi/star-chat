'use strict';

starChat.User = (function () {
    var User = function (name) {
        this.name_ = name;
        this.keywords_ = [];
    };
    User.prototype.name = function () {
        return this.name_;
    };
    User.prototype.keywords = function (value) {
        if (value !== void(0)) {
            if (!$.isArray(value)) {
                throw 'Invalid assignment: value is not an array';
            }
            this.keywords_ = value;
            return this;
        } else {
            return this.keywords_;
        }
    };
    User.prototype.save = function (session, callback) {
        var url = '/users/' + encodeURIComponent(this.name_);
        starChat.ajaxRequest(session, url, 'PUT', {
            keywords: this.keywords_,
        }, function (sessionId, url, method, data) {
            callback(sessionId, url, method, data);
        });
    };
    return User;
})();
