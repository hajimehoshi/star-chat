'use strict';

// TODO: getView should not be used because it is defined the other place
(function () {
    var onHashchange = (function () {
        var lastFragment = null;
        return function () {
            var view = getView();
            var session = view.session();
            if (session.id() === 0) {
                return;
            }
            var fragment = starChat.getFragment();
            if (fragment === lastFragment) {
                return;
            }
            lastFragment = fragment;
            view.channelName = '';
            view.resetTimeSpan();
            if (fragment.match(/^channels\//)) {
                var params = {};
                if (fragment.match(/^channels\/([^\/\?]+)(\?(.*))?$/)) {
                    var channelName = decodeURIComponent(RegExp.$1);
                    var startTime   = null;
                    var endTime     = null;
                    if (RegExp.$3) {
                        params = starChat.parseQuery(RegExp.$3);
                    }
                } else if (fragment.match(/^channels\/([^\/\?]+)\/old_logs\/by_time_span\/(\d+),(\d+)$/)) {
                    var channelName = decodeURIComponent(RegExp.$1);
                    var startTime   = starChat.parseInt(decodeURIComponent(RegExp.$2));
                    var endTime     = starChat.parseInt(decodeURIComponent(RegExp.$3));
                    view.setTimeSpan(startTime, endTime);
                } else {
                    return;
                }
                channelName = channelName.replace(/^\s*(.*?)\s*$/, '$1').replace(/(?![\n\r\t])[\x00-\x1f\x7f]/mg, '');
                channelName = channelName.substring(0, 32);
                var isAlreadyJoined = false;
                view.session().user().channels().forEach(function (channel) {
                    if (channel.name() === channelName) {
                        isAlreadyJoined = true;
                        return false;
                    }
                });
                if (isAlreadyJoined || view.isShowingOldLogs()) {
                    var channel = starChat.Channel.find(channelName);
                    channel.loadUsers(view.session(), function (sessionId) {
                        var view = getView();
                        if (view.session().id() !== sessionId) {
                            return;
                        }
                        view.channelName = channelName;
                        if ($.isNumeric(startTime) && $.isNumeric(endTime)) {
                            var url = '/channels/' + encodeURIComponent(channelName) +
                                '/messages/by_time_span/' +
                                encodeURIComponent(String(startTime)) + ',' + encodeURIComponent(String(endTime));
                            starChat.ajaxRequest(session, url, 'GET', null, function (sessionId, uri, method, data) {
                                var view = getView();
                                if (view.session().id() !== sessionId) {
                                    return;
                                }
                                view.setOldMessages(channelName, startTime, endTime, data);
                                view.update();
                            });
                        }
                        view.update();
                    });
                    return;
                }
                // Confirming joining the new channel
                var msg = "Are you sure you want to join '" +
                    channelName + "'?"
                if (!confirm(msg)) {
                    return;
                }
                var subscribing = new starChat.Subscribing(channelName, session.user().name());
                if ('key' in params) {
                    subscribing.key(params.key);
                }
                subscribing.save(session, function (sessionId) {
                    var view = getView();
                    if (view.session().id() !== sessionId) {
                        return;
                    }
                    view.channelName = channelName;
                    view.update();
                    var channel = starChat.Channel.find(channelName);
                    channel.loadUsers(view.session(), function () {
                        var view = getView();
                        if (view.session().id() !== sessionId) {
                            return;
                        }
                        view.update();
                    });
                });
                return false;
            }
        }
    })();

    $(window).bind('hashchange', onHashchange);
})();
