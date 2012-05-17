'use strict';

starChat.Stream = (function () {
    var Stream = function (packetProcessor) {
        this.packetProcessor_ = packetProcessor;
        this.continuingErrorNum_ = 0;
        this.ajax_ = null;
    };
    Stream.prototype.start = function (view) {
        if (this.ajax_) {
            console.error('An ajax object already exists!');
            return;
        }
        this.continuingErrorNum_ = 0;
        var self = this;
        var session = view.session();
        var streamReadIndex = 0;
        var url = '/users/' + encodeURIComponent(session.userName()) + '/stream';
        var startStream = function () {
            if (self.ajax_) {
                self.ajax_.abort();
                self.ajax_ = null;
            }
            self.start(view);
        };
        var callbacks = {
            onprogress: function () {
                console.log('Reading stream...');
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
                    self.continuingErrorNum_ = 0;
                    self.packetProcessor_.process(packet, view);
                }
                view.update();
            },
            success: function (data, textStatus, jqXHR) {
                self.continuingErrorNum_ = 0;
                setTimeout(startStream, 0);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error('Stream Error!');
                console.error(textStatus);
                self.continuingErrorNum_++;
                if (20 <= self.ontinuingErrorNum_) {
                    console.error('Too many errors!');
                    // TODO: implement showing error message
                    return;
                }
                setTimeout(startStream, 1000);
            },
        };
        console.log('Connecting stream...');
        this.ajax_ = starChat.ajax(session.userName(), session.password(),
                                   url,
                                   'GET',
                                   callbacks);
    };
    Stream.prototype.stop = function () {
        if (!this.ajax_) {
            return;
        }
        this.continuingErrorNum_ = 0;
        this.ajax_.abort();
        this.ajax_ = null;
    };
    return Stream;
})();
