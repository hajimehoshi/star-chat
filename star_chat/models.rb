# coding: utf-8

require 'rubygems'
require 'json'

module StarChat
  autoload :Message,      './star_chat/message'
  autoload :Channel,      './star_chat/channel'
  autoload :User,         './star_chat/user'
  autoload :Subscribing,  './star_chat/subscribing'
  autoload :RedisDB,      './star_chat/redis_db'
  autoload :BinarySearch, './star_chat/binary_search'
end
