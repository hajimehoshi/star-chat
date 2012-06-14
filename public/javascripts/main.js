'use strict';

var getView = (function () {
    var view = null;
    return function () {
        if (view === null) {
            view = new starChat.View(starChat.Session);
        }
        return view;
    };
})();

$(function() {
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
                channel.loadUsers(view.session(), function (sessionId) {
                    var view = getView();
                    if (view.session().id() !== sessionId) {
                        return;
                    }
                    view.update();
                });
                // TODO: use starChat.Channel
                var url = '/channels/' + encodeURIComponent(channel.name()) + '/messages/recent';
                starChat.ajaxRequest(session, url, 'GET', null, function (sessionId, uri, method, data) {
                    var view = getView();
                    if (view.session().id() !== sessionId) {
                        return;
                    }
                    data.forEach(function (message) {
                        view.addNewMessage(channel.name(), message, false);
                    });
                    // TODO: call this only one time?
                    view.update();
                    $(window).trigger('hashchange');
                });
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
        var url = '/users/' + encodeURIComponent(userName) + '/ping';
        $.ajax({
            url: url,
            type: 'GET',
            cache: false,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Authorization',
                                     'Basic ' + btoa(userName + ':' + password));
            },
            dataType: 'json',
            success: function (data, textStatus, jqXHR) {
                logIn(userName, password);
            },
            statusCode: {
                401: logOut
            }
        });
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
            var subscribing = new starChat.Subscribing(channelName, session.user().name());
            subscribing.save(session, function (sessionId) {
                var view = getView();
                if (view.session().id() !== sessionId) {
                    return;
                }
                form.find('[name="name"]').val('');
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
                        view.addNewMessage(channelName, message);
                    });
                    view.update();
                });
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
            starChat.ajaxRequest(session, url, 'GET', null, function (sessionId, uri, method, data) {
                var view = getView();
                if (view.session().id() !== sessionId) {
                    return;
                }
                view.setSearch(query, data);
                view.update();
            });
            return false;
        });
    })();
    (function () {
        function postMessage(notice) {
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
                body:   body,
                notice: notice
            });
            var message = {
                body: body,
                channel_name: view.channelName,
                user_name: session.user().name(),
                pseudo_message_id: id,
                id: 0,
                created_at: starChat.parseInt($.now() / 1000),
                notice: notice
            };
            view.addPseudoMessage(message);
            view.update();
            form.find('[name="body"]').val('');
            return false;
        }
        var form = $('#postMessageForm');
        form.find('[name="body"]').keydown(function (e) {
            $('#userNameCandidates').hide();

            // In Chrome of Windows, e.which may have the value 10 instead of 13.
            // I don't know the reason.
            if (e.which === 13 || e.which === 10) {
                postMessage(e.ctrlKey);
                return false;
            }
            if (e.which === 9) {
                var idx = this.selectionStart;
                var match = $(this).val().substring(0, idx).match(/([\x21-\x7e]+)$/);
                if (!match) {
                    return false;
                }
                var currentHead = match[1];

                var view = getView();
                var channelName = view.channelName;
                if (!channelName) {
                    return false;
                }
                var channel = starChat.Channel.find(channelName);
                var userNicks = channel.users().map(function (user) {
                    return user.nick();
                }).filter(function (nick) {
                    if (!nick.match(/^[\x21-\x7e]+$/)) {
                        return false;
                    }
                    return nick.indexOf(currentHead) === 0;
                });
                userNicks = $.unique(userNicks).sort();
                switch (userNicks.length) {
                case 0:
                    return false;
                case 1:
                    var nick = userNicks[0];
                    var val = $(this).val();
                    var newVal = val.substring(0, idx - currentHead.length);
                    if (this.selectionStart === this.selectionEnd &&
                        this.selectionStart === currentHead.length) {
                        newVal += nick + ': ';
                        var newSegmentLength = nick.length + 2;
                    } else {
                        newVal += nick;
                        var newSegmentLength = nick.length;
                    }
                    newVal += val.substring(idx);
                    $(this).val(newVal);
                    this.selectionStart = this.selectionEnd = idx - currentHead.length + newSegmentLength;
                    return false;
                default:
                    var commonHead = userNicks[0];
                    userNicks.forEach(function (nick) {
                        commonHead = starChat.getCommonHead(commonHead, nick);
                    });
                    if (currentHead === commonHead) {
                        var ul = $('#userNameCandidates');
                        ul.empty();
                        userNicks.forEach(function (nick) {
                            var li = $('<li></li>').text(commonHead);
                            if (commonHead !== nick) {
                                li.append($('<em></em>').text(nick[commonHead.length]));
                                var text = document.createTextNode(nick.substring(commonHead.length + 1));
                                li.append($(text));
                            }
                            ul.append(li);
                        });
                        var pos = Measurement.caretPos(this);
                        var parent = $('#messages');
                        ul.css('left', pos.left     - parent.offset().left);
                        ul.css('top',  pos.top - 30 - parent.offset().top);
                        ul.show();
                    } else {
                        var val = $(this).val();
                        var newVal = val.substring(0, idx - currentHead.length) +
                            commonHead +
                            val.substring(idx);
                        $(this).val(newVal);
                        this.selectionStart = this.selectionEnd = idx - currentHead.length + commonHead.length;
                    }
                }
                return false;
            }
            return true;
        }).blur(function () {
            $('#userNameCandidates').hide();
        });
        form.find('[type="submit"]').click(function () {
            postMessage(false);
            return false;
        });
    })();
    (function () {
        $('img[data-tool-id="toggleTimeline"]').click(function () {
            $('#timeline').toggle();
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
            view.update();
            return false;
        });
        $('#editChannelsDialog img[data-tool-id="edit"]').click(function () {
            var e = $(this);
            var channelName = String(e.attr('data-channel-name'));
            var view = getView();
            view.isEdittingChannel(true);
            view.edittingChannelName(channelName);
            var channel = starChat.Channel.find(channelName);
            channel.load(view.session(), function (sessionId) {
                var view = getView();
                if (view.session().id() !== sessionId) {
                    return;
                }
                view.update(); 
            });
            return false;
        });
        $('#editChannelsDialog img[data-tool-id="delete"]').click(function () {
            var e = $(this);
            var channelName = String(e.attr('data-channel-name'));
            var msg = "Are you sure you want to delete subscribing '" + channelName + "'?"
            if (!confirm(msg)) {
                return false;
            }
            var view = getView();
            var subscribing = new starChat.Subscribing(channelName, view.session().user().name());
            subscribing.destroy(view.session(), function (sessionId) {
                var view = getView();
                if (view.session().id() !== sessionId) {
                    return;
                }
                if (view.channelName === channelName) {
                    starChat.clearFragment();
                    view.channelName = null;
                }
                view.update(); 
            });
            return false;
        });
        $('#invitationLink a').click(function () {
            var view = getView();
            var channelName = view.channelName;
            if (!channelName) {
                return false;
            }
            view.isShowingInvitationURLDialog(true);
            view.update();
            $('#invitationURLDialog button[title="regenerate"]').click();
            return false;
        });
        $('#invitationURLDialog button[title="regenerate"]').click(function () {
            var view = getView();
            var channelName = view.channelName;
            if (!channelName) {
                return false;
            }
            var channel = starChat.Channel.find(channelName);
            channel.generateKey(view.session(), function (sessionId, key) {
                var view = getView();
                if (view.session().id() !== sessionId) {
                    return;
                }
                var url = location.href + '?key=' + encodeURIComponent(key);
                $('#invitationURLDialog [name="invitationURL"]').val(url);
            });
            return false;
        });
        $('#invitationURLDialog [name="invitationURL"]').click(function () {
            $(this).select();
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
        $('#invitationURLDialog [data-tool-id="closeDialog"]').click(function () {
            var view = getView();
            view.isShowingInvitationURLDialog(false);
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
            var nick     = $('#editUserDialog [name="nick"]').val();
            var keywords = $('#editUserDialog [name="keywords"]').val().split('\n');
            var view = getView();
            var user = view.session().user();
            user.nick(nick);
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
        $('#editChannelDialog [name="privacy"]').change(function () {
            var e = $(this);
            var privacy = e.val();
            if (privacy === 'public') {
                $('#editChannelDialog [name="password"]').attr('disabled', 'disabled');
            } else {
                $('#editChannelDialog [name="password"]').removeAttr('disabled');
            }
        });
        $('#editChannelDialog [type="submit"]').click(function () {
            var view = getView();
            var channelName = view.edittingChannelName();
            var channel = starChat.Channel.find(channelName);
            var privacy = String($('#editChannelDialog [name="privacy"]:checked').val());
            channel.privacy(privacy);
            channel.save(view.session(), function (sessionId) {
                var view = getView();
                if (view.session().id() !== sessionId) {
                    return;
                }
                view.isEdittingChannel(false);
                view.edittingChannelName(null);
                view.update();
            });
            return false;
        });
    })();
    (function () {
        $('#updateTopicForm [type="submit"]').click(function () {
            var topicBody = $('#updateTopicForm [name="body"]').val();
            var view = getView();
            var channel = starChat.Channel.find(view.channelName);
            channel.topic({
                created_at: starChat.parseInt($.now() / 1000),
                user_name:  view.session().user().name(),
                body:       topicBody
            });
            // TODO: close the textarea even when failured
            channel.save(view.session(), function (sessionId) {
                var view = getView();
                if (view.session().id() !== sessionId) {
                    return;
                }
                view.isEdittingTopic(false);
                view.update();
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
    function relayout() {
        $('#messages > section').height($('#messages').height() -
                                        $('#messages > h2').outerHeight() -
                                        $('#messages > form').height());
        $('.sidebar').height($(window).height() - $('header').outerHeight());
        var messages = $('#messages');
        $('#timeline').css('top', (messages.offset().top + 50) + 'px').
            css('right', (messages.offset().left + 20) + 'px');
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
