module StarChat

  class Topic

    def self.generate_id
      RedisDB.exec(:incr, ['topics', 'id_num']).to_i
    end

    def self.find(id)
      key = ['topics', id]
      # TODO: lock?
      nil unless RedisDB.exec(:exists, key)
      values = RedisDB.exec(:hmget, key, 'created_at', 'user_name', 'channel_name', 'body')
      Topic.new(values[1], values[2], values[3],
                id:         id,
                created_at: values[0])
    end

    def id
      @id
    end

    def id=(id)
      @id = (id ? id.to_i : nil)
    end
    private(:id=)

    def created_at
      @created_at
    end

    def created_at=(created_at)
      @created_at = created_at.to_i
    end
    private(:created_at=)

    def user_name
      @user_name
    end

    def user_name=(user_name)
      raise 'The user name should not be empty' if user_name.empty?
      @user_name = user_name.to_s
    end
    private(:user_name=)

    def channel_name
      @channel_name
    end

    def channel_name=(channel_name)
      raise 'The channel name should not be empty' if channel_name.empty?
      @channel_name = channel_name.to_s
    end
    private(:channel_name=)

    def body
      @body
    end

    def body=(body)
      body = body.strip.gsub(/(?![\n\r\t])[\x00-\x1f\x7f]/, '')[0, 1024]
      @body = body
    end
    private(:body=)

    def initialize(user_name, channel_name, body, options = {})
      options = {
        id:         nil,
        created_at: Time.now.to_i,
      }.merge(options)
      self.id           = options[:id]
      self.created_at   = options[:created_at]
      self.user_name    = user_name
      self.channel_name = channel_name
      self.body         = body
    end

    def to_h
      {
        id:           id,
        created_at:   created_at,
        user_name:    user_name,
        channel_name: channel_name,
        body:         body,
      }
    end

    def to_json(*args)
      to_h.to_json(*args)
    end

    def save
      self.id = Topic.generate_id unless @id
      RedisDB.exec(:hmset,
                   ['topics', id],
                   'created_at',   created_at,
                   'user_name',    user_name,
                   'channel_name', channel_name,
                   'body',         body)
      self
    end

  end

end
