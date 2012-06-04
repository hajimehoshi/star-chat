'use strict';

starChat.Session = (function () {
    /**
     * @constructor
     * @param {number} id
     * @param {string} userName
     * @param {string} password
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
    /**
     * @return {boolean}
     * @nosideeffects
     */
    Session.prototype.isLoggedIn = function () {
        return this.id_ !== 0;
    };
    /**
     * @return {string}
     * @nosideeffects
     */
    Session.prototype.password = function () {
        return this.password_;
    };
    /**
     * @return {string}
     * @nosideeffects
     */
    Session.prototype.user = function () {
        return this.user_;
    }
    /**
     * @return {string}
     * @nosideeffects
     */
    Session.prototype.userName = function () {
        return this.user_.name();
    };
    /**
     * @return {number}
     * @nosideeffects
     */
    Session.prototype.id = function () {
        return this.id_;
    };
    return Session;
})();
