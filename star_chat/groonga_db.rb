# coding: utf-8
require 'groonga'

module StarChat

  module GroongaDB

    module_function

    def load_or_create(path)
      if File.exist?(path)
        raise 'Sorry, resuming is not implemented!'
        # Groonga::Database.create(path: path)
        # return
      end
      # TODO: 毎度作り直すのは明らかに重いと考えられるので、なんとかする。
      # 検索を別サーバー建てにするのを視野に入れる。
      Groonga::Database.create(path: path)
      Groonga::Schema.define do |schema|
        schema.create_table('ChannelNames',
                            type: :hash,
                            key_type: 'ShortText') do |table|
        end
        schema.create_table('Messages',
                            type: :hash,
                            key_type: 'UInt64') do |table|
          table.reference('channel_name', 'ChannelNames')
          table.text('body')
        end
        schema.create_table('Terms',
                            type: :patricia_trie,
                            default_tokenizer: 'TokenBigram',
                            key_normalize: true) do |table|
          table.index('Messages.body', with_position: true)
        end
        schema.change_table('ChannelNames') do |table|
          table.index('Messages.channel_name', with_position: true)
        end
      end
      Channel.all.each do |channel|
        channel.messages.each do |message|
          add_message(channel.name, message)
        end
      end
    end

    def add_message(channel_name, message)
      entries = Groonga['Messages']
      raise 'Invalid state' unless entries
      entries.add(message.id,
                  channel_name: channel_name,
                  body:         message.body)
    end

    # TODO: Sort
    # TODO: Pagenate
    def search_messages(channels, keyword)
      return [] if channels.empty?
      return [] if keyword.empty?
      entries = Groonga['Messages']
      raise 'Invalid state' unless entries
      entries.select do |record|
        include_keyword = (record.body =~ keyword)
        in_channel = channels.map do |channel|
          record.channel_name == channel.name
        end.inject do |result, query|
          result | query
        end
        include_keyword & in_channel
      end.map do |record|
        # TODO: Scoring?
        Message.find(record._key)
      end
    end

  end

end
