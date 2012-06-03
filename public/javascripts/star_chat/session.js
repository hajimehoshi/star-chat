'use strict';

/**
 * @typedef {!Object}
 */
starChat.Session = (function () {
    /**
     * @constructor
     */
    var Session = function (id, userName, password) {
        if (id !== void(0)) {
            this.id_ = id;
        } else {
            this.id_ = 0;
        }
        if (this.id_) {
            this.user_ = starChat.User.find(userName);
            this.password_ = password;
        }
    };
    Session.prototype.isLoggedIn = function () {
        return this.id_ !== 0;
    };
    Session.prototype.password = function () {
        return this.password_;
    };
    Session.prototype.user = function () {
        return this.user_;
    }
    Session.prototype.userName = function () {
        return this.user_.name();
    };
    Session.prototype.id = function () {
        return this.id_;
    };
    return Session;
})();
