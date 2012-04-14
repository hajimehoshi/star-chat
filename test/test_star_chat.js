test("test", function () {
    strictEqual(starChat.isSameArray([], []), true);
    strictEqual(starChat.isSameArray(["foo", "bar"], ["foo", "bar"]), true);
    notStrictEqual(starChat.isSameArray(["foo", "bar"], ["foo", "baz"]), true);
    notStrictEqual(starChat.isSameArray(["foo", "bar"], ["foo", "bar", "baz"]), true);
});
