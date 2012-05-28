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
      values = RedisDB.exec(:hmget, key, 'user_name', 'body', 'created_at', 'channel_name')
      Message.new(values[0], values[1],
                  id:           id,
                  created_at:   values[2],
                  channel_name: values[3])
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
                                  'messages:*->channel_name'],
                            limit: limit)
      (values.size / 5).times.map do |i|
        idx = i * 5
        Message.new(values[idx+1],
                    values[idx+2],
                    id:           values[idx],
                    created_at:   values[idx+3],
                    channel_name: values[idx+4])
      end
    end

    def id
      @id
    end

    def id=(id)
      @id = id.to_i
    end
    private(:id=)

    attr_reader :user_name
    attr_reader :channel_name
    attr_reader :body
    attr_reader :created_at

    def initialize(user_name, body, options = {})
      options = {
        created_at:   Time.now.to_i,
        id:           nil,
        channel_name: '',
      }.merge(options)
      @user_name    = user_name
      @body         = body.gsub(/(?!\n|\r|\t)[[:cntrl:]]/, '')
      @created_at   = options[:created_at].to_i
      @id           = (options[:id] ? options[:id].to_i : nil)
      @channel_name = options[:channel_name].to_s
    end

    def to_json(*args)
      {
        id:           id,
        user_name:    user_name,
        body:         body,
        created_at:   created_at,
        channel_name: channel_name,
      }.to_json(*args)
    end

    def save
      raise 'The body should not be empty' if body.empty?
      @id = Message.generate_id unless @id
      RedisDB.exec(:hmset,
                   ['messages', id],
                   'created_at',   created_at,
                   'user_name',    user_name,
                   'body',         body,
                   'channel_name', channel_name)
      self
    end

  end

end
