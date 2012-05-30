# -*- coding: utf-8 -*-
module StarChat

  class Channel

    def self.find(name)
      key = ['channels', name]
      if RedisDB.exec(:exists, key)
        values = RedisDB.exec(:hmget, key, 'secret', 'password_digest')
        params = {
          secret:          values[0] == 'true',
          password_digest: values[1] ? values[1] : '',
        }
        if values[1] and !values[1].empty?
          params[:password_digest] = values[1]
        end
        return new(name, params)
      end
      nil
    end

    def self.all
      RedisDB.exec(:smembers, ['channels']).map do |name|
        Channel.find(name)
      end
    end

    def name
      @name
    end

    def name=(name)
      @name = name.strip.gsub(/[[:cntrl:]]/, '')[0, 32]
    end

    def secret?
      @secret
    end

    def secret=(secret)
      @secret = !!secret
    end

    def password_digest
      @password_digest
    end
    private :password_digest

    def password_digest=(password_digest)
      @password_digest = password_digest ? password_digest : password_digest.to_s
    end
    private :password_digest=

    # TODO: Rename 'current_topic_id'
    def last_topic_id
      topic_id = RedisDB.exec(:lindex, ['channels', name, 'topics'], -1)
      topic_id ? topic_id.to_i : nil
    end

    def initialize(name, options = {})
      options = {
        secret:          false,
        password_digest: nil,
      }.merge(options)
      self.name            = name
      self.secret          = options[:secret]
      self.password_digest = options[:password_digest]
    end

    class ChannelMessages
      include Enumerable
      def initialize(channel_name)
        @key = ['channels', channel_name, 'messages']
      end
      def each
        idx = 0
        loop do
          # TODO: Lock!
          messages = Message.find_by_list(@key, idx, 100)
          break if messages.size == 0
          messages.each do |message|
            yield message
          end
          idx += 100
        end
      end
    end

    def messages(idx = nil, len = nil)
      if idx and len
        Message.find_by_list(['channels', name, 'messages'], idx, len)
      else
        ChannelMessages.new(name)
      end
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
      # TODO: Check subscribing?
      message = nil
      # TODO: lock?
      message = Message.new(user.name,
                            body,
                            created_at:   created_at,
                            channel_name: name).save
      RedisDB.exec(:rpush,
                   ['channels', name, 'messages'],
                   message.id)
      message
    end

    def update_topic(user, body, created_at = Time.now.to_i)
      topic = nil
      # TODO: lock?
      topic = Topic.new(user.name,
                        self.name,
                        body,
                        created_at: created_at).save
      RedisDB.exec(:rpush,
                   ['channels', name, 'topics'],
                   topic.id)
      topic
    end

    def users
      RedisDB.exec(:smembers, ['channels', name, 'users']).map do |name|
        User.find(name)
      end
    end

    def to_json(*args)
      hash = {
        name: name
      }
      if last_topic_id
        topic = Topic.find(last_topic_id)
        hash[:topic] = topic.to_h
      end
      hash.to_json(*args)
    end

    def save
      raise 'The name should not be empty' if name.empty?
      RedisDB.multi do
        RedisDB.exec(:sadd, ['channels'], name)
        RedisDB.exec(:hmset, ['channels', name],
                     'secret',          secret? ? 'true' : 'false',
                     'password_digest', password_digest ? password_digest : '')
      end
      self
    end

  end

end
