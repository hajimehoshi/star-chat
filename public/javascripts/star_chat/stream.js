'use strict';

/**
 * @constructor
 * @param {starChat.PacketProcessor} packetProcessor
 */
starChat.Stream = function (packetProcessor) {
    /**
     * @type {starChat.PacketProcessor}
     */
    this.packetProcessor_ = packetProcessor;
    /**
     * @type {number}
     */
    this.continuingErrorNum_ = 0;
    /**
     * @type {jQuery.jqXHR}
     */
    this.ajax_ = null;
};

/**
 * @param {starChat.View} view
 * @param {number=} startMessageId
 * @return {undefined}
 */
starChat.Stream.prototype.start = function (view, startMessageId) {
    if (this.ajax_) {
        console.error('An ajax object already exists!');
        return;
    }
    var self = this;
    var session = view.session();
    var streamReadIndex = 0;
    var url = '/users/' + encodeURIComponent(session.userName()) + '/stream';
    if (startMessageId !== void(0) && 1 < startMessageId) {
        url += '?start_message_id=' + encodeURIComponent(String(startMessageId));
    }
    var restartStream = function (lastMessageId) {
        self.stop();
        if (!view.session().isLoggedIn()) {
            return;
        }
        self.start(view, lastMessageId + 1);
    };
    console.log('Connecting stream...');
    this.ajax_ = $.ajax({
        url: url,
        type: 'GET',
        cache: false,
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization',
                                 'Basic ' + btoa(session.userName() + ':' + session.password()));
        },
        dataType: 'json',
        success: function (data, textStatus, jqXHR) {
            self.continuingErrorNum_ = 0;
            setTimeout(function () {
                var lastMessageId = self.packetProcessor_.lastMessageId();
                restartStream(lastMessageId);
            }, 0);
        },
        error: function (jqXHR, textStatus, errorThrown) {
            self.continuingErrorNum_++;
            console.error('Stream Error! (' + self.continuingErrorNum_ + ')');
            console.error(textStatus);
            if (10 <= self.continuingErrorNum_) {
                console.error('Too many errors!');
                // TODO: implement showing error message
                return;
            }
            setTimeout(function () {
                var lastMessageId = self.packetProcessor_.lastMessageId();
                restartStream(lastMessageId);
            }, 2000);
        },
        xhrFields: {
            onprogress: function () {
                console.log('Reading stream...');
                self.continuingErrorNum_ = 0;
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
                        var packet = JSON.parse(token);
                    } catch (e) {
                        console.log(e);
                        continue;
                    }
                    self.packetProcessor_.process(packet, view);
                }
                view.update();
            }
        }
    });
};

/**
 * @return {undefined}
 */
starChat.Stream.prototype.stop = function () {
    if (!this.ajax_) {
        return;
    }
    this.ajax_.abort();
    this.ajax_ = null;
};
