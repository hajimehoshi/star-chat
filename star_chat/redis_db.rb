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
        str = k.to_s
        raise 'invalid key: empty' if str.empty?
        raise 'invalid key: controls' if str =~ /[[:cntrl:]]/
        str.gsub('\\'){'\\x5c'}.gsub(':'){'\\x3a'}
      end.join(':')
      @@redis.send(command, key, *args)
    end

  end

end
