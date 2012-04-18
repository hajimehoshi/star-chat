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
    $.ajax(args);
};

starChat.getQueryParams = function () {
    var params = {};
    var pairsStr = location.search.substring(1).split(';');
    $.each(pairsStr, function (i, pairStr) {
        var pair = pairStr.split('=');
        var key = decodeURIComponent(pair[0]);
        if (!key) {
            return;
        }
        var value = decodeURIComponent(pair[1]);
        if (value === void(0)) {
            value = '';
        }
        if (!(key in params)) {
            params[key] = value;
        }
    });
    return params;
};

starChat.setQueryParams = function (params) {
    var state = (new Date()).getTime();
    var newURL = location.origin + location.pathname;
    if (params) {
        var pairsStr = $.map(params, function(value, key) {
            return encodeURIComponent(key) + '=' +
                encodeURIComponent(value);
        }).join(';');
        if (0 < pairsStr.length) {
            newURL += '?' + pairsStr;
        }
    }
    console.log(newURL);
    history.replaceState(state, null, newURL);
};
