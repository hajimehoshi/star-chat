module StarChat

  module BinarySearch

    module_function

    def search(target, i, j, &block)
      search_rec(target, i, j, i, j, &block)
    end

    def search_rec(target, i, j, orig_i, orig_j, &block)
      return i if j <= i
      m = (i + j) / 2
      return m if m - 1 < orig_i
      obj1 = yield(m-1)
      obj2 = yield(m)
      raise 'invalid sequence' unless obj1 <= obj2
      if target < obj1 and target < obj2
        search_rec(target, i, m, orig_i, orig_j, &block)
      elsif target == obj1 and target < obj2
        search_rec(target, i, m, orig_i, orig_j, &block)
      elsif target == obj1 and target == obj2
        search_rec(target, i, m, orig_i, orig_j, &block)
      elsif obj1 < target and target < obj2
        return m
      elsif obj1 < target and target == obj2
        return m
      elsif obj1 < target and obj2 < target
        search_rec(target, m + 1, j, orig_i, orig_j, &block)
      else
        p [target, obj1, obj2, m-1, m]
        raise 'invalid sequence'
      end
    end

  end

end
