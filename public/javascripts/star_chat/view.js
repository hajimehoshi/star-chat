'use strict';

/**
 * @constructor
 * @param {function(new:starChat.Session,number=,string=,string=):undefined} sessionClass
 */
starChat.View = function (sessionClass) {
    this.sessionClass_ = sessionClass;
    this.initialize(this);
};

/**
 * @private
 */
starChat.View.prototype.initialize = function (self) {
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
    self.isScrolling_ = false;
    self.dirtyFlags_ = {};
    self.time_ = null;
    self.isBlinkingTitle_ = false;
    self.searchQuery_ = null;
    self.searchResult_ = [];
    self.isEdittingTopic_ = false;
    self.errorMessages_ = {};

    // Dialogs
    self.isEdittingUser_ = false;
    self.isEdittingChannels_ = false;
    self.isEdittingChannel_ = false;
    self.edittingChannelName_ = false;
    self.isShowingInvitationURLDialog_ = false;

    self.title_ = 'StarChat (β)';
    document.title = self.title_;
    this.stopBlinkingTitle(self);
}

/**
 * @private
 */
starChat.View.prototype.startBlinkingTitle = function (self) {
    if (self.isBlinkingTitle_) {
        return;
    }
    self.isBlinkingTitle_ = true;
    var self = this;
    function loop (i) {
        if (!self.isBlinkingTitle_) {
            self.stopBlinkingTitle(self);
            return;
        }
        if (starChat.isFocused()) {
            self.stopBlinkingTitle(self);
            return;
        }
        document.title = {
            0: self.title_,
            1: '(*) ' + self.title_
        }[i];
        setTimeout(function () {
            loop(1 - i);
        }, 1000);
    }
    loop(0);
}

/**
 * @private
 */
starChat.View.prototype.stopBlinkingTitle = function (self) {
    self.isBlinkingTitle_ = false;
    document.title = self.title_;
}

/**
 * @private
 */
starChat.View.prototype.updateViewChannels = (function () {
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

/**
 * @private
 */
starChat.View.prototype.updateViewSearch = function (self) {
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

        var channelNameLink = $('<a></a>').text(message.channel_name);
        channelNameLink.attr('href', '#').click(function () {
            location.hash = 'channels/' + encodeURIComponent(message.channel_name);
            self.channelName = message.channel_name;
            self.setTime(message.created_at);
            self.update();
            return false;
        });
        // TODO: highlight

        li.append(createdAtE);
        li.append($('<br />'));
        li.append(userNameE);
        li.append($('<br />'));
        li.append(bodyE);
        li.append($(document.createTextNode(' (')));
        li.append(channelNameLink);
        li.append($(document.createTextNode(')')));
        ul.append(li);
    });
}

/**
 * @private
 */
