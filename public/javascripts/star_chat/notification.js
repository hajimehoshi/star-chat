'use strict';

/**
 * @type {Object}
 */
starChat.Notification = {};

/**
 * @return {undefined}
 */
starChat.Notification.requestPermission = function () {
    if (!window.webkitNotifications) {
        return;
    }
    /*if (!window.webkitNotifications.checkPermission() === 0) {
        return;
        
    }*/
    window.webkitNotifications.requestPermission();
};

/**
 * @param {string} title
 * @param {string} body
 * @return {undefined}
 */
starChat.Notification.notify = function (title, body) {
    if (!window.webkitNotifications) {
        return;
    }
    if (window.webkitNotifications.checkPermission() !== 0) {
        return;
    }
    var n = window.webkitNotifications.createNotification('', title, body);
    n.show();
};
