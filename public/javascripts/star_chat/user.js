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
    return User;
})();
