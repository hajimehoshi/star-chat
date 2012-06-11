'use strict';

/**
 * @constructor
 * @param {number} id
 * @param {string} userName
 * @param {string} password
 */
starChat.Session = function (id, userName, password) {
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
 */
starChat.Session.prototype.isLoggedIn = function () {
    return this.id_ !== 0;
};

/**
 * @return {string}
 */
starChat.Session.prototype.password = function () {
    return this.password_;
};

/**
 * @return {starChat.User}
 */
starChat.Session.prototype.user = function () {
    return this.user_;
}

/**
 * @return {string}
 */
starChat.Session.prototype.userName = function () {
    return this.user_.name();
};

/**
 * @return {number}
 */
starChat.Session.prototype.id = function () {
    return this.id_;
};
