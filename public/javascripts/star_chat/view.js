'use strict';

starChat.View = (function () {
    var View = function (session) {
        this.session = session;
        this.channels = [];
        this.channelName = '';
        this.lastChannelName = '';
        this.newMessages = {};
        this.messageIdsAlreadyShown = {};
        this.messageScrollTops = {};
        this.isPostingMessage = false;
        this.userNames = {};
        this.isEdittingChannels = false;

        this.dirtyFlags_ = {};
    };
    var updateViewChannels = (function () {
        var lastSessionId = 0;
        var cachedChannels = [];
        return function (self) {
            // channels
            var channels = self.channels.sort(function (a, b) {
                if (a.name > b.name) {
                    return 1;
                }
                if (a.name < b.name) {
                    return -1;
                }
                return 0;
            });
            if (self.channelName) {
                self.dirtyFlags_[self.channelName] = false;
            }
            (function () {
                var ul = $('#channels ul');
                ul.empty();
                $.each(channels, function (i, channel) {
                    var a = $('<a href="#"></a>');
                    var name = channel.name;
                    if (self.dirtyFlags_[name]) {
                        name += ' (*)';
                    }
                    a.text(name);
                    a.click(function () {
                        return self.clickChannel_(channel);
                    });
                    var delLink = $('<a href="#">Del</a>').click(function () {
                        return self.clickChannelDel_(channel);
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
                lastSessionId = self.session.id();
            })();
            if (self.isEdittingChannels) {
                $('#channels li span.del').show();
            } else {
                $('#channels li span.del').hide();
            }
        }
    })();
    function updateViewMessages(self) {
        if (self.channelName) {
            $('#messages h2').text(self.channelName);
        } else {
            $('#messages h2').text("\u00a0");
        }
        /*$('#messages > section').filter(function (i) {
          var channelName = $(this).attr('data-channel-name');
          return // TODO: implement
          }).remove();*/
        if (self.channelName &&
            $('#messages > section').filter(function (i) {
                return $(this).attr('data-channel-name') === self.channelName;
            }).length === 0) {
            var section = $('<section></section>');
            var channelName = self.channelName;
            section.attr('data-channel-name', channelName);
            section.scroll(function () {
                self.messageScrollTops[channelName] = section.scrollTop();
            });
            $('#messages h2').after(section);
        }
        $('#messages > section').each(function (i) {
            var e = $(this);
            if (e.attr('data-channel-name') === self.channelName) {
                e.show();
            } else {
                e.hide();
            }
        });
        if (!self.channelName) {
            self.lastChannelName = '';
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
        var msgs = self.newMessages[self.channelName];
        if (!msgs) {
            msgs = [];
        }
        var section = $('#messages > section').filter(function (i) {
            return $(this).attr('data-channel-name') === self.channelName;
        });
        var isBottom =
            section.get(0).scrollHeight - section.scrollTop() ===
            section.outerHeight();
        // TODO: sort by id
        $.each(msgs, function (i, message) {
            if (self.messageIdsAlreadyShown[message.id]) {
                return;
            }
            section.append(messageToElement(message));
            self.messageIdsAlreadyShown[message.id] = true;
        });
        if (self.lastChannelName === self.channelName) {
            if (isBottom) {
                section.animate({scrollTop: section.get(0).scrollHeight});
            }
        } else {
            if (!self.lastChannelName ||
                !(self.channelName in self.messageScrollTops)) {
                section.scrollTop(section.get(0).scrollHeight);
            } else {
                section.scrollTop(self.messageScrollTops[self.channelName]);
            }
        }
        self.lastChannelName = self.channelName;
        self.messageScrollTops[self.channelName] = section.scrollTop();
        self.newMessages[self.channelName] = [];
    }
    function updateViewUsers(self) {
        var userNamesObj = self.userNames[self.channelName];
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
        if (this.session.isLoggedIn()) {
            $('#logInForm').hide();
            $('#logOutLink span').text(this.session.userName());
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
        $(window).resize();
    };
    View.prototype.setDirtyFlag = function (channelName, value) {
        this.dirtyFlags_[channelName] = value;
    };
    View.prototype.clickChannel = function (func) {
        this.clickChannel_ = func;
        return this;
    };
    View.prototype.clickChannelDel = function (func) {
        this.clickChannelDel_ = func;
        return this;
    };
    return View;
})();
