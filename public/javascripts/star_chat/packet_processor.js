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
        var userName    = packet.user_name;
        starChat.Channel.find(channelName).addUser(userName);
    }
    function processPacketDeleteSubscribing(packet, view) {
        var channelName = packet.channel_name;
        var userName    = packet.user_name;
        starChat.Channel.find(channelName).removeUser(userName);
    }
    function processPacketTopic(packet, view) {
        var topic = packet.topic;
        if (topic) {
            var channel = starChat.Channel.find(topic.channel_name);
            channel.topic(topic);
        }
    }
    function processPacketUser(packet, view) {
        var userObj = packet.user;
        if (userObj) {
            var user = starChat.User.find(userObj.name);
            user.update(userObj);
        }
    }
    function processPacketChannel(packet, view) {
        var channelObj = /** @type {{channel: {name: string}}} */packet.channel;
        if (channelObj) {
            var channel = starChat.Channel.find(channelObj.name);
            channel.update(channelObj);
        }
    }
    PacketProcessor.prototype.process = function (packet, view) {
        if (packet.type === 'message') {
            processPacketMessage(packet, view);
        } else if (packet.type === 'subscribing') {
            processPacketSubscribing(packet, view);
        } else if (packet.type === 'delete_subscribing') {
            processPacketDeleteSubscribing(packet, view);
        } else if (packet.type === 'user') {
            processPacketUser(packet, view);
        } else if (packet.type === 'channel') {
            processPacketChannel(packet, view);
        } else {
            console.error('Received an unknown packet:');
            console.error(packet);
        }
    };
    return PacketProcessor;
})();
