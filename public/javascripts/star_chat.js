'use strict';

var starChat = {};

/**
 * @param {string|number} val
 * @return {number}
 * @nosideeffects
 */
starChat.parseInt = function (val) {
    return window.parseInt(val, 10);
};

/**
 * @param {Array} a
 * @param {Array} b
 * @param {function(*,*):boolean} func
 * @return {boolean}
 */
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

/**
 * @param {starChat.Session} session
 * @param {string} url
 * @param {string} method
 * @param {Object} data
 * @param {function(number,string,string,Object)=} callbackSuccess
 * @param {Object=} options
 * @return {!jQuery.jqXHR}
 */
starChat.ajaxRequest = function (session, url, method, data, callbackSuccess, options) {
    var sessionId = session.id();
    var userName  = session.userName();
    var password  = session.password();
    var beforeSend = function (xhr) {
        xhr.setRequestHeader('Authorization',
                             'Basic ' + btoa(userName + ':' + password));
        if (options && 'headers' in options) {
            var headers = options.headers;
            Object.keys(headers).forEach(function (key) {
                xhr.setRequestHeader(key, headers[key]);
            });
        };
    }
    var args = {
        url:        url,
        type:       method,
        cache:      false,
        beforeSend: beforeSend,
        dataType:   'json',
        statusCode: {
            401: function () {
                if ('401' in options) {
                    options[401]();
                }
            }
        }
    }
    if (callbackSuccess !== void(0) &&
        callbackSuccess !== null) {
        args.success = function (data, textStatus, jqXHR) {
            callbackSuccess(sessionId, url, method, data);
        };
    }
    if (data) {
        args.data = data;
    }
    /**
     * @type {!jQuery.jqXHR}
     */
    return $.ajax(args);
};

/**
 * @return {string}
 */
starChat.getFragment = function () {
    if ($.browser.mozilla) {
        // Firefox mixes '%3F' and '?' in location.hash.
        // Instead, use location.href to retain these characters.
        var match;
        if (match = location.href.match(/#([^#]+)$/)) {
            return match[1];
        } else {
            return '';
        }
    }
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

/**
 * @param {string} str
 * @return {Object.<string,string>}
 */
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

/**
 * @param {Date|Number} date
 * @param {string=} type
 * @return {string}
 */
starChat.toISO8601 = function (date, type) {
    if ($.isNumeric(date)) {
        date = new Date(date * 1000);
    }
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

/**
 * @param {string} str
 * @return {number}
 */
starChat.toUNIXTime = function (str) {
    var match;
    if (match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)) {
        var year  = starChat.parseInt(match[1]);
        var month = starChat.parseInt(match[2]);
        var day   = starChat.parseInt(match[3]);
        return Math.floor(new Date(year, month - 1, day).getTime() / 1000);
    } else {
        throw "Sorry, other formats are not implemented."
    }
};

starChat.escapeHTML = function (str) {
    return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

/**
 * @suppress {globalThis}
 */
jQuery.fn.outerHTML = function(s) {
    return (s)
        ? this.before(s).remove()
        : jQuery("<p>").append(this.eq(0).clone()).html();
}

/**
 * @param {!jQuery} element
 * @param {string} keyword
 * @return {number}
 */
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

/**
 * @param {!jQuery} element
 * @return {number}
 */
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

/**
 * @param {!jQuery} element
 * @return {number}
 */
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

/**
 * @return {boolean}
 */
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

/**
 * @param {string} str1
 * @param {string} str2
 * @return {string}
 */
starChat.getCommonHead = function (str1, str2) {
    var length = Math.min(str1.length, str2.length);
    var str = '';
    for (var i = 0; i < length; i++) {
        var c1 = str1.charAt(i);
        var c2 = str2.charAt(i);
        if (c1 !== c2) {
            return str;
        }
        str += c1;
    }
    return str;
};
