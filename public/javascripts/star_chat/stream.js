'use strict';

starChat.Stream = (function () {
    var Stream = function (packetProcessor) {
        this.packetProcessor_ = packetProcessor;
        this.continuingErrorNum_ = 0;
        this.ajax_ = null;
    };
    Stream.prototype.start = function (view, startTime) {
        if (this.ajax_) {
            console.error('An ajax object already exists!');
            return;
        }
        var self = this;
        var session = view.session();
        var streamReadIndex = 0;
        var url = '/users/' + encodeURIComponent(session.userName()) + '/stream';
        if (startTime !== void(0)) {
            url += '?start_time=' + encodeURIComponent(startTime);
        }
        var restartStream = function (lastTime) {
            self.stop();
            if (!view.session().isLoggedIn()) {
                return;
            }
            self.start(view, lastTime);
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
                    restartStream(starChat.parseInt($.now() / 1000) - 10);
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
                    restartStream(starChat.parseInt($.now() / 1000) - 10);
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
    Stream.prototype.stop = function () {
        if (!this.ajax_) {
            return;
        }
        this.ajax_.abort();
        this.ajax_ = null;
    };
    return Stream;
})();
