# coding: utf-8

require 'redis'

module StarChat

  module RedisDB

    module_function

    def setup(host, port)
      @@redis.quit if defined?(@@redis) and @@redis
      @@redis = ::Redis.new(host: host,
                            port: port,
                            thread_safe: true)
    end

    def multi
      @@redis.multi do
        yield
      end
    end

    def exec(command, keys = [], *args)
      key = keys.map do |k|
        str = k.to_s
        raise 'invalid key: empty' if str.empty?
        raise 'invalid key: controls' if str =~ /[[:cntrl:]]/
        str.gsub('\\'){'\\x5c'}.gsub(':'){'\\x3a'}
      end.join(':')
      if key.empty?
        @@redis.send(command, *args)
      else
        @@redis.send(command, key, *args)
      end
    end

  end

end
