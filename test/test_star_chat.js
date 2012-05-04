test('isSomeArray', function () {
    strictEqual(starChat.isSameArray([], []), true);
    strictEqual(starChat.isSameArray(['foo', 'bar'], ['foo', 'bar']), true);
    strictEqual(starChat.isSameArray(['foo', 'bar'], ['foo', 'baz']), false);
    strictEqual(starChat.isSameArray(['foo', 'bar'], ['foo', 'bar', 'baz']), false);
});

test('parseQuery', function () {
    var arr = starChat.parseQuery('foo?bar=baz;qux=quxx');
    strictEqual(arr['bar'], 'baz');
    strictEqual(arr['qux'], 'quxx');
});
