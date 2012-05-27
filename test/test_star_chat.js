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

test('replaceBreakLines', function () {
    {
        var div = $('<div></div>');
        strictEqual(starChat.replaceBreakLines(div), 0);
        strictEqual(div.html(), '');
    }
    {
        var div = $('<div></div>').text("foo\nbar\nbaz");
        strictEqual(starChat.replaceBreakLines(div), 2);
        strictEqual(div.html(), 'foo<br>bar<br>baz');
    }
    {
        var div = $('<div></div>').text("foo\r\nbar baz");
        strictEqual(starChat.replaceBreakLines(div), 1);
        strictEqual(div.html(), 'foo<br>bar baz');
    }
    {
        var div = $('<div></div>').text('foo bar baz');
        strictEqual(starChat.replaceBreakLines(div), 0);
        strictEqual(div.html(), 'foo bar baz');
    }
    {
        var div = $('<div></div>').text("foo\rbar\r\nbaz");
        strictEqual(starChat.replaceBreakLines(div), 2);
        strictEqual(div.html(), 'foo<br>bar<br>baz');
    }
    {
        var div = $('<div></div>').text("foo bar\tbaz");
        strictEqual(starChat.replaceBreakLines(div), 0);
        strictEqual(div.html(), "foo bar\tbaz");
    }
    {
        var div = $("<div>fo\no!<a href=\"/\">fo\no!</a><em>fo\no!</em>fo\no!</div>");
        strictEqual(starChat.replaceBreakLines(div), 4);
        strictEqual(div.html(), "fo<br>o!<a href=\"/\">fo<br>o!</a><em>fo<br>o!</em>fo<br>o!");
    }
    {
        // "\n" in an attribute
        var div = $("<div>fo\no!<a>fo\no!</a>fo\no!</div>");
        div.find('a').attr('href', "\n")
        strictEqual(starChat.replaceBreakLines(div), 3);
        strictEqual(div.html(), "fo<br>o!<a href=\"\n\">fo<br>o!</a>fo<br>o!");
    }
    {
        var div = $('<div></div>').text('&<\n>"');
        strictEqual(starChat.replaceBreakLines(div), 1);
        strictEqual(div.html(), '&amp;&lt;<br>&gt;"');
    }
});

test('replaceURLWithLinks', function () {
    {
        var div = $('<div></div>');
        strictEqual(starChat.replaceURLWithLinks(div), 0);
        strictEqual(div.html(), '');
    }
    {
        var div = $('<div></div>').text('foo http://example.com/ baz');
        strictEqual(starChat.replaceURLWithLinks(div), 1);
        strictEqual(div.html(), 'foo <a href="http://example.com/">http://example.com/</a> baz');
    }
});
