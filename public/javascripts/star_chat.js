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

starChat.ajax = function (userName, password, url, method, callbacks, data) {
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
    return $.ajax(args);
};

starChat.getFragment = function () {
    var fragment = location.hash;
    if (fragment[0] === '#') {
        fragment = fragment.substring(1);
    }
    return fragment;
}

starChat.clearFragment = function () {
    var newURL = location.href;
    var i = newURL.indexOf('#');
    if (i !== -1) {
        newURL = newURL.substring(0, i);
    }
    history.replaceState($.now(), null, newURL);
}
