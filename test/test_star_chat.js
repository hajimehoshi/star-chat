test("isSomeArray", function () {
    strictEqual(starChat.isSameArray([], []), true);
    strictEqual(starChat.isSameArray(["foo", "bar"], ["foo", "bar"]), true);
    strictEqual(starChat.isSameArray(["foo", "bar"], ["foo", "baz"]), false);
    strictEqual(starChat.isSameArray(["foo", "bar"], ["foo", "bar", "baz"]), false);
});
