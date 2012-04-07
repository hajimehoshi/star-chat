module StarChat

  class Subscribing

    def self.exist?(channel, user)
      RedisDB.exec(:sismember,
                   ['users', user.name, 'channels'],
                   channel.name)
    end

    def initialize(channel, user)
      @channel = channel
      @user = user
    end

    def save
      return if Subscribing.exist?(@channel, @user)
      RedisDB.multi do
        RedisDB.exec(:sadd,
                     ['users', @user.name, 'channels'],
                     @channel.name)
        RedisDB.exec(:sadd,
                     ['channels', @channel.name, 'users'],
                     @user.name)
      end
    end

  end

end