starChat.View.prototype.getSectionElement = function (self) {
    if (!self.channelName) {
        return $('#messages > section[data-channel-name=""]');
    }
    var sections = $('#messages > section').filter(function (i) {
        return $(this).attr('data-channel-name') === self.channelName;
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
    section.scroll(function () {
        if (self.channelName !== channelName) {
            return;
        }
        self.messageScrollTops_[channelName] = section.scrollTop();
    });
    $('#messages h2').after(section);
    return section;
}

/**
 * @private
 * @param {Object} message
 * @param {Array.<string>=} keywords
 */
starChat.View.prototype.messageToElement = function (message, keywords) {
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
    var createdAtTime = $('<time></time>').text(timeStr).attr('data-unix-time', message.created_at);
    createdAtTD.append(createdAtTime).addClass('createdAt');
    messageTR.append(createdAtTD);

    var user = starChat.User.find(message.user_name);
    var nick = String(user.nick());
    var userNameTD = $('<td></td>').text(nick).attr('title', user.name());
    userNameTD.addClass('userName');
    messageTR.append(userNameTD);

    /**
     * @type {!jQuery}
     */
    var bodyTD = /** @type {!jQuery} */$('<td></td>').addClass('body').text(message.body);
    if (message.notice) {
        bodyTD.addClass('notice');
    }
    starChat.replaceURLWithLinks(bodyTD);

    var emphasizedNum = 0;
    if (keywords !== void(0) && !message.notice) {
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

/**
 * @private
 */
starChat.View.prototype.dateToElement = function (dateStr) {
    var unixTime = starChat.toUNIXTime(dateStr);
    var tr = $('<tr></tr>').addClass('date');
    var td = $('<td></td>').attr('colspan', '3');
    var time = $('<time></time>').text(dateStr).attr('data-unix-time', unixTime);
    td.append(time);
    tr.append(td);
    return tr;
}

/**
 * @private
 */
starChat.View.prototype.updateViewMessages = function (self) {
    if (self.channelName) {
        var h2 = $('#messages h2');
        h2.find('span').text(self.channelName);
        var channel = starChat.Channel.find(self.channelName);
        if (channel.privacy() === 'private') {
            h2.find('img[alt="private"]').show();
        } else {
            h2.find('img[alt="private"]').hide();
        }
    } else {
        var h2 = $('#messages h2');
        h2.find('span').text("\u00a0");
        h2.find('img[alt="private"]').hide();
    }
    var section = this.getSectionElement(self);
    $('#messages > section').each(function () {
        var e = $(this);
        if (e.get(0) === section.get(0)) {
            e.show();
        } else {
            e.hide();
        }
    });
    var hitKeyword = false;
    var self = this;
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
            var e = self.messageToElement(message, keywords);
            self.messageElements_[message.id] = e;
            hitKeyword |= (0 < e.data('emphasizedNum'));
        });
    });
    if (hitKeyword && !starChat.isFocused()) {
        this.startBlinkingTitle(self);
    }
    self.title_ = 'StarChat (β)';
    if (self.channelName) {
        self.title_ += ' - ' + self.channelName;
        if (!self.isBlinkingTitle_) {
            document.title = self.title_;
        }
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
        // A dummy TR is needed because the first TR defines the layout of the table.
        var tr = $('<tr></tr>').addClass('message');
        tr.append($('<td></td>').addClass('createdAt'));
        tr.append($('<td></td>').addClass('userName'));
        tr.append($('<td></td>').addClass('body'));
        tr.css('height', 0);
        table.append(tr);
        section.append(table);
    }
    if (self.channelName in self.newMessages_) {
        var lastUNIXTime = table.find('tr.message').
            not('[data-pseudo-message-id]').find('time').
            last().attr('data-unix-time');
        var msgs = self.newMessages_[self.channelName];
        var self = this;
        msgs.forEach(function (message) {
            if (message.id in self.messageIdsAlreadyInSection_) {
                return;
            }
            self.messageIdsAlreadyInSection_[message.id] = true;
            var lastDateStr = null;
            if (lastUNIXTime) {
                lastDateStr = starChat.toISO8601(lastUNIXTime, 'date');
            }
            var nextDateStr      = starChat.toISO8601(message.created_at, 'date');
            var nextDateUNIXTime = starChat.toUNIXTime(nextDateStr);
            if (!lastDateStr || (lastDateStr !== nextDateStr)) {
                if (table.find('tr.date').filter(function () {
                    return Math.floor($(this).find('time').attr('data-unix-time')) === nextDateUNIXTime;
                }).length === 0) {
                    var tr = self.dateToElement(nextDateStr);
                    // The first tr.date needs to load messages
                    if (table.find('tr.date').length === 0) {
                        tr.addClass('imcomplete');
                    }
                    table.append(tr);
                }
            }
            table.append(self.messageElements_[message.id]);
            lastUNIXTime = message.created_at;
        });
        self.newMessages_[self.channelName] = [];
    }
    if (self.channelName in self.pseudoMessages_) {
        var messages = self.pseudoMessages_[self.channelName];
        var self = this;
        messages.forEach(function (message) {
            var e = self.messageToElement(message);
            e.attr('data-pseudo-message-id', message.pseudo_message_id)
            table.append(e);
        });
        self.pseudoMessages_[self.channelName] = [];
    }

    $('[data-pseudo-message-id]').filter('[data-removed="true"]').remove();

    if (!self.isScrolling_) {
        self.isScrolling_ = true;
        if (self.time_ && self.channelName) {
            var target = null;
            section.find('[data-unix-time]').each(function () {
                var e = $(this);
                var unixTime = starChat.parseInt(String(e.attr('data-unix-time')));
                if (self.time_ < unixTime) {
                    return false;
                }
                target = e;
                return true;
            });
            if (target !== null) {
                target = target.parent().parent(); // tr
            }
            if (target === null ||
                (starChat.toISO8601(self.time_, 'date') !==
                 starChat.toISO8601(target.find('time').attr('data-unix-time'), 'date'))) {
                var scrollTop = 0;
                var date = new Date(self.time_ * 1000);
                var dateStr = starChat.toISO8601(self.time_, 'date');
                var tr = this.dateToElement(dateStr);
                var nextTR = section.find('table.messages tr.date').filter(function () {
                    var e = $(this);
                    var nextUNIXTime = e.find('time').attr('data-unix-time');
                    return self.time_ < nextUNIXTime;
                }).first();
                if (nextTR.length === 1) {
                    tr.insertBefore(nextTR);
                } else {
                    section.find('table.messages').append(tr);
                }
                tr.addClass('imcomplete'); // needs to load messages
                target = tr;
            }
            if (target !== null) {
                var scrollTop = target.position().top + section.scrollTop() - 40;
            } else {
                var scrollTop = section.get(0).scrollHeight();
            }
            section.animate({scrollTop: scrollTop}, {
                complete: function () {
                    self.messageScrollTops_[self.channelName] = section.scrollTop();
                    self.lastChannelName_ = self.channelName;
                    self.isScrolling_ = false;
                }
            });
            self.time_ = null;
        } else {
            // Manipurate the scrool top after elements are set completely.
            setTimeout(function () {
                if (self.lastChannelName_ === self.channelName &&
                    isBottom) {
                    section.animate({scrollTop: section.get(0).scrollHeight}, {
                        duration: 750,
                        complete: function () {
                            self.messageScrollTops_[self.channelName] = section.scrollTop();
                            self.lastChannelName_ = self.channelName;
                            self.isScrolling_ = false;
                        }
                    });
                } else {
                    if (!self.lastChannelName_ ||
                        !(self.channelName in self.messageScrollTops_)) {
                        section.scrollTop(section.get(0).scrollHeight);
                    } else {
                        section.scrollTop(self.messageScrollTops_[self.channelName]);
                    }
                    self.messageScrollTops_[self.channelName] = section.scrollTop();
                    self.lastChannelName_ = self.channelName;
                    self.isScrolling_ = false;
                }
            }, 0);
        }
    }
}

