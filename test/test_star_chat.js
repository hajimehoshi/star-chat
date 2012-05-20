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

test('emphasizeKeyword', function () {
    {
        var div = $('<div></div>');
        strictEqual(starChat.emphasizeKeyword(div, ''), 0);
        strictEqual(div.html(), '');
    }
    {
        var div = $('<div></div>').text('foo bar baz');
        strictEqual(starChat.emphasizeKeyword(div, ''), 0);
        strictEqual(div.html(), 'foo bar baz');
    }
    {
        var div = $('<div></div>').text('foo bar baz');
        strictEqual(starChat.emphasizeKeyword(div, 'foo'), 1);
        strictEqual(div.html(), '<em>foo</em> bar baz');
    }
    {
        var div = $('<div></div>').text('foo bar baz');
        strictEqual(starChat.emphasizeKeyword(div, 'bar'), 1);
        strictEqual(div.html(), 'foo <em>bar</em> baz');
    }
    {
        var div = $('<div></div>').text('foo bar baz');
        strictEqual(starChat.emphasizeKeyword(div, 'ba'), 2);
        strictEqual(div.html(), 'foo <em>ba</em>r <em>ba</em>z');
    }
    {
        var div = $('<div></div>').text('foo bar baz');
        strictEqual(starChat.emphasizeKeyword(div, 'qux'), 0);
        strictEqual(div.html(), 'foo bar baz');
    }
    {
        var div = $('<div>foo!<a href="/">foo!</a><em>foo!</em>foo!</div>');
        strictEqual(starChat.emphasizeKeyword(div, 'foo'), 3);
        strictEqual(div.html(), '<em>foo</em>!<a href="/"><em>foo</em>!</a><em>foo!</em><em>foo</em>!');
    }
    {
        var div = $('<div></div>').text('&<>"');
        strictEqual(starChat.emphasizeKeyword(div, '&'), 1);
        strictEqual(div.html(), '<em>&amp;</em>&lt;&gt;"');
    }
});
