# coding: utf-8
require 'digest/sha2'
require 'securerandom'

module StarChat

  class Channel

    @@master_keys = Hash.new do |hash, key|
      hash[key] = SecureRandom.hex(64)
    end

    def self.find(name)
      key = ['channels', name]
      if RedisDB.exec(:exists, key)
        values = RedisDB.exec(:hmget, key, 'privacy')
        params = {
          privacy: values[0] ? values[0].to_sym : :public,
        }
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
      @name = name.strip.gsub(/(?![\n\r\t])[\x00-\x1f\x7f]/, '')[0, 32]
    end

    def privacy
      @privacy
    end

    def privacy=(privacy)
      privacy = privacy.to_sym
      if [:public, :private].include?(privacy)
        @privacy = privacy
      else
        @privacy = :public
      end
    end

    def public?
      privacy == :public
    end

    def private?
      privacy == :private
    end

    # TODO: Rename 'current_topic_id'
    def current_topic_id
      topic_id = RedisDB.exec(:lindex, ['channels', name, 'topics'], -1)
      topic_id ? topic_id.to_i : nil
    end

    def current_topic
      if current_topic_id
        Topic.find(current_topic_id)
      else
        nil
      end
    end

    def initialize(name, options = {})
      options = {
        privacy: :public,
      }.merge(options)
      self.name    = name
      self.privacy = options[:privacy]
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
      # TODO: lock?
      topic = Topic.new(user.name,
                        self.name,
                        body,
                        created_at: created_at)
      if current_topic and current_topic.body == topic.body
        return nil
      end
      topic.save
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
        name:    name,
        privacy: privacy,
      }
      if current_topic
        hash[:topic] = current_topic
      end
      hash.to_json(*args)
    end

    def save
      raise 'The name should not be empty' if name.empty?
      RedisDB.multi do
        RedisDB.exec(:sadd, ['channels'], name)
        RedisDB.exec(:hmset, ['channels', name],
                     'privacy', privacy.to_s)
      end
      self
    end

    def generate_key(user)
      raise 'invalid user' unless user.subscribing?(self)
      expire_time = Time.now.to_i + 60 * 5
      salt             = SecureRandom.hex(16)
      channel_name_hex = self.name.unpack('h*')[0]
      master_key       = @@master_keys[self.name]
      hash = Digest::SHA256.hexdigest("#{expire_time}.#{salt}.#{channel_name_hex}.#{master_key}")
      "#{expire_time}.#{salt}.#{channel_name_hex}.#{hash}"
    end

    def auth?(key)
      segments = key.split('.')
      return false if segments.length != 4
      expire_time_str, salt, channel_name_hex, hash = *segments
      expire_time = expire_time_str.to_i
      now = Time.now.to_i
      # expired
      return false if expire_time < now
      # too future
      return false if now + 60 * 5 < expire_time
      channel_name = [channel_name_hex].pack('h*').force_encoding('utf-8')
      return false if self.name != channel_name
      master_key = @@master_keys[self.name]
      hash == Digest::SHA256.hexdigest("#{expire_time}.#{salt}.#{channel_name_hex}.#{master_key}")
    end

  end

end
