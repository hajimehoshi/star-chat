'use strict';

$(function() {
    var clickChannelDel = function (view) {
        return function (channel) {
            var channelName = channel.name;
            var msg = "Are you sure you want to delete subscribing '" +
                channelName + "'?"
            if (!confirm(msg)) {
                return false;
            }
            var url = '/subscribings?' +
                'channel_name=' + encodeURIComponent(channelName) + ';' +
                'user_name=' + encodeURIComponent(view.session.userName());
            var callbacks = {
                success: updateChannelList,
                logOut: logOut,
            }
            starChat.ajax(view.session.userName(), view.session.password(),
                          url,
                          'DELETE',
                          callbacks);
            return false;
        };
    }
    var session = new starChat.Session();
    var views = {};
    function getView() {
        if (!views[session.id()]) {
            var view = new starChat.View(session);
            view.clickChannelDel(clickChannelDel(view));
            views[session.id()] = view;
        }
        return views[session.id()];
    }
    var stream = new starChat.Stream(new starChat.PacketProcessor());
    function logIn(userName, password) {
        localStorage.userName = userName;
        localStorage.password = password;
        session = new starChat.Session($.now(), userName, password);
        updateChannelList();
        var view = getView();
        view.update();
        stream.start(view);
    }
    function logOut() {
        delete localStorage.userName;
        delete localStorage.password;
        if (session.id() !== 0) {
            delete views[session.id()];
        }
        session = new starChat.Session();
        $('#messages > section[data-channel-name!=""]').remove();
        var view = getView();
        view.update();
        stream.stop();
    }
    function tryLogIn(userName, password) {
        if (!userName) {
            userName = '';
        }
        if (!password) {
            password = '';
        }
        var allAscii = /^[\x20-\x7E]*$/;
        if (!userName.match(allAscii)) {
            return;
        }
        if (!password.match(allAscii)) {
            return;
        }
        var callbacks = {
            success: function (data, textStatus, jqXHR) {
                logIn(userName, password);
            },
            logOut: logOut,
        };
        starChat.ajax(userName, password,
                      '/users/' + encodeURIComponent(userName),
                      'GET',
                      callbacks);
    }
    function updateChannelList() {
        var view = getView();
        var session = view.session;
        if (session.id() === 0) {
            return;
        }
        var url = '/users/' + encodeURIComponent(session.userName()) + '/channels';
        starChat.ajaxRequest(session, url, 'GET', null, receiveResponse);
    }
    function updateUserList() {
        var view = getView();
        var session = view.session;
        if (session.id() === 0) {
            return;
        }
        var url = '/channels/' + encodeURIComponent(view.channelName) + '/users';
        starChat.ajaxRequest(session, url, 'GET', null, receiveResponse);
    }
    function postSubscribing(channelName, userName, success) {
        if (!channelName) {
            return;
        }
        if (!userName) {
            return;
        }
        var url = '/subscribings?' +
            'channel_name=' + encodeURIComponent(channelName) + ';' +
            'user_name=' + encodeURIComponent(userName);
        var callbacks = {
            success: function (data, textStatus, jqXHR) {
                if (success !== void(0)) {
                    success();
                }
                updateChannelList();
            },
        };
        starChat.ajax(session.userName(), session.password(),
                      url,
                      'PUT',
                      callbacks);
    }

    $(window).bind('hashchange', function () {
        var view = getView();
        var session = view.session;
        if (session.id() === 0) {
            return;
        }
        var fragment = starChat.getFragment();
        var segments = fragment.split('/');
        if (segments.length !== 2) {
            return;
        }
        if (segments[0] !== 'channels') {
            return;
        }
        var channelName = segments[1];
        if (channelName === void(0)) {
            return;
        }
        channelName = decodeURIComponent(channelName);
        var isAlreadyJoined = false;
        view.channels.forEach(function (channel) {
            if (channel.name === channelName) {
                isAlreadyJoined = true;
                return false;
            }
        });
        if (isAlreadyJoined) {
            view.channelName = channelName;
            if (!(view.channelName in view.userNames)) {
                updateUserList();
            }
            view.update();
            return;
        }
        var msg = "Are you sure you want to join '" +
            channelName + "'?"
        if (confirm(msg)) {
            postSubscribing(channelName, session.userName(), function () {
                view.channelName = channelName;
                if (!(view.channelName in view.userNames)) {
                    updateUserList();
                }
            });
        }
    });

    function receiveResponse(sessionId, uri, method, data) {
        var view = getView();
        var session = view.session;
        if (session.id() === 0) {
            return;
        }
        if (session.id() !== sessionId) {
            return;
        }
        var segments = uri.split('/').filter(function (seg) {
            return $.type(seg) === 'string' && 0 < seg.length;
        }).map(function (seg) {
            return decodeURIComponent(seg);
        });
        if (segments.length <= 0) {
            return;
        }
        try {
            if (method === 'GET') {
                if (segments[0] === 'users') {
                    if (segments.length === 3 &&
                        segments[1] === session.userName() &&
                        segments[2] === 'channels') {
                        view.channels = data;
                    }
                } else if (segments[0] === 'channels') {
                    if (segments.length === 3 &&
                        segments[2] === 'users') {
                        var channelName = segments[1];
                        var userNames = {};
                        data.forEach(function (user) {
                            userNames[user.name] = true;
                        });
                        view.userNames[channelName] = userNames;
                    }
                }
            }
        } finally {
            view.update();
            $(window).trigger('hashchange');
        }
    }
    
    (function () {
        var form = $('#logInForm');
        var userName = localStorage.userName;
        var password = localStorage.password;
        if (userName) {
            tryLogIn(userName, password);
        } else {
            logOut();
        }
        form.find('input[type="submit"]').click(function (e) {
            var userName = form.find('input[name="userName"]').val();
            var password = form.find('input[name="password"]').val();
            if (!userName) {
                return false;
            }
            tryLogIn(userName, password);
            e.stopPropagation();
            return false;
        });
    })();
    (function () {
        $('#logOutLink a').click(function () {
            logOut();
            return false;
        });
    })();
    (function () {
        var form = $('#addChannelForm');
        form.find('input[type="submit"]').click(function () {
            var channelName = form.find('input[name="name"]').val();
            if (!channelName) {
                return false;
            }
            postSubscribing(channelName, session.userName(), function () {
                form.find('input[name="name"]').val('');
            });
            return false;
        });
    })();
    (function () {
        var form = $('#postMessageForm');
        var isPostingMessage = false;
        form.find('input[type="submit"]').click(function () {
            if (!session.isLoggedIn()) {
                // TODO: show alert or do something
                return false;
            }
            var view = getView();
            if (isPostingMessage) {
                return false;
            }
            if (!view.channelName) {
                return false;
            }
            var body = form.find('input[name="body"]').val();
            if (!body) {
                return false;
            }
            var url = '/channels/' + encodeURIComponent(view.channelName) +
                '/messages';
            starChat.ajaxRequest(session, url, 'POST', {
                body: body,
            }, function (sessionId, uri, method, data) {
                receiveResponse(sessionId, uri, method, data);
                form.find('input[name="body"]').val('');
            });
            isPostingMessage = true;
            setTimeout(function () {
                isPostingMessage = false;
            }, 500);
            return false;
        });
    })();
    (function () {
        $('#editChannelsLink a').click(function () {
            var view = getView();
            view.isEdittingChannels = !view.isEdittingChannels;
            view.update();
            return false;
        });
    })();
});

// Firefox Modification
$(function () {
    if (!$.browser.mozilla) {
        return;
    }
    function relayout() {
        var main = $('#main');
        $('#users').add('#channels').width(main.width() / 5);
        $('.message > .userName').each(function () {
            var self = $(this);
            self.width(self.parent().width() / 5);
        });
        $('.message > .createdAt').each(function () {
            var self = $(this);
            self.width(self.parent().width() / 20);
        });
        $('#messages > section').height($('#messages').height() -
                                        $('#messages > h2').outerHeight() -
                                        $('#messages > form').height());
    }
    var isRequestedRelayouting = false;
    $(window).resize(function () {
        isRequestedRelayouting = true;
    });
    function loop() {
        (function () {
            if (!isRequestedRelayouting) {
                return;
            }
            relayout();
        })();
        setTimeout(loop, 500);
    }
    loop();
    relayout();
});
