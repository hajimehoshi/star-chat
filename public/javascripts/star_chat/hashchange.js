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
                var match;
                if (match = fragment.match(/^channels\/([^\/\?]+)(\?(.*))?$/)) {
                    var channelName = decodeURIComponent(match[1]);
                    var startTime   = null;
                    var endTime     = null;
                    if (match[3]) {
                        params = starChat.parseQuery(match[3]);
                    }
                } else if (match = fragment.match(/^channels\/([^\/\?]+)\/old_logs\/by_time\/(\d+)$/)) {
                    var channelName = decodeURIComponent(match[1]);
                    var time        = starChat.parseInt(decodeURIComponent(match[2]));
                    view.setTime(time);
                } else if (match = fragment.match(/^channels\/([^\/\?]+)\/old_logs\/by_time_span\/(\d+),(\d+)$/)) {
                    var channelName = decodeURIComponent(match[1]);
                    var startTime   = starChat.parseInt(decodeURIComponent(match[2]));
                    var endTime     = starChat.parseInt(decodeURIComponent(match[3]));
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
                    var channel = starChat.Channel.find(channelName);
                    if (!channel.firstMessage()) {
                        channel.loadFirstMessage(session, function (sessionId) {
                            var view = getView();
                            if (view.session().id() !== sessionId) {
                                return;
                            }
                            if (!channel.firstMessage()) {
                                return;
                            }
                            view.update();
                        });
                    }
                    view.channelName = channelName;
                    view.update();
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
                    if (!channel.firstMessage()) {
                        channel.loadFirstMessage(session, function (sessionId) {
                            var view = getView();
                            if (view.session().id() !== sessionId) {
                                return;
                            }
                            if (!channel.firstMessage()) {
                                return;
                            }
                            view.update();
                        });
                    }
                });
                return false;
            }
        }
    })();

    $(window).bind('hashchange', onHashchange);
})();
