'use strict';

var starChat = {};

starChat.isSameArray = function (a, b, func) {
    if (!func) {
        func = function (x, y) {
            return x === y;
        };
    }
    if (a.length !== b.length) {
        return false;
    }
    for (var i = 0; i < a.length; i++) {
        if (!func(a[i], b[i])) {
            return false;
        }
    }
    return true;
};

starChat.getAddAuthHeaderFunc = function (userName, password) {
    return function (xhr) {
        xhr.setRequestHeader('Authorization',
                             'Basic ' + btoa(userName + ':' + password));
    }
};

starChat.ajax = function (userName, password, url, method, callbacks, data, sessionId) {
    var args = {
        url: url,
        type: method,
        cache: false,
        beforeSend: starChat.getAddAuthHeaderFunc(userName, password),
        dataType: 'json',
        statusCode: {},
    }
    if (data) {
        args.data = data;
    }
    if ('logOut' in callbacks) {
        args.statusCode[401] = callbacks.logOut;
    }
    if ('onprogress' in callbacks) {
        args.xhrFields = {
            onprogress: callbacks.onprogress,
        };
    }
    if ('success' in callbacks) {
        args.success = callbacks.success;
    }
    if ('error' in callbacks) {
        args.error = callbacks.error;
    }
    if ('complete' in callbacks) {
        args.complete = callbacks.complete;
    }
    var jq = $.ajax(args)
    jq.starChatRequestURI = url;
    if ($.isNumeric(sessionId)) {
        jq.starChatSessionId = sessionId;
    }
    return jq;
};

starChat.ajaxRequest = function (session, url, method, data, callback) {
    var sessionId = session.id();
    var userName  = session.userName();
    var password  = session.password();
    var args = {
        url: url,
        type: method,
        cache: false,
        beforeSend: starChat.getAddAuthHeaderFunc(userName, password),
        dataType: 'json',
        statusCode: {},
        success: function (data, textStatus, jqXHR) {
            callback(sessionId, url, method, data);
        },
    }
    if (data) {
        args.data = data;
    }
    return $.ajax(args);
};

starChat.getFragment = function () {
    var fragment = location.hash;
    if (fragment[0] === '#') {
        fragment = fragment.substring(1);
    }
    return fragment;
};

starChat.clearFragment = function () {
    var newURL = location.href;
    var i = newURL.indexOf('#');
    if (i !== -1) {
        newURL = newURL.substring(0, i);
    }
    history.replaceState($.now(), null, newURL);
};

starChat.parseQuery = function (str) {
    var i = str.indexOf('?');
    if (i !== -1) {
        str = str.substring(i + 1);
    }
    var params = {};
    str.split(';').forEach(function (pair) {
        if ($.type(pair) !== 'string') {
            return true;
        }
        var pairArr = pair.split('=');
        if (pairArr.length === 0) {
            return true;
        }
        var key   = decodeURIComponent(pairArr[0]);
        var value = '';
        if (2 <= pairArr.length) {
            value = decodeURIComponent(pairArr[1]);
        }
        params[key] = value;
    });
    return params;
};

starChat.toISO8601 = function (date) {
    function fillZero(d) {
        if (d < 10) {
            return '0' + d;
        } else {
            return d;
        }
    }
    var offsetSeconds = date.getTimezoneOffset();
    var offset =
        (offsetSeconds <= 0 ? '+' : '-') +
        fillZero(Math.abs(offsetSeconds) / 60) + ':' +
        fillZero(Math.abs(offsetSeconds) % 60);
    return date.getFullYear() + '-' +
        fillZero(date.getMonth() + 1) + '-' +
        fillZero(date.getDate()) + 'T' +
        fillZero(date.getHours()) + ':' +
        fillZero(date.getMinutes()) + ':' +
        fillZero(date.getSeconds()) + offset;
};
