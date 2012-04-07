# coding: utf-8

require './star_chat/models'
require 'sinatra'
require 'erubis'

set :server, :thin
set :sessions, false
set :erubis, escape_html: true
set :streams, []

require './config'

helpers do

  def protect!
    halt 401 unless authorized?
  end

  def authorized?
    if !auth.provided? or !auth.basic? or !auth.credentials
      return false
    end
    user_name, password = auth.credentials
    return false unless user_name
    return false unless password
    StarChat::User.auth?(user_name, password)
  end

  def auth
    @auth ||= Rack::Auth::Basic::Request.new(request.env)
  end

  def current_user
    return nil unless authorized?
    user_name = auth.credentials[0]
    StarChat::User.find(user_name) or
      StarChat::User.new(user_name).save
  end

  def broadcast(values)
    json = values.to_json
    settings.streams.each do |user_name, connection|
      next unless yield(user_name)
      # TODO: error handling?
      connection << json << "\n"
    end
  end

end

get '/', provides: :html do
  erubis(:index)
end

before %r{^/users/([^/]+)} do
  protect!
  user_name = params[:captures][0]
  halt 401 if user_name != current_user.name
end

get '/users/:user_name', provides: :json do
  current_user.to_json
end

get '/users/:user_name/channels', provides: :json do
  current_user.channels.to_json
end

get '/users/:user_name/stream', provides: :json do
  user_name = params[:user_name]
  stream(true) do |out|
    current_user.channels.inject([]) do |msgs, channel|
      channel_name = channel.name
      msgs.concat(channel.messages(-100).map do |msg|
                    {
                      type: 'message_created',
                      channel_name: channel_name,
                      message: msg,
                    }
                  end.to_a)
    end.each do |packet|
      out << packet.to_json << "\n"
    end
    settings.streams << [user_name, out]
    out.callback do
      settings.streams.delete(subscribe)
    end
    out.errback do
      settings.streams.delete(subscribe)
    end
  end
end

before %r{^/channels/([^/]+)} do
  protect!
  channel_name = params[:captures][0]
  # TODO: only for members?
  @channel = StarChat::Channel.find(channel_name)
  halt 404 unless @channel
end

get '/channels/:channel_name/users', provides: :json do
  @channel.users.to_json
end

get '/channels/:channel_name/messages/:range', provides: :json do
  case params[:range]
  when 'recent'
    num = -100
  else
    halt 404
  end
  @channel.messages(num).to_json
end

post '/channels/:channel_name/messages', provides: :json do
  req_json = JSON.parse(request.body.read)
  body = req_json['body']
  begin
    message = @channel.post_message(current_user, body)
  rescue Exception => e
    halt 400, {error: e.to_s}.to_json
  end
  broadcast(type: 'message_created',
            channel_name: @channel.name,
            message: message) do |user_name|
    return false unless user = StarChat::User.find(user_name)
    user.channels.any?{|channel| channel.name == @channel.name}
  end
  201
end

post '/subscribings', provides: :json do
  protect!

  req_json = JSON.parse(request.body.read)
  user_name    = req_json['user_name']
  channel_name = req_json['channel_name']

  halt 401 if user_name != current_user.name

  channel = StarChat::Channel.find(channel_name)
  unless channel
    channel = StarChat::Channel.new(channel_name)
    begin
      channel.save
    rescue Exception => e
      halt 400, {error: e.to_s}.to_json
    end
  end
  halt 409 if StarChat::Subscribing.exist?(channel, current_user)
  StarChat::Subscribing.new(channel, current_user).save
  broadcast(type: 'subscribing_created',
            channel_name: channel.name,
            user_name: current_user.name) do |user_name|
    return false unless user = StarChat::User.find(user_name)
    channel.users.include?(user)
  end
  201
end