/**
 * @private
 */
starChat.View.prototype.loadMessages = function (self) {
    if (!self.channelName) {
        return;
    }
    var section = this.getSectionElement(self);
    var self = this;
    section.find('table.messages tr.date.imcomplete').each(function () {
        var e = $(this);
        var channel = starChat.Channel.find(self.channelName);
        var startTime = Math.floor(e.find('time').attr('data-unix-time'));
        var endTime   = startTime + 60 * 60 * 24;
        channel.loadMessagesByTimeSpan(self.session(), startTime, endTime, function (sessionId, data) {
            var view = getView();
            if (view.session().id() !== sessionId) {
                return;
            }
            var table = section.find('table.messages');
            var lastTR = e;
            data.forEach(function (message) {
                var messageTR = self.messageToElement(message);
                var tr = section.find('tr.message[data-message-id="' + message.id + '"]');
                if (0 < tr.length) {
                    lastTR = tr;
                } else {
                    messageTR.insertAfter(lastTR);
                    lastTR = messageTR;
                }
            });
        });
        e.removeClass('imcomplete');
    });
}

/**
 * @private
 */
starChat.View.prototype.updateViewTopic = function (self) {
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
            /**
             * @type {!jQuery}
             */
            var topicE = /** @type {!jQuery} */$('#topic').text(topic.body);
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

/**
 * @private
 */
starChat.View.prototype.updateViewUsers = function (self) {
    var ul = $('#users');
    ul.empty();
    if (self.channelName) {
        var channel = starChat.Channel.find(self.channelName);
        var users = channel.users().sort(function (a, b) {
            if (a.nick() > b.nick()) {
                return 1;
            }
            if (a.nick() < b.nick()) {
                return -1;
            }
            return 0;
        });
        users.forEach(function (user) {
            var li = $('<li></li>');
            li.text(user.nick()).attr('title', user.name());
            ul.append(li);
        });
        if (channel.privacy() === 'private') {
            $('#invitationLink').show();
        } else {
            $('#invitationLink').hide();
        }
    } else {
        $('#invitationLink').hide();
    }
}

/**
 * @private
 */
starChat.View.prototype.updateViewTimeline = function (self) {
    if (!self.channelName) {
        return;
    }

    var ul = $('#timeline ul');
    ul.empty();

    var channel = starChat.Channel.find(self.channelName);
    var firstMessage = channel.firstMessage();
    if (!firstMessage) {
        return;
    }

    var firstDate = new Date(firstMessage.created_at * 1000);
    var firstYear  = Math.floor(firstDate.getFullYear());
    var firstMonth = Math.floor(firstDate.getMonth()) + 1;
    var firstYM    = firstYear * 100 + firstMonth;
    
    var today = new Date();
    var todayYear  = Math.floor(today.getFullYear());
    var todayMonth = Math.floor(today.getMonth()) + 1;
    var todayYM    = todayYear * 100 + todayMonth;

    function ymToUNIXTime(ym, day) {
        if (day === void(0)) {
            day = 1;
        }
        return Math.floor(new Date(ym / 100, ym % 100 - 1, day).getTime() / 1000);
    }
    
    for (var ym = firstYM;
         ym <= todayYM;) {
        var nextYM = ym + 1;
        if (13 <= (nextYM % 100)) {
            nextYM = (Math.floor(ym / 100) + 1) * 100 + 1;
        }
        try {
            var text = String(ym).substr(0, 4) + '-' + String(ym).substr(4);
            var span = $('<span></span>').text(text);
            var li = $('<li></li>').append(span);
            if (ym === firstYM) {
                var startTime = ymToUNIXTime(ym, firstDate.getDate());
            } else {
                var startTime = ymToUNIXTime(ym, 1);
            }
            var currentMonth = ym % 100;
            var ul2 = $('<ul></ul>');
            for (;
                 (new Date(startTime * 1000)).getMonth() + 1 === currentMonth &&
                 startTime <= (today.getTime() / 1000);
                 startTime += 60 * 60 * 24) {
                var li2 = $('<li></li>');
                text = starChat.toISO8601(new Date(startTime * 1000), 'date').substr(8, 2);
                var a = $('<a></a>').text(text);
                (function () {
                    var s = startTime;
                    a.attr('href', '#').click(function () {
                        self.setTime(s);
                        self.update();
                        return false;
                    });
                })();
                li2.append(a);
                ul2.append(li2);
            }
            li.append(ul2);
            ul.append(li);
        } finally {
            ym = nextYM;
        }
    }
    var a = $('<a></a>').text('Now').attr('href', '#').click(function () {
        self.setTime(Math.floor($.now() / 1000));
        self.update();
        return false;
    });
    var li = $('<li></li>').append(a);
    ul.append(li);
}

/**
 * @private
 */
starChat.View.prototype.updateViewDialogs = function (self) {
    $('.dialog').hide();
    var dialogIsShown = false;
    if (self.isEdittingUser()) {
        $('#editUserDialog').show();
        $('#editUserDialog [title="name"]').text(self.session().userName());
        var user = self.session().user();
        $('#editUserDialog [name="nick"]').val(user.nick());
        var val = user.keywords().join('\n');
        $('#editUserDialog [name="keywords"]').val(val); // Move to the view?
        dialogIsShown = true;
    }
    if (self.isEdittingChannels()) {
        $('#editChannelsDialog').show();
        var channels = self.session().user().channels();
        channels = channels.sort(function (a, b) {
            if (a.name() > b.name()) {
                return 1;
            }
            if (a.name() < b.name()) {
                return -1;
            }
            return 0;
        });
        var table = $('#editChannelsDialog h2 ~ table');
        var origTR = table.find('tr.cloneMe').hide();
        table.find('tr.cloned').not(origTR).remove();
        channels.forEach(function (channel) {
            var tr = origTR.clone(true).removeClass('cloneMe').addClass('cloned').show();
            tr.find('.channelName').text(channel.name());
            tr.find('.toolIcon').attr('data-channel-name', channel.name());
            table.append(tr);
        });
        dialogIsShown = true;
    }
    if (self.isEdittingChannel()) {
        var channelName = self.edittingChannelName();
        var channel = starChat.Channel.find(channelName);
        $('#editChannelDialog [title="channelName"]').text(channel.name());
        $('#editChannelDialog [name="privacy"]').val(['public']);
        if (channel.privacy() === 'private') {
            $('#editChannelDialog [name="privacy"]').val(['private']);
        }
        $('#editChannelDialog').show();
        dialogIsShown = true;
    } else {
        $('#editChannelDialog').hide();
    }
    if (self.isShowingInvitationURLDialog()) {
        dialogIsShown = true;
        $('#invitationURLDialog').show();
    } else {
        $('#invitationURLDialog').hide();
    }
    if (dialogIsShown) {
        $('#dialogBackground').show();
    } else {
        $('#dialogBackground').hide();
    }
}

/**
 */
starChat.View.prototype.update = function () {
    if (this.session_.isLoggedIn()) {
        $('#logInForm').hide();
        $('#logOutLink span').text(this.session_.userName());
        $('#logOutLink').show();
        $('#main').find('input, textarea').removeAttr('disabled');
        if (this.channelName) {
            $('#postMessageForm, #updateTopicForm').find('input, textarea').removeAttr('disabled');
        } else {
            $('#postMessageForm, #updateTopicForm').find('input, textarea').attr('disabled', 'disabled');
        }
    } else {
        $('#logInForm').show();
        $('#logOutLink').hide();
        $('#main').find('input, textarea').attr('disabled', 'disabled');
    }
    this.updateViewChannels(this);
    this.updateViewSearch(this);
    this.updateViewMessages(this);
    this.loadMessages(this);
    this.updateViewTopic(this);
    this.updateViewUsers(this);
    this.updateViewTimeline(this);
    this.updateViewDialogs(this);
    $('img[data-image-icon-name]').each(function () {
        var e = $(this);
        if (e.attr('src')) {
            return true;
        }
        var iconName = e.attr('data-image-icon-name');
        e.attr('src', starChat.Icons[iconName]);
    });

    $('a').filter(function () {
        var href = $(this).attr('href');
        var match = href.match(/^([a-zA-Z1-9+.-]+):/);
        if (!match) {
            return false;
        }
        var schema = match[1];
        if (!schema.match(/^https?$/)) {
            return true;
        }
        match = href.match(/^([a-zA-Z1-9+.-]+):\/\/([^\/]+)\//);
        // This may include a user and a pass, but they are ignored.
        var login = match[2];
        if (schema + ':' === location.protocol &&
            login === location.host) {
            return false;
        }
        return true;
    }).attr('target', '_blank').attr('rel', 'noreferrer');

    $(window).resize();
};
starChat.View.prototype.logIn = function (userName, password) {
    this.session_ = new this.sessionClass_($.now(), userName, password);
};
starChat.View.prototype.logOut = function () {
    this.session_ = new this.sessionClass_();
    initialize(this);
};
starChat.View.prototype.session = function () {
    return this.session_;
};
// TODO: Is channelName needed?
starChat.View.prototype.addNewMessage = function (channelName, message, setDirtyFlag) {
    if (!this.newMessages_[channelName]) {
        this.newMessages_[channelName] = [];
    }
    if (message.id in this.messageIdsAlreadyInSection_) {
        return;
    }
    this.newMessages_[channelName].push(message);
    if (setDirtyFlag &&
        channelName !== this.channelName &&
        message.user_name !== this.session().user().name()) {
        this.setDirtyFlag(channelName, true);
    }
    // TODO: Emphasize channel name?
    if (message.user_name === this.session().user().name()) {
        var body = message.body;
        // Is it OK to use the global selection?
        var id = $('[data-pseudo-message-id]').filter(function () {
            var e = $(this);
            if (e.attr('data-removed') === 'true') {
                return false;
            }
            var body1 = e.find('.body').text();
            /**
             * @type {!jQuery}
             */
            var e = /** @type {!jQuery} */$('<div></div>').text(body);
            starChat.replaceURLWithLinks(e);
            starChat.replaceBreakLines(e);
            var body2 = e.text();
            return body1 === body2;
        }).first().attr('data-pseudo-message-id');
        this.removePseudoMessage(id);
    }
};
starChat.View.prototype.addPseudoMessage = function (message) {
    if (!(message.channel_name in this.pseudoMessages_)) {
        this.pseudoMessages_[message.channel_name] = [];
    }
    this.pseudoMessages_[message.channel_name].push(message);
};
starChat.View.prototype.removePseudoMessage = function (id) {
    $('[data-pseudo-message-id=' + starChat.parseInt(id) + ']').attr('data-removed', 'true');
};
starChat.View.prototype.setDirtyFlag = function (channelName, value) {
    this.dirtyFlags_[channelName] = value;
};
starChat.View.prototype.setTime = function (time) {
    this.time_ = time;
};
starChat.View.prototype.isEdittingUser = function (value) {
    if (value !== void(0)) {
        this.isEdittingUser_ = value;
        return this;
    } else {
        return this.isEdittingUser_;
    }
};
starChat.View.prototype.isEdittingChannels = function (value) {
    if (value !== void(0)) {
        this.isEdittingChannels_ = value;
        return this;
    } else {
        return this.isEdittingChannels_;
    }
};
starChat.View.prototype.isEdittingChannel = function (value) {
    if (value !== void(0)) {
        this.isEdittingChannel_ = value;
        return this;
    } else {
        return this.isEdittingChannel_;
    }
};
starChat.View.prototype.edittingChannelName = function (value) {
    if (value !== void(0)) {
        this.edittingChannelName_ = value;
        return this;
    } else {
        return this.edittingChannelName_;
    }
}
starChat.View.prototype.isShowingInvitationURLDialog = function (value) {
    if (value !== void(0)) {
        this.isShowingInvitationURLDialog_ = value;
        return this;
    } else {
        return this.isShowingInvitationURLDialog_;
    }
};
starChat.View.prototype.closeDialogs = function () {
    this.isEdittingUser(false);
    this.isEdittingChannels(false);
    this.isEdittingChannel(false);
    this.isShowingInvitationURLDialog(false);
};
starChat.View.prototype.setSearch = function (query, result) {
    this.searchQuery_  = query;
    this.searchResult_ = result;
};
starChat.View.prototype.clearSearch = function () {
    this.searchQuery_  = null;
    this.searchResult_ = [];
};
starChat.View.prototype.isEdittingTopic = function (value) {
    if (value !== void(0)) {
        this.isEdittingTopic_ = value;
        return this;
    } else {
        return this.isEdittingTopic_;
    }
};
starChat.View.prototype.setErrorMesasge = function (x, message) {
    this.errorMessages_[x] = message;
};
