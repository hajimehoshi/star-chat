'use strict';

$(function() {
    var getView = (function () {
        var view = null;
        return function () {
            if (view === null) {
                view = new starChat.View(starChat.Session);
            }
            return view;
        };
    })();
    var stream = new starChat.Stream(new starChat.PacketProcessor());
    function logIn(userName, password) {
        console.log('Logging in...');
        localStorage.userName = userName;
        localStorage.password = password;
        var view = getView();
        view.logIn(userName, password);
        view.session().user().load(view.session());
        view.session().user().loadChannels(view.session(), function (sessionId) {
            var view = getView();
            var session = view.session();
            if (session.id() !== sessionId) {
                return
            }
            var user = session.user();
            user.channels().forEach(function (channel) {
                if (!channel.name()) {
                    return;
                }
                var url = '/channels/' + encodeURIComponent(channel.name()) + '/messages/recent';
                starChat.ajaxRequest(session, url, 'GET', null, receiveResponse);
            });
        });
        stream.start(view);
    }
    function logOut() {
        console.log('Logging out...');
        delete localStorage.userName;
        delete localStorage.password;
        var view = getView();
        view.logOut();
        $('#messages > section[data-channel-name!=""]').remove();
        view.update();
        stream.stop();
        starChat.clearFragment();
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
                      '/users/' + encodeURIComponent(userName) + '/ping',
                      'GET',
                      callbacks);
    }

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
                if (fragment.match(/^channels\/([^\/]+)$/)) {
                    var channelName = decodeURIComponent(RegExp.$1);
                    var startTime   = null;
                    var endTime     = null;
                } else if (fragment.match(/^channels\/([^\/]+)\/old_logs\/by_time_span\/(\d+),(\d+)$/)) {
                    var channelName = decodeURIComponent(RegExp.$1);
                    var startTime   = parseInt(decodeURIComponent(RegExp.$2));
                    var endTime     = parseInt(decodeURIComponent(RegExp.$3));
                    view.setTimeSpan(startTime, endTime);
                } else {
                    return;
                }
                var isAlreadyJoined = false;
                view.session().user().channels().forEach(function (channel) {
                    if (channel.name() === channelName) {
                        isAlreadyJoined = true;
                        return false;
                    }
                });
                if (isAlreadyJoined || view.isShowingOldLogs()) {
                    view.channelName = channelName;
                    if ($.isNumeric(startTime) && $.isNumeric(endTime)) {
                        var url = '/channels/' + encodeURIComponent(channelName) +
                            '/messages/by_time_span/' +
                            encodeURIComponent(startTime) + ',' + encodeURIComponent(endTime);
                        starChat.ajaxRequest(session, url, 'GET', null, receiveResponse);
                    }
                    starChat.Channel.find(channelName).loadUsers(view.session(), function (sessionId) {
                        var view = getView();
                        if (view.session().id() !== sessionId) {
                            return;
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
                var url = '/subscribings?' +
                    'channel_name=' + encodeURIComponent(channelName) + ';' +
                    'user_name=' + encodeURIComponent(session.userName());
                starChat.ajaxRequest(session, url, 'PUT', null, function (sessionId, uri, method, data) {
                    receiveResponse(sessionId, uri, method, data);
                    var view = getView();
                    view.channelName = channelName;
                    view.update();
                    starChat.Channel.find(channelName).loadUsers(view.session(), function () {
                        var view = getView();
                        if (view.session().id() !== sessionId) {
                            return;
                        }
                        view.update();
                    });
                });
            }
        }
    })();

    $(window).bind('hashchange', onHashchange);

    // TODO: Remove it!!
    function receiveResponse(sessionId, uri, method, data) {
        var view = getView();
        var session = view.session();
        if (session.id() === 0) {
            return;
        }
        if (session.id() !== sessionId) {
            return;
        }
        try {
            if (method === 'GET') {
                if (uri.match(/^\/channels\/([^\/]+)\/messages\/recent/)) {
                    var channelName = decodeURIComponent(RegExp.$1);
                    data.forEach(function (message) {
                        view.addNewMessage(channelName, message, false);
                    });
                } else if (uri.match(/^\/channels\/([^\/]+)\/messages\/by_time_span\/(\d+),(\d+)$/)) {
                    var channelName = decodeURIComponent(RegExp.$1);
                    var startTime   = decodeURIComponent(RegExp.$2);
                    var endTime     = decodeURIComponent(RegExp.$3);
                    view.setOldMessages(channelName, startTime, endTime, data);
                } else if (uri.match(/^\/messages\/search\/([^\/]+)$/)) {
                    var query = decodeURIComponent(RegExp.$1);
                    view.setSearch(query, data);
                }
            } else if (method === 'PUT') {
                if (uri.match(/^\/subscribings\?/)) {
                    var params = starChat.parseQuery(uri);
                    var channelName = params['channel_name'];
                    view.session().user().addChannel(channelName);
                    starChat.Channel.find(channelName).load(view.session());
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
        form.find('[type="submit"]').click(function (e) {
            var userName = form.find('[name="userName"]').val();
            var password = form.find('[name="password"]').val();
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
        form.find('[type="submit"]').click(function () {
            var session = getView().session();
            var channelName = form.find('[name="name"]').val();
            if (!channelName) {
                return false;
            }
            var url = '/subscribings?' +
                'channel_name=' + encodeURIComponent(channelName) + ';' +
                'user_name=' + encodeURIComponent(session.userName());
            starChat.ajaxRequest(session, url, 'PUT', null, function (sessionId, uri, method, data) {
                form.find('[name="name"]').val('');
                receiveResponse(sessionId, uri, method, data);
                location.hash = 'channels/' + encodeURIComponent(channelName);
            });
            return false;
        });
    })();
    (function () {
        var form = $('#searchForm');
        form.find('[type="submit"]').click(function () {
            var session = getView().session();
            var query = form.find('[name="query"]').val();
            if (!query) {
                var view = getView();
                view.clearSearch();
                view.update();
                return false;
            }
            var url = '/messages/search/' + encodeURIComponent(query);
            starChat.ajaxRequest(session, url, 'GET', null, receiveResponse);
            return false;
        });
    })();
    (function () {
        var form = $('#postMessageForm');
        form.find('[name="body"]').keypress(function (e) {
            if (e.which === 13) {
                form.find('[type="submit"]').click();
                return false;
            }
            return true;
        });
        form.find('[type="submit"]').click(function () {
            var session = getView().session();
            if (!session.isLoggedIn()) {
                // TODO: show alert or do something
                return false;
            }
            var view = getView();
            if (!view.channelName) {
                return false;
            }
            var body = form.find('[name="body"]').val();
            body = body.replace(/(?![\n\r\t])[\x00-\x1f\x7f]/mg, '');
            if (!body) {
                return false;
            }
            body = body.substring(0, 1024);
            var url = '/channels/' + encodeURIComponent(view.channelName) +
                '/messages';
            var id = $.now();
            starChat.ajaxRequest(session, url, 'POST', {
                body: body,
            }, function (sessionId, uri, method, data) {
                var view = getView();
                receiveResponse(sessionId, uri, method, data);
            });
            var message = {
                body: body,
                channel_name: view.channelName,
                user_name: session.user().name(),
                pseudo_message_id: id,
                id: 0,
                created_at: parseInt($.now() / 1000),
            };
            view.addPseudoMessage(message);
            view.update();
            form.find('[name="body"]').val('');
            return false;
        });
    })();
    (function () {
        $('img[data-tool-id="editTopic"]').click(function () {
            var view = getView();
            view.isEdittingTopic(!view.isEdittingTopic());
            view.update();
            return false;
        });
        $('#logOutLink img[data-tool-id="edit"]').click(function () {
            var view = getView();
            view.isEdittingUser(!view.isEdittingUser());
            if (view.isEdittingUser()) {
                var session = view.session();
                var user = session.user();
                user.load(session, function (sessionId) {
                    var view = getView();
                    if (view.session().id() !== sessionId) {
                        return;
                    }
                    view.update();
                });
            } else {
                view.update();
            }
            return false;
        });
        $('#channels menu img[data-tool-id="edit"]').click(function () {
            var view = getView();
            view.isEdittingChannels(!view.isEdittingChannels());
            if (view.isEdittingChannels()) {
                var session = view.session();
                var channels = session.user().channels();
                channels.forEach(function (channel) {
                    channel.load(session, function (sessionId) {
                        var view = getView();
                        if (view.session().id() !== sessionId) {
                            return;
                        }
                        view.update();
                    });
                });
            } else {
                view.update();
            }
            return false;
        });
    })();
    (function () {
        $('.dialog').click(function (e) {
            e.stopPropagation();
        });
        $('#editUserDialog [data-tool-id="closeDialog"]').click(function () {
            var view = getView();
            view.isEdittingUser(false);
            view.update();
            return false;
        });
        $('#editChannelsDialog [data-tool-id="closeDialog"]').click(function () {
            var view = getView();
            view.isEdittingChannels(false);
            view.update();
            return false;
        });
        $('#editChannelDialog [data-tool-id="closeDialog"]').click(function () {
            var view = getView();
            view.isEdittingChannel(false);
            view.update();
            return false;
        });
        $('#dialogBackground').click(function () {
            var view = getView();
            view.closeDialogs();
            view.update();
            return false;
        });
        $('#editUserDialog [type="submit"]').click(function () {
            var keywords = $('#editUserDialog [name="keywords"]').val().split('\n');
            var view = getView();
            var user = view.session().user();
            user.keywords(keywords);
            user.save(view.session(), function (sessionId) {
                var view = getView();
                if (view.session().id() !== sessionId) {
                    return;
                }
                view.isEdittingUser(false);
                view.update();
            });
            return false;
        });
        $('#editChannelsDialog [type="submit"]').click(function () {
            var view = getView();
            // TODO: implement
            view.isEdittingChannels(false);
            view.update();
            return false;
        });
        $('#editChannelDialog [type="submit"]').click(function () {
            var view = getView();
            // TODO: implement
            view.isEdittingChannel(false);
            view.edittingChannelName(null);
            view.update();
            return false;
        });
    })();
    (function () {
        $('#updateTopicForm [type="submit"]').click(function () {
            var topicBody = $('#updateTopicForm [name="body"]').val();
            var view = getView();
            var uri = '/channels/' + encodeURIComponent(view.channelName);
            starChat.ajaxRequest(view.session(), uri, 'PUT', {
                topic_body: topicBody,
            }, function (sessionId, uri, method, data) {
                receiveResponse(sessionId, uri, method, data);
                var view = getView();
                view.isEdittingTopic(false);
                starChat.ajaxRequest(view.session(), uri, 'GET', null, receiveResponse);
            });
            return false;
        });
    })();
    (function () {
        $(window).resize(function () {
            $('.dialog:visible').each(function () {
                var e = $(this);
                var top  = (($(window).height() - e.outerHeight()) / 3 + $(window).scrollTop())  + 'px';
                var left = (($(window).width()  - e.outerWidth())  / 2 + $(window).scrollLeft()) + 'px';
                e.css('top', top).css('left', left);
            });
        });
    })();
});

// Firefox Modification
$(function () {
    if (!$.browser.mozilla) {
        return;
    }
    /*$('#postMessageForm textarea').css('height', '1.2em');*/
    function relayout() {
        $('#messages > section').height($('#messages').height() -
                                        $('#messages > h2').outerHeight() -
                                        $('#messages > form').height());
        $('.sidebar').height($(window).height() - $('header').outerHeight());
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
