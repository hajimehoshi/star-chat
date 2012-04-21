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

    def messages(num)
      Message.find_by_list(['channels', name, 'messages'], num)
    end

    def post_message(user, body)
      message = Message.new(user.name, body).save
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
