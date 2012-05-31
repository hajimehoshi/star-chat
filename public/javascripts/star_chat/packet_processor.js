'use strict';

starChat.PacketProcessor = (function () {
    var PacketProcessor = function () {
    };
    function processPacketMessage(packet, view) {
        var message = packet.message;
        if (message && message.channel_name) {
            view.addNewMessage(message.channel_name, message, true);
        }
    }
    function processPacketSubscribing(packet, view) {
        var channelName = packet.channel_name;
        if (!(channelName in view.userNames)) {
            view.userNames[channelName] = {};
        }
        var userNames = view.userNames[channelName];
        userNames[packet.user_name] = true;
    }
    function processPacketDeleteSubscribing(packet, view) {
        var channelName = packet.channel_name;
        if (!(channelName in view.userNames)) {
            view.userNames[channelName] = {};
            return;
        }
        var userNames = view.userNames[channelName];
        delete userNames[packet.user_name];
    }
    function processPacketTopic(packet, view) {
        var topic = packet.topic;
        if (topic) {
            var channel = view.session().user().channel(topic.channel_name);
            channel.topic(topic);
        }
    }
    PacketProcessor.prototype.process = function (packet, view) {
        if (packet.type === 'message') {
            processPacketMessage(packet, view);
        } else if (packet.type === 'subscribing') {
            processPacketSubscribing(packet, view);
        } else if (packet.type === 'delete_subscribing') {
            processPacketDeleteSubscribing(packet, view);
        } else if (packet.type === 'topic') {
            processPacketTopic(packet, view);
        }
    };
    return PacketProcessor;
})();
