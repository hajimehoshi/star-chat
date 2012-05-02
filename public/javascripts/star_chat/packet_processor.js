'use strict';

starChat.PacketProcessor = (function () {
    var PacketProcessor = function () {
    };
    function processPacketMessage(packet, view) {
        var channelName = packet.channel_name;
        var message = packet.message;
        if (channelName && message) {
            if (!view.newMessages[channelName]) {
                view.newMessages[channelName] = [];
            }
            view.newMessages[channelName].push(message);
            var isDirty = channelName !== view.channelName;
            view.setDirtyFlag(channelName, isDirty);
            view.update();
        }
    }
    function processPacketSubscribing(packet, view) {
        var channelName = packet.channel_name;
        if (!(channelName in view.userNames)) {
            view.userNames[channelName] = {};
        }
        var userNames = view.userNames[channelName];
        userNames[packet.user_name] = true;
        if (channelName === view.channelName) {
            view.update();
        }
    }
    function processPacketDeleteSubscribing(packet, view) {
        var channelName = packet.channel_name;
        if (!(channelName in view.userNames)) {
            view.userNames[channelName] = {};
            return;
        }
        var userNames = view.userNames[channelName];
        delete userNames[packet.user_name];
        if (channelName === view.channelName) {
            view.update();
        }
    }
    PacketProcessor.prototype.process = function (packet, view) {
        if (packet.type === 'message') {
            processPacketMessage(packet, view);
        } else if (packet.type === 'subscribing') {
            processPacketSubscribing(packet, view);
        } else if (packet.type === 'delete_subscribing') {
            processPacketDeleteSubscribing(packet, view);
        }
    };
    return PacketProcessor;
})();
