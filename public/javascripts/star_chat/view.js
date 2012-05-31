'use strict';

starChat.View = (function () {
    var View = function (sessionClass) {
        this.sessionClass_ = sessionClass;

        initialize(this);
    };
    function initialize(self) {
        self.session_ = new self.sessionClass_();

        // TODO: Model に相当するクラスを作る?
        // TODO: いずれこれらの変数も private (_ 終わり) にする
        self.channelName = '';

        self.lastChannelName_ = '';
        self.newMessages_ = {};
        self.pseudoMessages_ = {};
        self.messageElements_ = {};
        self.messageIdsAlreadyInSection_ = {};
        self.messageScrollTops_ = {};
        self.dirtyFlags_ = {};
        self.startTime_ = null;
        self.endTime_ = null;
        self.oldMessages_ = {};
        self.isBlinkingTitle_ = false;
        self.isEdittingUser_ = false;
        self.isEdittingChannels_ = false;
        self.searchQuery_ = null;
        self.searchResult_ = [];
        self.isEdittingTopic_ = false;

        self.title_ = 'StarChat (β)';
        document.title = self.title_;
        stopBlinkingTitle(self);
    }
    function startBlinkingTitle(self, anotherTitle) {
        if (self.isBlinkingTitle_) {
            return;
        }
        self.isBlinkingTitle_ = true;
        function loop (i) {
            if (!self.isBlinkingTitle_) {
                stopBlinkingTitle(self);
                return;
            }
            if (starChat.isFocused()) {
                stopBlinkingTitle(self);
                return;
            }
            document.title = {
                0: self.title_,
                1: anotherTitle,
            }[i];
            setTimeout(function () {
                loop(1 - i);
            }, 1000);
        }
        loop(0);
    }
    function stopBlinkingTitle(self) {
        self.isBlinkingTitle_ = false;
        document.title = self.title_;
    }
    var updateViewChannels = (function () {
        var lastSessionId = 0;
        return function (self) {
            var channels = [];
            if (self.session().isLoggedIn()) {
                channels = self.session().user().channels().sort(function (a, b) {
                    if (a.name() > b.name()) {
                        return 1;
                    }
                    if (a.name() < b.name()) {
                        return -1;
                    }
                    return 0;
                });
            }
            if (self.channelName) {
                self.dirtyFlags_[self.channelName] = false;
            }
            (function () {
                var ul = $('#channelsList');
                ul.find('li').filter(function (i) {
                    var channelName = $(this).attr('data-channel-name');
                    return channels.every(function (channel) {
                        return channel.name() !== channelName;
                    });
                }).remove();
                var existChannelNames = $.map(ul.find('li'), function (e) {
                    return $(e).attr('data-channel-name');
                });
                var newChannels = channels.filter(function (channel) {
                    return existChannelNames.every(function (name) {
                        return name !== channel.name();
                    });
                });
                // TODO: sort
                newChannels.forEach(function (channel) {
                    var a = $('<a></a>');
                    var name = channel.name();
                    var href = '#channels/' + encodeURIComponent(channel.name());
                    a.attr('href', href);
                    a.text(name);
                    var li = $('<li></li>').attr('data-channel-name', channel.name());
                    li.append(a);
                    ul.append(li);
                });
                ul.find('li').each(function () {
                    var e = $(this);
                    var channelName = e.attr('data-channel-name');
                    e.find('a').toggleClass('dirty', self.dirtyFlags_[channelName] === true);
                });
                lastSessionId = self.session_.id();
            })();
        }
    })();
    function updateViewSearch(self) {
        var ul = $('#searchResultList');
        ul.empty();
        self.searchResult_.forEach(function (result) {
            var message = result.message;

            var li = $('<li></li>');
            var createdAt = new Date(message.created_at * 1000);
            var createdAtStr = starChat.toISO8601(createdAt, 'date') + ' ' +
                starChat.toISO8601(createdAt, 'hourMinute');
            var createdAtE = $('<time></time>').append(createdAtStr);
            createdAtE.attr('datetime', starChat.toISO8601(createdAt));

            var userName = message.user_name;
            var userNameE = $('<span></span>').text(userName).addClass('userName');

            var bodyE = $(document.createTextNode(message.body));

            var time = new Date(message.created_at * 1000);
            time.setHours(0);
            time.setMinutes(0);
            time.setSeconds(0);
            time.setMilliseconds(0);
            var startTime = parseInt(time.getTime() / 1000);
            var endTime   = startTime + 60 * 60 * 24;
            var channelNameLink = $('<a></a>').text(message.channel_name);
            var channelUrl = '#channels/' + encodeURIComponent(message.channel_name) +
                '/old_logs/by_time_span/' + startTime + ',' + endTime;
            channelNameLink.attr('href', channelUrl);
            // TODO: highlight

            li.append(createdAtE);
            li.append($('<br />'));
            li.append(userNameE);
            li.append($('<br />'));
            li.append(bodyE);
            li.append(document.createTextNode(' ('));
            li.append(channelNameLink);
            li.append(document.createTextNode(')'));
            ul.append(li);
        });
    }
    function getSectionElement(self) {
        if (!self.channelName) {
            return $('#messages > section[data-channel-name=""]');
        }
        var sections = $('#messages > section').filter(function (i) {
            return $(this).attr('data-channel-name') === self.channelName &&
                (!self.isShowingOldLogs() &&
                 !$(this).attr('data-start-time') &&
                 !$(this).attr('data-end-time')) ||
                (self.isShowingOldLogs() &&
                 parseInt($(this).attr('data-start-time')) === self.startTime_ &&
                 parseInt($(this).attr('data-end-time'))   === self.endTime_);
        });
        if (sections.length === 1) {
            var section = sections;
            section.find('[name="year"]').val('');
            section.find('[name="month"]').val('');
            section.find('[name="day"]').val('');
            return section;
        }
        if (2 <= sections.length) {
            throw 'invalid sections';
        }
        var section = $('<section></section>');
        var channelName = self.channelName;
        section.attr('data-channel-name', channelName);
        if (self.isShowingOldLogs()) {
            section.attr('data-start-time', self.startTime_);
            section.attr('data-end-time',   self.endTime_);
        }
        if (!self.isShowingOldLogs()) {
            section.scroll(function () {
                self.messageScrollTops_[channelName] = section.scrollTop();
            });
        }
        var inputYear   = $('<input type="number" name="year" min="0" max="9999" value="" />');
        var inputMonth  = $('<input type="number" name="month" min="1" max="12" value="" />');
        var inputDay    = $('<input type="number" name="day" min="1" max="31" value="" />');
        var inputSubmit = $('<input type="submit" value="Show" />');
        var oldLogsP    = $('<p></p>').append('Old Logs: ');
        oldLogsP.append(inputYear).append('-').append(inputMonth).append('-').append(inputDay);
        oldLogsP.append(inputSubmit);
        var oldLogsForm = $('<form action="." method="get"></form>');
        oldLogsForm.append(oldLogsP);
        inputSubmit.click(function () {
            var year  = inputYear.val();
            var month = inputMonth.val();
            var day   = inputDay.val();
            var startTime = (new Date(year, month - 1, day)).getTime() / 1000;
            var endTime   = startTime + 60 * 60 * 24;
            var fragment = 'channels/' + encodeURIComponent(channelName) +
                '/old_logs/by_time_span/' +
                encodeURIComponent(startTime) + ',' + encodeURIComponent(endTime);
            location.hash = fragment;
            return false;
        });
        section.append(oldLogsForm);
        $('#messages h2').after(section);
        return section;
    }
    function messageToElement(message, keywords) {
        var messageTR = $('<tr></tr>').addClass('message');

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
        var createdAtTD = $('<td></td>');
        var createdAtTime = $('<time></time>').text(timeStr).attr('data-unix-time', message.created_at);;
        createdAtTD.append(createdAtTime).addClass('createdAt');
        messageTR.append(createdAtTD);

        var userNameTD = $('<td></td>').text(message.user_name);
        userNameTD.addClass('userName');
        messageTR.append(userNameTD);

        var bodyTD = $('<td></td>').addClass('body').text(message.body);
        starChat.replaceURLWithLinks(bodyTD);

        var emphasizedNum = 0;
        if (keywords !== void(0)) {
            keywords.forEach(function (keyword) {
                emphasizedNum += starChat.emphasizeKeyword(bodyTD, keyword);
            });
        }
        starChat.replaceBreakLines(bodyTD);
        messageTR.append(bodyTD);

        messageTR.attr('data-message-id', message.id);
        messageTR.data('emphasizedNum', emphasizedNum);
        return messageTR;
    }
    function updateViewMessages(self) {
        if (self.channelName) {
            if (self.isShowingOldLogs()) {
                var d = new Date(self.startTime_ * 1000);
                if ((self.endTime_ - self.startTime_) === 60 * 60 * 24 &&
                    d.getHours() === 0 &&
                    d.getMinutes() === 0 &&
                    d.getSeconds() === 0) {
                    var startTime = starChat.toISO8601(new Date(self.startTime_ * 1000), 'date');
                    var oldLogs = '(Old Logs: ' + startTime + ')';
                } else {
                    var startTime = starChat.toISO8601(new Date(self.startTime_ * 1000));
                    var endTime   = starChat.toISO8601(new Date(self.endTime_   * 1000));
                    var oldLogs = '(Old Logs: ' + startTime + '/' + endTime + ')';
                }
                $('#messages h2').text(self.channelName + ' ' + oldLogs);
            } else {
                $('#messages h2').text(self.channelName);
            }
        } else {
            $('#messages h2').text("\u00a0");
        }
        if (!self.isShowingOldLogs()) {
            $('#messages > section').filter(function (i) {
                return $(this).attr('data-start-time') || $(this).attr('data-end-time');
            }).remove();
        }
        var section = getSectionElement(self);
        $('#messages > section').each(function () {
            var e = $(this);
            if (e.get(0) === section.get(0)) {
                e.show();
            } else {
                e.hide();
            }
        });
        var hitKeyword = false;
        Object.keys(self.newMessages_).forEach(function (channel) {
            self.newMessages_[channel].forEach(function (message) {
                if (message.id in self.messageElements_) {
                    return;
                }
                var keywords = [];
                var user = self.session().user();
                if (message.user_name !== user.name()) {
                    keywords = user.keywords();
                }
                var e = messageToElement(message, keywords);
                self.messageElements_[message.id] = e;
                hitKeyword |= (0 < e.data('emphasizedNum'));
            });
        });
        if (hitKeyword && !starChat.isFocused()) {
            startBlinkingTitle(self, '(*) ' + self.title_);
        }

        if (!self.channelName) {
            self.lastChannelName_ = '';
            return;
        }

        // isBottom should be gotten before appending new message elements
        var diff = (section.get(0).scrollHeight - section.scrollTop()) -
            section.outerHeight();
        var isBottom = diff < 100;

        // TODO: sort by id
        var table = section.find('table.messages');
        if (table.length === 0) {
            table = $('<table></table>').addClass('messages');
            section.append(table);
        }        
        if (!self.isShowingOldLogs()) {
            if (self.channelName in self.newMessages_) {
                var msgs = self.newMessages_[self.channelName];
                msgs.forEach(function (message) {
                    if (message.id in self.messageIdsAlreadyInSection_) {
                        return;
                    }
                    self.messageIdsAlreadyInSection_[message.id] = true;
                    table.append(self.messageElements_[message.id]);
                });
                self.newMessages_[self.channelName] = [];
            }
            if (self.channelName in self.pseudoMessages_) {
                var messages = self.pseudoMessages_[self.channelName];
                messages.forEach(function (message) {
                    var e = messageToElement(message);
                    e.attr('data-pseudo-message-id', message.pseudo_message_id)
                    table.append(e);
                });
                self.pseudoMessages_[self.channelName] = [];
            }
        } else {
            var key = self.startTime_ + '_' + self.endTime_;
            if (self.channelName in self.oldMessages_ &&
                key in self.oldMessages_[self.channelName]) {
                // TODO: Refactoring
                table.empty();
                var msgs = self.oldMessages_[self.channelName][key];
                msgs.forEach(function (message) {
                    table.append(messageToElement(message, []));
                });
            }
        }

        $('[data-pseudo-message-id]').filter('[data-removed="true"]').remove();

        if (!self.isShowingOldLogs() && !section.is(':animated')) {
            if (self.lastChannelName_ === self.channelName) {
                if (isBottom) {
                    setTimeout(function () {
                        section.animate({scrollTop: section.get(0).scrollHeight}, {
                            duration: 750,
                        })
                    }, 0);
                }
            } else {
                if (!self.lastChannelName_ ||
                    !(self.channelName in self.messageScrollTops_)) {
                    section.scrollTop(section.get(0).scrollHeight);
                } else {
                    section.scrollTop(self.messageScrollTops_[self.channelName]);
                }
            }
            self.messageScrollTops_[self.channelName] = section.scrollTop();
            self.lastChannelName_ = self.channelName;
        }
    }
    function updateViewTopic(self) {
        var form = $('#updateTopicForm');
        if (self.channelName) {
            if (self.isEdittingTopic()) {
                $('#topic').hide();
                form.show();
            } else {
                $('#topic').show();
                form.hide();
            }
            var channel = starChat.Channel.find(self.channelName);
            var topic   = channel.topic();
            if (topic && topic.body) {
                var topicE = $('#topic').text(topic.body);
                starChat.replaceURLWithLinks(topicE);
                starChat.replaceBreakLines(topicE);
                form.find('[name="body"]').val(topic.body);
            } else {
                $('#topic').text('(No Topic)');
                form.find('[name="body"]').val('');
            }
        } else {
            $('#topic').hide();
            form.hide();
            $('#topic').text('');
            form.find('[name="body"]').val('');
        }
    }
    function updateViewUsers(self) {
        var channel = starChat.Channel.find(self.channelName);
        var users = channel.users();
        var userNames = users.map(function (user) {
            return user.name();
        }).sort();
        var ul = $('#users');
        ul.empty();
        userNames.forEach(function (userName) {
            var li = $('<li></li>');
            li.text(userName);
            ul.append(li);
        });
    }
    function updateViewDialogs(self) {
        $('.dialog').hide();
        var dialogIsShown = false;
        if (self.isEdittingUser()) {
            $('#editUserDialog').show();
            $('#editUserDialog [title="name"]').text(self.session().userName());
            var user = self.session().user();
            var val = user.keywords().join('\n');
            $('#editUserDialog [name="keywords"]').val(val); // Move to the view?
            dialogIsShown = true;
        }
        if (self.isEdittingChannels()) {
            $('#editChannelsDialog').show();
            dialogIsShown = true;
        }
        if (dialogIsShown) {
            $('#dialogBackground').show();
        } else {
            $('#dialogBackground').hide();
        }
    }
    View.prototype.update = function () {
        if (this.session_.isLoggedIn()) {
            $('#logInForm').hide();
            $('#logOutLink span').text(this.session_.userName());
            $('#logOutLink').show();
            $('#main').find('input, textarea').removeAttr('disabled');
            if (this.channelName && !this.isShowingOldLogs()) {
                $('#postMessageForm, #updateTopicForm').find('input, textarea').removeAttr('disabled');
            } else {
                $('#postMessageForm, #updateTopicForm').find('input, textarea').attr('disabled', 'disabled');
            }
        } else {
            $('#logInForm').show();
            $('#logOutLink').hide();
            $('#main').find('input, textarea').attr('disabled', 'disabled');
        }
        updateViewChannels(this);
        updateViewSearch(this);
        updateViewMessages(this);
        updateViewTopic(this);
        updateViewUsers(this);
        $('img[data-image-icon-name]').each(function () {
            var e = $(this);
            if (e.attr('src')) {
                return true;
            }
            var iconName = e.attr('data-image-icon-name');
            e.attr('src', starChat.Icons[iconName]);
        });

        updateViewDialogs(this);

        $('a').filter(function () {
            var href = $(this).attr('href');
            if (!href.match(/^([a-zA-Z1-9+.-]+):/)) {
                return false;
            }
            var schema = RegExp.$1;
            if (!schema.match(/^https?$/)) {
                return true;
            }
            href.match(/^([a-zA-Z1-9+.-]+):\/\/([^\/]+)\//);
            // This may include a user and a pass, but they are ignored.
            var login = RegExp.$2;
            if (schema + ':' === location.protocol &&
                login === location.host) {
                return false;
            }
            return true;
        }).attr('target', '_blank').attr('rel', 'noreferrer');

        $(window).resize();
    };
    View.prototype.logIn = function (userName, password) {
        this.session_ = new this.sessionClass_($.now(), userName, password);
    };
    View.prototype.logOut = function () {
        this.session_ = new this.sessionClass_();
        initialize(this);
    };
    View.prototype.session = function () {
        return this.session_;
    };
    // TODO: Is channelName needed?
    View.prototype.addNewMessage = function (channelName, message, setDirtyFlag) {
        if (!this.newMessages_[channelName]) {
            this.newMessages_[channelName] = [];
        }
        if (message.id in this.messageIdsAlreadyInSection_) {
            return;
        }
        this.newMessages_[channelName].push(message);
        if (setDirtyFlag && channelName !== this.channelName) {
            this.setDirtyFlag(channelName, true);
        }
        if (message.user_name === this.session().user().name()) {
            var body = message.body;
            var id = $('[data-pseudo-message-id]').filter(function () {
                var e = $(this);
                return e.find('.body').text() === body &&
                    e.attr('data-removed') !== 'true';
            }).first().attr('data-pseudo-message-id');
            this.removePseudoMessage(id);
        }
    };
    View.prototype.addPseudoMessage = function (message) {
        if (!(message.channel_name in this.pseudoMessages_)) {
            this.pseudoMessages_[message.channel_name] = [];
        }
        this.pseudoMessages_[message.channel_name].push(message);
    };
    View.prototype.removePseudoMessage = function (id) {
        $('[data-pseudo-message-id=' + parseInt(id) + ']').attr('data-removed', 'true');
    };
    View.prototype.setDirtyFlag = function (channelName, value) {
        this.dirtyFlags_[channelName] = value;
    };
    View.prototype.resetTimeSpan = function () {
        this.startTime_ = null;
        this.endTime_   = null;
    };
    View.prototype.setTimeSpan = function (startTime, endTime) {
        this.startTime_ = startTime;
        this.endTime_   = endTime;
    };
    View.prototype.isShowingOldLogs = function () {
        return $.isNumeric(this.startTime_) && $.isNumeric(this.endTime_);
    };
    View.prototype.setOldMessages = function (channelName, startTime, endTime, messages) {
        if (!(channelName in this.oldMessages_)) {
            this.oldMessages_[channelName] = {};
        }
        var key = startTime + '_' + endTime;
        this.oldMessages_[channelName][key] = messages;
    };
    View.prototype.isEdittingUser = function (value) {
        if (value !== void(0)) {
            this.isEdittingUser_ = value;
            return this;
        } else {
            return this.isEdittingUser_;
        }
    };
    View.prototype.isEdittingChannels = function (value) {
        if (value !== void(0)) {
            this.isEdittingChannels_ = value;
            return this;
        } else {
            return this.isEdittingChannels_;
        }
    };
    View.prototype.closeDialogs = function() {
        this.isEdittingUser(false);
        this.isEdittingChannels(false);
    };
    View.prototype.setSearch = function (query, result) {
        this.searchQuery_  = query;
        this.searchResult_ = result;
    };
    View.prototype.clearSearch = function () {
        this.searchQuery_  = null;
        this.searchResult_ = [];
    };
    View.prototype.isEdittingTopic = function(value) {
        if (value !== void(0)) {
            this.isEdittingTopic_ = value;
            return this;
        } else {
            return this.isEdittingTopic_;
        }
    };
    return View;
})();
