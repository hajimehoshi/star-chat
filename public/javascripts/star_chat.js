$(function() {
    function isSameArray(a, b, func) {
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
    }
    var session = {
        loggedIn: false,
        userName: '',
        password: '',
    };
    // TODO: channel page state (init, normal)
    // TODO: channel page state (dirty)
    var view = {
        stream: null,
        streamContinuingErrorNum: 0,
        channels: [],
        channelName: '',
        newMessages: {},
        users: [],
    };
    var updateViewChannels = (function () {
        var cachedChannels = [];
        return function () {
            // channels
            var channels = view.channels.sort(function (a, b) {
                if (a.name > b.name) {
                    return 1;
                }
                if (a.name < b.name) {
                    return -1;
                }
                return 0;
            });
            if (isSameArray(channels, cachedChannels)) {
                return;
            }
            var ul = $('#channels ul');
            ul.empty();
            $.each(channels, function (i, channel) {
                var a = $('<a href="#"></a>');
                a.text(channel.name);
                a.click(function () {
                    view.channelName = channel.name;
                    updateUserList();
                    update();
                    return false;
                });
                var li = $('<li></li>');
                li.append(a);
                ul.append(li);
            });
            cachedChannels = [];
            for (var i = 0; i < channels.length; i++) {
                cachedChannels[i] = channels[i];
            }
        }
    })();
    function updateViewMessages() {
        if (view.channelName) {
            $('#messages h2').text(view.channelName);
        } else {
            $('#messages h2').text("\u00a0");
        }
        /*$('#messages > section').filter(function (i) {
          var channelName = $(this).attr('data-channel-name');
          return // TODO: implement
          }).remove();*/
        if ($('#messages > section').filter(function (i) {
            return $(this).attr('data-channel-name') === view.channelName;
        }).length === 0) {
            var section = $('<section></section>');
            section.attr('data-channel-name', view.channelName);
            $('#messages h2').after(section);
        }
        $('#messages > section').each(function (i) {
            var e = $(this);
            if (e.attr('data-channel-name') === view.channelName) {
                e.show();
            } else {
                e.hide();
            }
        });
        function messageToElement(message) {
            var messageSection = $('<section></section>');
            messageSection.addClass('message');
            var userNameP = $('<p></p>').text(message.user_name);
            userNameP.addClass('userName');
            messageSection.append(userNameP);
            var bodyP = $('<p></p>').text(message.body);
            bodyP.addClass('body');
            messageSection.append(bodyP);
            // TODO: Use the element <time>?
            var time = new Date();
            time.setTime(message.created_at * 1000);
            var h = time.getHours() + '';
            var m = time.getMinutes() + '';
            if (h.length < 2) {
                h = '0' + h;
            }
            if (m.length < 2) {
                m = '0' + m;
            }
            var timeStr = h + ':' + m;
            var createdAtP = $('<p></p>').text(timeStr);
            createdAtP.addClass('createdAt');
            messageSection.append(createdAtP);
            messageSection.attr('data-message-id', message.id);
            return messageSection;
        }
        if (!view.channelName) {
            return;
        }
        var msgs = view.newMessages[view.channelName];
        if (!msgs) {
            msgs = [];
        }
        var section = $('#messages > section').filter(function (i) {
            return $(this).attr('data-channel-name') === view.channelName;
        });
        var isBottom =
            section.get(0).scrollHeight - section.scrollTop() ===
            section.outerHeight();
        // TODO: sort by id
        $.each(msgs, function (i, message) {
            // TODO: optimize
            if (0 < $('.message').filter(function (i) {
                return $(this).attr('data-message-id') === message.id;
            }).length) {
                return;
            }
            section.append(messageToElement(message));
        });
        if (isBottom) {
            section.animate({scrollTop: section.get(0).scrollHeight});
        }
        view.newMessages[view.channelName] = [];
    }
    function updateViewUsers() {
        var users = view.users.sort(function (a, b) {
            if (a.name > b.name) {
                return 1;
            }
            if (a.name < b.name) {
                return -1;
            }
            return 0;
        });
        var ul = $('#users ul');
        ul.empty();
        $.each(users, function (i, user) {
            var li = $('<li></li>');
            li.text(user.name);
            ul.append(li);
        });
    }
    function update() {
        if (session.loggedIn) {
            $('#logInForm').hide();
            $('#logOutLink span').text(session.userName);
            $('#logOutLink').show();
            $('#main input').removeAttr('disabled');
            if (view.channelName) {
                $('#postMessageForm input').removeAttr('disabled');
            } else {
                $('#postMessageForm input').attr('disabled', 'disabled');
            }
        } else {
            $('#logInForm').show();
            $('#logOutLink').hide();
            $('#main input').attr('disabled', 'disabled');
        }
        updateViewChannels();
        updateViewMessages();
        updateViewUsers();
    };
    function startStream() {
        if (view.stream) {
            view.stream.abort();
        }
        view.stream = null;
        var i = 0;
        view.stream = $.ajax({
            url: '/users/' + encodeURIComponent(session.userName) +
                '/stream',
            type: 'GET',
            cache: false,
            beforeSend: addAuthHeader,
            xhrFields: {
                onprogress: function () {
                    // TODO: Reconnecting if overflow
                    var xhr = this;
                    var text = xhr.responseText;
                    var subText = text.substring(i);
                    while (true) {
                        var tokenLength = subText.search("\n");
                        if (tokenLength === -1) {
                            break;
                        }
                        i += tokenLength + 1;
                        var token = subText.substring(0, tokenLength);
                        subText = subText.substring(tokenLength + 1);
                        try {
                            var obj = JSON.parse(token);
                        } catch (e) {
                            console.log(e);
                            continue;
                        }
                        var channelName = obj.channel_name;
                        var message = obj.message;
                        if (channelName && message) {
                            if (!view.newMessages[channelName]) {
                                view.newMessages[channelName] = [];
                            }
                            view.newMessages[channelName].push(message);
                            update();
                        }
                    }
                },
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
        });
    }
    function stopStream() {
        if (view.stream) {
            view.stream.abort();
        }
        view.stream = null;
        view.streamContinuingErrorNum = 0;
    }
    function logIn(userName, password) {
        localStorage.userName = userName;
        localStorage.password = password;
        session.loggedIn = true;
        session.userName = userName;
        session.password = password;
        updateChannelList();
        update();
        startStream();
    }
    function logOut() {
        delete localStorage.userName;
        delete localStorage.password;
        session.loggedIn = false;
        session.userName = '';
        session.password = '';
        view.channels = [];
        view.channelName = '';
        view.newMessages = {};
        view.users = [];
        update();
        stopStream();
    }
    function addAuthHeader(xhr) {
        xhr.setRequestHeader('Authorization',
                             'Basic ' + btoa(session.userName + ':' + session.password));
    }
    function tryLogIn(userName, password) {
        var allAscii = /^[\x20-\x7E]*$/;
        if (!userName.match(allAscii)) {
            return;
        }
        if (!password.match(allAscii)) {
            return;
        }
        $.ajax({
            url: '/users/' + encodeURIComponent(userName),
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Authorization',
                                     'Basic ' + btoa(userName + ':' + password));
            },
            success: function (data, textStatus, jqXHR) {
                logIn(userName, password);
            },
            statusCode: {
                401: logOut,
            },
        });
    }
    function updateChannelList() {
        $.ajax({
            url: '/users/' + encodeURIComponent(session.userName) + '/channels',
            type: 'GET',
            cache: false,
            beforeSend: addAuthHeader,
            dataType: 'json',
            success: function (data, textStatus, jqXHR) {
                view.channels = data;
                update();
            }
        });
    }
    function updateUserList() {
        $.ajax({
            url: '/channels/' + encodeURIComponent(view.channelName) + '/users',
            type: 'GET',
            cache: false,
            beforeSend: addAuthHeader,
            dataType: 'json',
            success: function (data, textStatus, jqXHR) {
                view.users = data;
                update();
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
        form.find('input[type="submit"]').click(function (e) {
            var userName = form.find('input[name="userName"]').val();
            var password = form.find('input[name="password"]').val();
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
            $.ajax({
                url: '/subscribings',
                type: 'POST',
                cache: false,
                beforeSend: addAuthHeader,
                data: JSON.stringify({
                    user_name: session.userName,
                    channel_name: channelName,
                }),
                contentType: 'application.json; charset=utf-8',
                dataType: 'json',
                success: function (data, textStatus, jqXHR) {
                    form.find('input[name="name"]').val('');
                    updateChannelList();
                },
                statusCode: {
                    401: logOut,
                },
            });
            return false;
        });
    })();
    (function () {
        var form = $('#postMessageForm');
        form.find('input[type="submit"]').click(function (e) {
            if (!session.loggedIn) {
                // TODO: show alert or do something
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
            $.ajax({
                url: url,
                type: 'POST',
                cache: false,
                beforeSend: addAuthHeader,
                data: JSON.stringify({
                    body: body,
                }),
                contentType: 'application.json; charset=utf-8',
                dataType: 'json',
                success: function (data, textStatus, jqXHR) {
                    form.find('input[name="body"]').val('');
                },
                statusCode: {
                    401: logOut,
                },
            });
            e.stopPropagation();
            return false;
        });
    })();
});
