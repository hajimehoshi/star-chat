require 'digest/sha1'
require 'securerandom'

module StarChat

  # TODO: def id
  class User

    @@salt = SecureRandom.hex(64).freeze
    @@items_cache = {}

    def self.auth_system(&block)
      if block
        @@auth_system = block
      else
        @@auth_system ||= ->(name, password) do
          false
        end
      end
    end

    def self.find(name)
      item = @@items_cache[name]
      return item if item
      key = ['users', name]
      # TODO: lock?
      if RedisDB.exec(:exists, key)
        values = RedisDB.exec(:hmget, key, 'nick')
        return @@items_cache[name] = new(name,
                                         nick: values[0])
      end
      nil
    end
    
    def self.auth?(name, password)
      return false unless name
      return false unless password
      user = (StarChat::User.find(name) or
              StarChat::User.new(name))
      user.auth?(password)
    end

    attr_reader :name
    attr_reader :nick

    def initialize(name, options = {})
      options = {
        nick: name
      }.merge(options)
      @name = name[0, 32]
      @nick = options[:nick][0, 32]
    end

    def nick=(nick)
      @nick = nick[0, 32]
    end

    def channels
      RedisDB.exec(:smembers,
                   ['users', name, 'channels']).map do |name|
        Channel.find(name)
      end
    end

    def to_json(*args)
      {
        name: name,
        nick: nick,
      }.to_json(*args)
    end

    def save
      # TODO: validate
      RedisDB.exec(:hmset,
                   ['users', name],
                 'name', name,
                 'nick', nick)
      @@items_cache[name] = self
      self
    end

    def auth?(password)
      return false unless password
      # TODO: use salt?
      now = Time.now.to_i
      if @password_digest and
          @last_auth_with_system and
          @last_auth_with_system <= now and
          now - @last_auth_with_system < 60 * 30 # 30 min
        if @password_digest == Digest::SHA1.digest(@@salt + password)
          return true
        end
      elsif auth_with_system?(password)
        @password_digest     = Digest::SHA1.digest(@@salt + password)
        @last_auth_with_system = Time.now.to_i
        return true
      end
      @password_digest       = nil
      @last_auth_with_system = nil        
      false
    end

    private

    def auth_with_system?(password)
      self.class.auth_system.call(name, password)
    end

  end

end
