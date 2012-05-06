# -*- coding: utf-8 -*-
module StarChat

  class Channel

    def self.find(name)
      if RedisDB.exec(:exists, ['channels', name])
        return new(name)
      end
      nil
    end

    def self.all
      RedisDB.exec(:smembers, ['channels']).map do |name|
        Channel.find(name)
      end
    end

    attr_reader :name
    
    def initialize(name)
      @name = name.strip.gsub(/[[:cntrl:]]/, '')[0, 32]
    end

    def messages(idx, len)
      Message.find_by_list(['channels', name, 'messages'], idx, len)
    end

    def messages_by_time_span(start_time, end_time)
      redis_key = ['channels', name, 'messages']
      len = RedisDB.exec(:llen, redis_key)
      idx1 = BinarySearch.search(start_time, 0, len) do |i|
        Message.find_by_list(redis_key, i, 1)[0].created_at
      end
      idx2 = BinarySearch.search(end_time, 0, len) do |i|
        Message.find_by_list(redis_key, i, 1)[0].created_at
      end
      Message.find_by_list(redis_key, idx1, idx2 - idx1)
    end

    def post_message(user, body, created_at = Time.now.to_i)
      message = Message.new(user.name, body, created_at: created_at).save
      RedisDB.exec(:rpush, ['channels', name, 'messages'], message.id)
      message
    end

    def users
      RedisDB.exec(:smembers, ['channels', name, 'users']).map do |name|
        User.find(name)
      end
    end

    def to_json(*args)
      {
        name: name
      }.to_json(*args)
    end

    def save
      raise 'The name should not be empty' if name.empty?
      RedisDB.multi do
        RedisDB.exec(:sadd, ['channels'], name)
        RedisDB.exec(:hmset, ['channels', name], 'dummy', 'dummy')
      end
      self
    end

  end

end
