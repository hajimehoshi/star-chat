module StarChat

  class Subscribing

    def self.exist?(channel, user)
      RedisDB.exec(:sismember,
                   ['users', user.name, 'channels'],
                   channel.name)
    end

    def self.save(channel, user)
      return if Subscribing.exist?(channel, user)
      RedisDB.multi do
        RedisDB.exec(:sadd,
                     ['users', user.name, 'channels'],
                     channel.name)
        RedisDB.exec(:sadd,
                     ['channels', channel.name, 'users'],
                     user.name)
      end
    end

    def self.destroy(channel, user)
      return unless Subscribing.exist?(channel, user)
      RedisDB.multi do
        RedisDB.exec(:srem,
                     ['users', user.name, 'channels'],
                     channel.name)
        RedisDB.exec(:srem,
                     ['channels', channel.name, 'users'],
                     user.name)
      end
    end

  end

end
