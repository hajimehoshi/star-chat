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

starChat.ajaxRequest = function (session, url, method, data, callbackSuccess, callbackComplete) {
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
    }
    if (callbackSuccess !== void(0)) {
        args.success = function (data, textStatus, jqXHR) {
            callbackSuccess(sessionId, url, method, data);
        };
    }
    if (callbackComplete !== void(0)) {
        args.complete = function (jqXHR, textStatus) {
            callbackComplete();
        }
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

starChat.toISO8601 = function (date, type) {
    if (type === void(0)) {
        type = 'datetime';
    }
    function fillZero(d) {
        if (d < 10) {
            return '0' + d;
        } else {
            return d;
        }
    }
    if (type === 'datetime') {
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
    } else if (type === 'date') {
        return date.getFullYear() + '-' +
            fillZero(date.getMonth() + 1) + '-' +
            fillZero(date.getDate());
    } else if (type === 'hourMinute') {
        return fillZero(date.getHours()) + ':' +
            fillZero(date.getMinutes());
    }
};

starChat.escapeHTML = function (str) {
    return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

jQuery.fn.outerHTML = function(s) {
    return (s)
        ? this.before(s).remove()
        : jQuery("<p>").append(this.eq(0).clone()).html();
}

starChat.emphasizeKeyword = function (element, keyword) {
    if (!keyword) {
        return 0;
    }
    var num = 0;
    var html = '';
    element.contents().each(function () {
        if (this.nodeType === Node.TEXT_NODE) {
            var text = this.nodeValue;
            var segments = text.split(keyword);
            num += segments.length - 1;
            html += segments.map(function (segment) {
                return starChat.escapeHTML(segment);
            }).join('<em>' + starChat.escapeHTML(keyword) + '</em>');
        } else if (this.nodeType === Node.ELEMENT_NODE && this.tagName.toLowerCase() !== 'em') {
            num += starChat.emphasizeKeyword($(this), keyword);
            html += $(this).outerHTML();
        } else {
            html += $(this).outerHTML();
        }
    });
    element.html(html);
    return num;
};

starChat.replaceBreakLines = function (element) {
    var num = 0;
    var html = '';
    element.contents().each(function () {
        if (this.nodeType === Node.TEXT_NODE) {
            var text = this.nodeValue;
            text = text.replace(/\r\n/gm, '\n').replace(/\r/gm, '\n');
            var segments = text.split(/\n/gm);
            segments = segments.filter(function (segment) {
                return segment !== void(0);
            });
            num += segments.length - 1;
            html += segments.map(function (segment) {
                return starChat.escapeHTML(segment);
            }).join('<br />');
        } else {
            num += starChat.replaceBreakLines($(this));
            html += $(this).outerHTML();
        }
    });
    element.html(html);
    return num;
};

starChat.replaceURLWithLinks = function (element) {
    var num = 0;
    var html = '';
    element.contents().each(function () {
        if (this.nodeType === Node.TEXT_NODE) {
            var text = this.nodeValue;
            // escapeText should not inlucde '&#x20;' or somthing escaped unexpectedly.
            var escapedText = starChat.escapeHTML(text);
            html += escapedText.replace(/(https?:\/\/[\x21-\x7e]+)/mg, function (escapedURL) {
                num += 1;
                return '<a href="' + escapedURL + '">' + escapedURL + '</a>';
            });
        } else {
            num += starChat.replaceURLWithLinks($(this));
            html += $(this).outerHTML();
        }
    });
    element.html(html);
    return num;
};

starChat.isFocused = (function () {
    var isFocused_ = true;
    $(window).focus(function () {
        isFocused_ = true;
    }).blur(function () {
        isFocused_ = false;
    })
    return function () {
        return isFocused_;
    };
})();
