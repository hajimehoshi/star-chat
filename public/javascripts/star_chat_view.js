starChat.View = (function () {
    var View = function (session) {
        this.session = session;
        this.stream = null;
        this.streamContinuingErrorNum = 0;
        this.channels = [];
        this.channelName = '';
        this.lastChannelName = '';
        this.newMessages = {};
        this.messageIdsAlreadyShown = {};
        this.messageScrollTops = {};
        this.isPostingMessage = false;
        this.userNames = {};
        this.isEdittingChannels = false;
    };
    var updateViewChannels = (function () {
        var lastSessionId = 0;
        var cachedChannels = [];
        return function (view) {
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
            if (lastSessionId != view.session.id ||
                !starChat.isSameArray(channels, cachedChannels)) {
                var ul = $('#channels ul');
                ul.empty();
                $.each(channels, function (i, channel) {
                    var a = $('<a href="#"></a>');
                    a.text(channel.name);
                    a.click(function () {
                        view.channelName = channel.name;
                        if (!(view.channelName in view.userNames)) {
                            //updateUserList(); // TODO: fix it
                        }
                        view.update();
                        return false;
                    });
                    var channelName = channel.name;
                    var delLink = $('<a href="#">Del</a>').click(function () {
                        var msg = "Are you sure you want to delete subscribing '" +
                            channelName + "'?"
                        if (!confirm(msg)) {
                            return false;
                        }
                        var url = '/subscribings?' +
                            'channel_name=' + encodeURIComponent(channelName) + ';' +
                            'user_name=' + encodeURIComponent(view.session.userName);
                        var callbacks = {
                            //success: updateChannelList, // TODO: fix it
                            // logOut: logOut, // TODO: fix it
                        }
                        starChat.ajax(view.session.userName, view.session.password,
                                      url,
                                      'DELETE',
                                      callbacks);
                        return false;
                    });
                    var span = $('<span class="del"></span>');
                    span.append(' (').append(delLink).append(')');
                    var li = $('<li></li>');
                    li.append(a).append(span);
                    ul.append(li);
                });
                cachedChannels = [];
                for (var i = 0; i < channels.length; i++) {
                    cachedChannels[i] = channels[i];
                }
                lastSessionId = view.session.id;
            }
            if (view.isEdittingChannels) {
                $('#channels li span.del').show();
            } else {
                $('#channels li span.del').hide();
            }
        }
    })();
    function updateViewMessages(view) {
        if (view.channelName) {
            $('#messages h2').text(view.channelName);
        } else {
            $('#messages h2').text("\u00a0");
        }
        /*$('#messages > section').filter(function (i) {
          var channelName = $(this).attr('data-channel-name');
          return // TODO: implement
          }).remove();*/
        if (view.channelName &&
            $('#messages > section').filter(function (i) {
                return $(this).attr('data-channel-name') === view.channelName;
            }).length === 0) {
            var section = $('<section></section>');
            var channelName = view.channelName;
            section.attr('data-channel-name', channelName);
            section.scroll(function () {
                view.messageScrollTops[channelName] = section.scrollTop();
            });
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
        if (!view.channelName) {
            view.lastChannelName = '';
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
            if (view.messageIdsAlreadyShown[message.id]) {
                return;
            }
            section.append(messageToElement(message));
            view.messageIdsAlreadyShown[message.id] = true;
        });
        if (view.lastChannelName === view.channelName) {
            if (isBottom) {
                section.animate({scrollTop: section.get(0).scrollHeight});
            }
        } else {
            if (!view.lastChannelName ||
                !(view.channelName in view.messageScrollTops)) {
                section.scrollTop(section.get(0).scrollHeight);
            } else {
                section.scrollTop(view.messageScrollTops[view.channelName]);
            }
        }
        view.lastChannelName = view.channelName;
        view.messageScrollTops[view.channelName] = section.scrollTop();
        view.newMessages[view.channelName] = [];
    }
    function updateViewUsers(view) {
        var userNamesObj = view.userNames[view.channelName];
        if (!userNamesObj) {
            userNamesObj = {};
        }
        var userNames = Object.keys(userNamesObj).sort();
        var ul = $('#users ul');
        ul.empty();
        $.each(userNames, function (i, userName) {
            var li = $('<li></li>');
            li.text(userName);
            ul.append(li);
        });
    }
    View.prototype.update = function () {
        if (this.session.loggedIn) {
            $('#logInForm').hide();
            $('#logOutLink span').text(this.session.userName);
            $('#logOutLink').show();
            $('#main input').removeAttr('disabled');
            if (this.channelName) {
                $('#postMessageForm input').removeAttr('disabled');
            } else {
                $('#postMessageForm input').attr('disabled', 'disabled');
            }
        } else {
            $('#logInForm').show();
            $('#logOutLink').hide();
            $('#main input').attr('disabled', 'disabled');
        }
        updateViewChannels(this);
        updateViewMessages(this);
        updateViewUsers(this);
    };
    return View;
})();
