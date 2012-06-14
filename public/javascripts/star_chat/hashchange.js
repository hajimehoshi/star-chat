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
            $('#timeline').hide();
            view.channelName = '';
            if (fragment.match(/^channels\//)) {
                var params = {};
                var match;
                if (match = fragment.match(/^channels\/([^\/\?]+)(\?(.*))?$/)) {
                    var channelName = decodeURIComponent(match[1]);
                    if (match[3]) {
                        params = starChat.parseQuery(match[3]);
                    }
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
                if (isAlreadyJoined) {
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
                    channel.loadRecentMessages(session, function (sessionId, data) {
                        var view = getView();
                        if (view.session().id() !== sessionId) {
                            return;
                        }
                        data.forEach(function (message) {
                            view.addNewMessage(channel.name(), message);
                        });
                        view.update();
                    });
                });
                return false;
            }
        }
    })();

    $(window).bind('hashchange', onHashchange);
})();
