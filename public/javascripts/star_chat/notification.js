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
 * @param {string} str
 * @return {undefined}
 */
starChat.Notification.notify = function (str) {
    if (!window.webkitNotifications) {
        return;
    }
    if (window.webkitNotifications.checkPermission() !== 0) {
        return;
    }
    var n = window.webkitNotifications.createNotification('', 'StarChat', str);
    n.show();
};
