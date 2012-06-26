module StarChat

  class Message

    def self.generate_id
      RedisDB.exec(:incr, ['messages', 'id_num']).to_i
    end

    # TODO: Cache?
    def self.find(id)
      key = ['messages', id]
      # TODO: lock?
      nil unless RedisDB.exec(:exists, key)
      values = RedisDB.exec(:hmget, key,
                            'user_name',
                            'body',
                            'created_at',
                            'channel_name',
                            'notice',
                            'temporary_nick')
      Message.new(values[0], values[1],
                  id:             id.to_i,
                  created_at:     values[2].to_i,
                  channel_name:   values[3].to_s,
                  notice:         values[4] == 'true',
                  temporary_nick: values[5].to_s)
    end

    def self.find_by_list(redis_key, idx, len)
      # TODO: Cache?
      # TODO: Lock
      return [] if len <= 0
      idx += RedisDB.exec(:llen, redis_key) if idx < 0
      limit = [idx, len]
      values = RedisDB.exec(:sort,
                            redis_key,
                            by: 'nosort', # Is it OK?
                            get: ['#',
                                  'messages:*->user_name',
                                  'messages:*->body',
                                  'messages:*->created_at',
                                  'messages:*->channel_name',
                                  'messages:*->notice',
                                  'messages:*->temporary_nick'],
                            limit: limit)
      (values.size / 7).times.map do |i|
        idx = i * 7
        Message.new(values[idx+1],
                    values[idx+2],
                    id:             values[idx].to_i,
                    created_at:     values[idx+3].to_i,
                    channel_name:   values[idx+4].to_s,
                    notice:         values[idx+5] == 'true',
                    temporary_nick: values[idx+6].to_s)
      end
    end

    def id
      @id
    end

    def id=(id)
      @id = id ? id.to_i : nil
    end
    private(:id=)

    attr_reader :user_name
    attr_reader :channel_name
    attr_reader :created_at

    def body
      @body
    end

    def body=(body)
      @body = body.gsub(/(?![\n\r\t])[\x00-\x1f\x7f]/, '')[0, 1024]
    end
    private(:body=)

    def notice?
      @notice ||= false
    end

    def notice=(notice)
      @notice = !!notice
    end

    def temporary_nick
      @temporary_nick ||= ''
    end

    def temporary_nick=(temporary_nick)
      @temporary_nick = temporary_nick.strip.gsub(/(?![\n\r\t])[\x00-\x1f\x7f]/, '')[0, 32]
    end

    def initialize(user_name, body, options = {})
      options = {
        created_at:     Time.now.to_i,
        id:             nil,
        channel_name:   '',
        notice:         false,
        temporary_nick: '',
      }.merge(options)
      @user_name          = user_name
      self.body           = body
      @created_at         = options[:created_at].to_i
      @id                 = (options[:id] ? options[:id].to_i : nil)
      @channel_name       = options[:channel_name].to_s
      self.notice         = options[:notice]
      self.temporary_nick = options[:temporary_nick]
    end

    def to_json(*args)
      obj = {
        id:             id,
        user_name:      user_name,
        body:           body,
        created_at:     created_at,
        channel_name:   channel_name,
        notice:         notice?,
      }
      if !temporary_nick.empty?
        obj[:temporary_nick] = temporary_nick
      end
      obj.to_json(*args)
    end

    def save
      raise 'The body should not be empty' if body.empty?
      @id = Message.generate_id unless @id
      args = ['created_at',     created_at,
              'user_name',      user_name,
              'body',           body,
              'channel_name',   channel_name,
              'notice',         notice? ? 'true' : 'false']
      if !temporary_nick.empty?
        args << 'temporary_nick' << temporary_nick
      end
      RedisDB.exec(:hmset, ['messages', id], *args)
      self
    end

  end

end
