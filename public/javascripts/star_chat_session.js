starChat.Session = (function () {
    var Session = function (id, userName, password) {
        if (id !== void(0)) {
            this.id_ = id;
        } else {
            this.id_ = 0;
        }
        if (this.id_) {
            this.userName_ = userName;
            this.password_ = password;
        }
    };
    Session.prototype.isLoggedIn = function () {
        return this.id_ !== 0;
    };
    Session.prototype.password = function () {
        return this.password_;
    };
    Session.prototype.userName = function () {
        return this.userName_;
    };
    Session.prototype.id = function () {
        return this.id_;
    };
    return Session;
})();