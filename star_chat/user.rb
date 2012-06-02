require 'digest/sha1'
require 'securerandom'

module StarChat

  # TODO: def id
  class User

    @@password_cache = {}

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
      key = ['users', name]
      # TODO: lock?
      if RedisDB.exec(:exists, key)
        values = RedisDB.exec(:hmget, key, 'nick', 'keywords')
        params = {
          nick: values[0],
        }
        params[:keywords] = [name]
        if values[1]
          begin
            params[:keywords] = JSON.parse(values[1])
          rescue JSON::ParserError
          end
        end
        return new(name, params)
      end
      nil
    end
    
    def self.auth?(name, password)
      return false unless name
      return false if name.empty?
      return false unless password
      user = (StarChat::User.find(name) or
              StarChat::User.new(name))
      user.auth?(password)
    end

    def name
      @name ||= ''
    end

    def name=(name)
      @name = name.strip.gsub(/[[:cntrl:]]/, '')[0, 32]
    end
    private :name=

    def nick
      @nick ||= ''
    end

    def nick=(nick)
      @nick = nick.strip.gsub(/[[:cntrl:]]/, '')[0, 32]
    end

    def keywords
      @keywords ||= [name]
    end

    def keywords=(val)
      @keywords = val.map do |val|
        val.to_s.strip.gsub(/[[:cntrl:]]/, '')
      end.select do |str|
        !str.empty?
      end.to_a.uniq
    end

    def initialize(name, options = {})
      options = {
        nick: name
      }.merge(options)
      self.name     = name
      self.nick     = options[:nick]
      self.keywords = options[:keywords] if options[:keywords]
    end

    def channels
      RedisDB.exec(:smembers,
                   ['users', name, 'channels']).map do |name|
        Channel.find(name)
      end
    end

    def subscribing?(channel)
      channels.any? do |c|
        c.name == channel.name
      end
    end

    def to_h
      {
        name:     name,
        nick:     nick,
        keywords: keywords,
      }
    end

    def to_json(*args)
      to_h.to_json(*args)
    end

    def save
      # TODO: validate
      RedisDB.exec(:hmset,
                   ['users', name],
                   'nick', nick,
                   'keywords', keywords.to_json)
      self
    end

    def auth?(password)
      now = Time.now.to_i
      if cache = @@password_cache[name] and
          cache[:last_auth_with_system] <= now and
          now - cache[:last_auth_with_system] < 60 * 30 # 30 min
        salt = @@password_cache[name][:salt]
        if cache[:digest] == Digest::SHA256.digest(salt + password)
          return true
        end
      end
      if auth_with_system?(password)
        salt = SecureRandom.hex(16)
        digest = Digest::SHA256.digest(salt + password)
        @@password_cache[name] = {
          salt:                  salt,
          digest:                digest,
          last_auth_with_system: Time.now.to_i,
        }
        return true
      end
      @@password_cache.delete(name)
      false
    end

    private

    def auth_with_system?(password)
      self.class.auth_system.call(name, password)
    end

    public

    def search_messages(keyword)
      GroongaDB.search_messages(channels, keyword)
    end

  end

end
