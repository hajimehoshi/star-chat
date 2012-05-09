require 'bundler/setup'
require 'sinatra'

set :environment, :test

require './main.rb'
require 'test/unit'
require 'rack/test'

class BinarySearchTest < Test::Unit::TestCase

  include StarChat
  include BinarySearch

  def test_search
    arr = %w{1 1 2 4 8 16}
    size = arr.size
    assert_equal(0, search(-1, 0, size) {|i| arr[i].to_i})
    assert_equal(0, search(0, 0, size) {|i| arr[i].to_i})
    assert_equal(0, search(1, 0, size) {|i| arr[i].to_i})
    assert_equal(2, search(2, 0, size) {|i| arr[i].to_i})
    assert_equal(3, search(3, 0, size) {|i| arr[i].to_i})
    assert_equal(3, search(4, 0, size) {|i| arr[i].to_i})
    assert_equal(4, search(5, 0, size) {|i| arr[i].to_i})
    assert_equal(4, search(6, 0, size) {|i| arr[i].to_i})
    assert_equal(4, search(7, 0, size) {|i| arr[i].to_i})
    assert_equal(4, search(8, 0, size) {|i| arr[i].to_i})
    assert_equal(5, search(9, 0, size) {|i| arr[i].to_i})
    assert_equal(5, search(10, 0, size) {|i| arr[i].to_i})
    assert_equal(5, search(11, 0, size) {|i| arr[i].to_i})
    assert_equal(5, search(12, 0, size) {|i| arr[i].to_i})
    assert_equal(5, search(13, 0, size) {|i| arr[i].to_i})
    assert_equal(5, search(14, 0, size) {|i| arr[i].to_i})
    assert_equal(5, search(15, 0, size) {|i| arr[i].to_i})
    assert_equal(5, search(16, 0, size) {|i| arr[i].to_i})
    assert_equal(6, search(17, 0, size) {|i| arr[i].to_i})
    assert_equal(0, search(0, 0, 1) {|i| arr[i].to_i})

    assert_equal(0, search(-1, 0, 1) {|i| arr[i].to_i})
    assert_equal(0, search(0, 0, 1) {|i| arr[i].to_i})
    assert_equal(0, search(1, 0, 1) {|i| arr[i].to_i})
    assert_equal(1, search(2, 0, 1) {|i| arr[i].to_i})
  end

end

class ChannelTest < Test::Unit::TestCase

  include StarChat

  def setup
    StarChat::RedisDB.exec(:flushall)
    user1 = User.new('user1').save
    user2 = User.new('user2').save
    channel1 = Channel.new('channel1').save
    channel1.post_message(user1, 'body1', 1000)
    channel1.post_message(user2, 'body2', 1010)
    channel1.post_message(user1, 'body3', 1011)
    channel1.post_message(user2, 'body4', 1012)
    channel1.post_message(user1, 'body5', 1020)
    channel1.post_message(user2, 'body6', 1021)
    channel1.post_message(user1, 'body7', 1022)
    channel1.post_message(user2, 'body8', 1100)
    channel1.post_message(user1, 'body9', 1101)
    channel2 = Channel.new('channel2').save
    channel2.post_message(user1, 'body1', 1000)
  end

  def teardown
    StarChat::RedisDB.exec(:flushall)
  end

  def test_messages
    channel1 = Channel.find('channel1')
    msgs = channel1.messages(-2, 2)
    assert_equal(2, msgs.size)
    assert_equal('body8', msgs[0].body)
    assert_equal('body9', msgs[1].body)
  end

  def test_messages_by_time_span
    channel1 = Channel.find('channel1')
    begin
      msgs = channel1.messages_by_time_span(100, 2000)
      assert_equal(9, msgs.size)
      assert_equal('body1', msgs[0].body)
      assert_equal('body2', msgs[1].body)
      assert_equal('body3', msgs[2].body)
      assert_equal('body4', msgs[3].body)
      assert_equal('body5', msgs[4].body)
      assert_equal('body6', msgs[5].body)
      assert_equal('body7', msgs[6].body)
      assert_equal('body8', msgs[7].body)
      assert_equal('body9', msgs[8].body)
    end
    begin
      msgs = channel1.messages_by_time_span(1050, 1200)
      assert_equal(2, msgs.size)
      assert_equal('body8', msgs[0].body)
      assert_equal('body9', msgs[1].body)
    end
    begin
      msgs = channel1.messages_by_time_span(1200, 1050)
      assert_equal(0, msgs.size)
    end
    begin
      msgs = channel1.messages_by_time_span(1000, 1020)
      assert_equal(4, msgs.size)
      assert_equal('body1', msgs[0].body)
      assert_equal('body2', msgs[1].body)
      assert_equal('body3', msgs[2].body)
      assert_equal('body4', msgs[3].body)
    end
    begin
      msgs = channel1.messages_by_time_span(1020, 1000)
      assert_equal(0, msgs.size)
    end
    begin
      msgs = channel1.messages_by_time_span(0, 100)
      assert_equal(0, msgs.size)
    end
    begin
      msgs = channel1.messages_by_time_span(2000, 2100)
      assert_equal(0, msgs.size)
    end
    begin
      msgs = channel1.messages_by_time_span(1020, 1020)
      assert_equal(0, msgs.size)
    end
    channel2 = Channel.find('channel2')
    begin
      msgs = channel2.messages_by_time_span(0, 2000)
      assert_equal(1, msgs.size)
    end
  end

end
