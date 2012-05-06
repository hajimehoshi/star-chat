require './main.rb'
require 'test/unit'
require 'rack/test'

set :environment, :test

class BinarySearchTest < Test::Unit::TestCase

  include StarChat::BinarySearch

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
  end

end
