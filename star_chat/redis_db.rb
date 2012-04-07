# coding: utf-8

require 'redis'

module StarChat

  module RedisDB

    # TODO: configuration
    @@redis = ::Redis.new(host: '127.0.0.1',
                          port: 6379,
                          thread_safe: true)

    module_function

    def multi
      @@redis.multi do
        yield
      end
    end

    def exec(command, keys = [], *args)
      key = keys.map do |k|
        raise 'invalid key: empty' if k.to_s.empty?
        raise 'invalid key: colon' if k.to_s.include?(':')
        k.to_s
      end.join(':')
      @@redis.send(command, key, *args)
    end

  end

end
