$(function() {
    var session = {
        loggedIn: false,
        userName: '',
        password: '',
        id: 0,
    };
    // TODO: channel page state (dirty)
    var viewStates = {};
    function getViewState() {
        if (!viewStates[session.id]) {
            viewStates[session.id] = {
                stream: null,
                streamContinuingErrorNum: 0,
                channels: [],
                channelName: '',
                newMessages: {},
                messageIdsAlreadyShown: {},
                userNames: {},
            }
        }
        return viewStates[session.id];
    }
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
    function uniq(arr) {
        var values = {};
        for (var i = 0; i < arr.length; i++) {
            values[arr[i]] = true;
        }
        return Object.keys(values);
    }
    var updateViewChannels = (function () {
        var cachedChannels = [];
        return function () {
            // channels
            var viewState = getViewState();
            var channels = viewState.channels.sort(function (a, b) {
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
                    viewState.channelName = channel.name;
                    if (!viewState.userNames[viewState.channelName]) {
                        updateUserList();
                    }
                    updateView();
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
        var viewState = getViewState();
        if (viewState.channelName) {
            $('#messages h2').text(viewState.channelName);
        } else {
            $('#messages h2').text("\u00a0");
        }
        /*$('#messages > section').filter(function (i) {
          var channelName = $(this).attr('data-channel-name');
          return // TODO: implement
          }).remove();*/
        if (viewState.channelName &&
            $('#messages > section').filter(function (i) {
                return $(this).attr('data-channel-name') === viewState.channelName;
            }).length === 0) {
            var section = $('<section></section>');
            section.attr('data-channel-name', viewState.channelName);
            $('#messages h2').after(section);
        }
        $('#messages > section').each(function (i) {
            var e = $(this);
            if (e.attr('data-channel-name') === viewState.channelName) {
                e.show();
            } else {
                e.hide();
            }
        });
        if (!viewState.channelName) {
            return;
        }
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
        var msgs = viewState.newMessages[viewState.channelName];
        if (!msgs) {
            msgs = [];
        }
        var section = $('#messages > section').filter(function (i) {
            return $(this).attr('data-channel-name') === viewState.channelName;
        });
        var isBottom =
            section.get(0).scrollHeight - section.scrollTop() ===
            section.outerHeight();
        // TODO: sort by id
        $.each(msgs, function (i, message) {
            if (viewState.messageIdsAlreadyShown[message.id]) {
                return;
            }
            section.append(messageToElement(message));
            viewState.messageIdsAlreadyShown[message.id] = true;
        });
        if (isBottom) {
            section.animate({scrollTop: section.get(0).scrollHeight});
        }
        viewState.newMessages[viewState.channelName] = [];
    }
    function updateViewUsers() {
        var viewState = getViewState();
        var userNames = viewState.userNames[viewState.channelName];
        if (!userNames) {
            userNames = [];
        }
        var userNames = userNames.sort();
        var ul = $('#users ul');
        ul.empty();
        $.each(userNames, function (i, userName) {
            var li = $('<li></li>');
            li.text(userName);
            ul.append(li);
        });
    }
    function updateView() {
        if (session.loggedIn) {
            $('#logInForm').hide();
            $('#logOutLink span').text(session.userName);
            $('#logOutLink').show();
            $('#main input').removeAttr('disabled');
            if (getViewState().channelName) {
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
        var viewState = getViewState();
        if (viewState.stream) {
            viewState.stream.abort();
        }
        viewState.stream = null;
        var i = 0;
        viewState.stream = $.ajax({
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
                        if (obj.type === 'message') {
                            var channelName = obj.channel_name;
                            var message = obj.message;
                            if (channelName && message) {
                                if (!viewState.newMessages[channelName]) {
                                    viewState.newMessages[channelName] = [];
                                }
                                viewState.newMessages[channelName].push(message);
                                if (channelName === getViewState().channelName) {
                                    updateView();
                                }
                            }
                        } else if (obj.type === 'subscribing') {
                            var channelName = obj.channel_name;
                            // TODO: update viewState.channels
                            if (!viewState.userNames[channelName]) {
                                viewState.userNames[channelName] = [];
                            }
                            var userNames = viewState.userNames[channelName];
                            userNames.push(obj.user_name);
                            viewState.userNames[channelName] = uniq(userNames);
                            // TODO: bug fix
                            if (channelName === getViewState().channelName) {
                                updateView();
                            }
                        }
                    }
                },
            },
            success: function (data, textStatus, jqXHR) {
                viewState.streamContinuingErrorNum = 0;
                setTimeout(startStream, 0);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(textStatus);
                viewState.streamContinuingErrorNum++;
                if (10 <= viewState.streamContinuingErrorNum) {
                    console.log('Too many errors!');
                    // TODO: implement showing error message
                    return;
                }
                setTimeout(startStream, 10000);
            },
        });
    }
    function stopStream() {
        var viewState = getViewState();
        if (viewState.stream) {
            viewState.stream.abort();
        }
        viewState.stream = null;
        viewState.streamContinuingErrorNum = 0;
    }
    function logIn(userName, password) {
        localStorage.userName = userName;
        localStorage.password = password;
        session.loggedIn = true;
        session.userName = userName;
        session.password = password;
        session.id = (new Date()).getTime();
        updateChannelList();
        updateView();
        startStream();
    }
    function logOut() {
        delete localStorage.userName;
        delete localStorage.password;
        session.loggedIn = false;
        session.userName = '';
        session.password = '';
        if (session.id !== 0) {
            delete viewStates[session.id];
        }
        session.id = 0;
        $('#messages > section').remove();
        updateView();
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
        var viewState = getViewState();
        $.ajax({
            url: '/users/' + encodeURIComponent(session.userName) + '/channels',
            type: 'GET',
            cache: false,
            beforeSend: addAuthHeader,
            dataType: 'json',
            success: function (data, textStatus, jqXHR) {
                viewState.channels = data;
                updateView();
            }
        });
    }
    function updateUserList() {
        var viewState = getViewState();
        var channelName = viewState.channelName;
        $.ajax({
            url: '/channels/' + encodeURIComponent(channelName) + '/users',
            type: 'GET',
            cache: false,
            beforeSend: addAuthHeader,
            dataType: 'json',
            success: function (data, textStatus, jqXHR) {
                if (!viewState.userNames[channelName]) {
                    viewState.userNames[channelName] = [];
                }
                var userNames = $.map(data, function (user) {
                    return user.name;
                });
                viewState.userNames[channelName] =
                    uniq(viewState.userNames[channelName].concat(userNames));
                if (channelName === getViewState().channelName) {
                    updateView();
                }
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
            var viewState = getViewState();
            if (!session.loggedIn) {
                // TODO: show alert or do something
                return false;
            }
            if (!viewState.channelName) {
                return false;
            }
            var body = form.find('input[name="body"]').val();
            if (!body) {
                return false;
            }
            var url = '/channels/' + encodeURIComponent(viewState.channelName) +
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
