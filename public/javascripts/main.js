'use strict';

$(function() {
    var clickChannel = function (view) {
        return function (channel) {
            view.channelName = channel.name;
            if (!(view.channelName in view.userNames)) {
                updateUserList();
            }
            view.update();
            return false;
        };
    }
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
    // TODO: channel page state (dirty)
    var views = {};
    function getView() {
        if (!views[session.id()]) {
            var view = new starChat.View(session);
            view.clickChannel(clickChannel(view)).clickChannelDel(clickChannelDel(view));
            views[session.id()] = view;
        }
        return views[session.id()];
    }
    function processPacketMessage(obj, view) {
        var channelName = obj.channel_name;
        var message = obj.message;
        if (channelName && message) {
            if (!view.newMessages[channelName]) {
                view.newMessages[channelName] = [];
            }
            view.newMessages[channelName].push(message);
            var view = getView();
            if (channelName === view.channelName) {
                view.update();
            }
        }
    }
    function processPacketSubscribing(obj, view) {
        var channelName = obj.channel_name;
        if (!(channelName in view.userNames)) {
            view.userNames[channelName] = {};
        }
        var userNames = view.userNames[channelName];
        userNames[obj.user_name] = true;
        var view = getView();
        if (channelName === view.channelName) {
            view.update();
        }
    }
    function processPacketDeleteSubscribing(obj, view) {
        var channelName = obj.channel_name;
        if (!(channelName in view.userNames)) {
            view.userNames[channelName] = {};
            return;
        }
        var userNames = view.userNames[channelName];
        delete userNames[obj.user_name];
        var view = getView();
        if (channelName === view.channelName) {
            view.update();
        }
    }
    function startStream() {
        var view = getView();
        if (view.stream) {
            view.stream.abort();
        }
        view.stream = null;
        var streamReadIndex = 0;
        var url = '/users/' + encodeURIComponent(session.userName()) + '/stream';
        var callbacks = {
            onprogress: function () {
                // TODO: Reconnecting if overflow
                var xhr = this;
                var text = xhr.responseText;
                var subText = text.substring(streamReadIndex);
                while (true) {
                    var tokenLength = subText.search("\n");
                    if (tokenLength === -1) {
                        break;
                    }
                    streamReadIndex += tokenLength + 1;
                    var token = subText.substring(0, tokenLength);
                    subText = subText.substring(tokenLength + 1);
                    try {
                        var obj = JSON.parse(token);
                    } catch (e) {
                        console.log(e);
                        continue;
                    }
                    if (obj.type === 'message') {
                        processPacketMessage(obj, view);
                    } else if (obj.type === 'subscribing') {
                        processPacketSubscribing(obj, view);
                    } else if (obj.type === 'delete_subscribing') {
                        processPacketDeleteSubscribing(obj, view);
                    }
                }
            },
            success: function (data, textStatus, jqXHR) {
                view.streamContinuingErrorNum = 0;
                setTimeout(startStream, 0);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(textStatus);
                view.streamContinuingErrorNum++;
                if (10 <= view.streamContinuingErrorNum) {
                    console.log('Too many errors!');
                    // TODO: implement showing error message
                    return;
                }
                setTimeout(startStream, 10000);
            },
        };
        starChat.ajax(session.userName(), session.password(),
                      url,
                      'GET',
                      callbacks);
    }
    function stopStream() {
        var view = getView();
        if (view.stream) {
            view.stream.abort();
        }
        view.stream = null;
        view.streamContinuingErrorNum = 0;
    }
    function logIn(userName, password) {
        localStorage.userName = userName;
        localStorage.password = password;
        session = new starChat.Session($.now(), userName, password);
        updateChannelList();
        var view = getView();
        view.update();
        startStream();
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
        stopStream();
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
        if (session.id() === 0) {
            return;
        }
        var view = getView();
        var callbacks = {
            success: function (data, textStatus, jqXHR) {
                view.channels = data;
                view.update();
                if (session.id() === 0) {
                    return;
                }
                var params = starChat.getFragmentParams();
                if (!('channel_name' in params)) {
                    return;
                }
                var channelName = params['channel_name'];
                var isAlreadyJoined = false;
                $.each(view.channels, function (i, channel) {
                    if (channel.name === channelName) {
                        isAlreadyJoined = true;
                        return false;
                    }
                });
                try {
                    if (isAlreadyJoined) {
                        view.channelName = channelName;
                        view.update();
                        return;
                    }
                    var msg = "Are you sure you want to join '" +
                        channelName + "'?"
                    if (confirm(msg)) {
                        postSubscribing(channelName, session.userName(), function () {
                            view.channelName = channelName;
                        });
                    }
                } finally {
                    delete params['channel_name'];
                    starChat.setFragmentParams(params);
                }
            },
            logOut: logOut,
        }
        var url = '/users/' + encodeURIComponent(session.userName()) + '/channels';
        starChat.ajax(session.userName(), session.password(),
                      url,
                      'GET',
                      callbacks);
    }
    function updateUserList() {
        var view = getView();
        var channelName = view.channelName;
        var callbacks = {
            success: function success(data, textStatus, jqXHR) {
                if (!view.userNames[channelName]) {
                    view.userNames[channelName] = {};
                }
                var userNames = view.userNames[channelName];
                $.each(data, function (i, user) {
                    userNames[user.name] = true;
                });
                if (channelName === getView().channelName) {
                    view.update();
                }
            },
            logOut: logOut,
        };
        var url = '/channels/' + encodeURIComponent(channelName) + '/users';
        starChat.ajax(session.userName(), session.password(),
                      url,
                      'GET',
                      callbacks);
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
            logOut: logOut,
        };
        starChat.ajax(session.userName(), session.password(),
                      url,
                      'PUT',
                      callbacks);
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
        form.find('input[type="submit"]').click(function () {
            if (!session.isLoggedIn()) {
                // TODO: show alert or do something
                return false;
            }
            var view = getView();
            if (view.isPostingMessage) {
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
            var callbacks = {
                success: function (data, textStatus, jqXHR) {
                    form.find('input[name="body"]').val('');
                },
                logOut: logOut,
                complete: function (jqXHR, textStatus) {
                    view.isPostingMessage = false;
                },
            }
            starChat.ajax(session.userName(), session.password(),
                          url,
                          'POST',
                          callbacks,
                          {
                              body: body,
                          });
            view.isPostingMessage = true;
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
