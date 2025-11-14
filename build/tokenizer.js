const operator = /^(?:!|[<>]=?|=|\||&)/;

const operators = {
    "!": "not",
    ">=": "gte",
    "<=": "lte",
    ">": "gt",
    "<": "lt",
    "=": "eq",
    "|": "or",
    "&": "and",
};

/**
 *
 * @param {string} s
 * @returns
 */
export function tokenizeString(s) {
    if (s.length == 0) return [];
    if (s.match(/^\s/)) return tokenizeString(s.trim());

    let m = s.match(operator);
    if (m && operators[m[0]]) {
        return [
            { type: operators[m[0]] },
            ...tokenizeString(s.slice(m[0].length)),
        ];
    }

    m = s.match(/^"([^"]+)"/);
    if (m) {
        return [
            { type: "string", value: m[1] },
            ...tokenizeString(s.slice(m[0].length)),
        ];
    }

    m = s.match(/^[\d\.]+/);
    if (m) {
        return [
            { type: "number", value: Number(m[0]) },
            ...tokenizeString(s.slice(m[0].length)),
        ];
    }
    if (s[0] == "(") {
        let level = 1;
        for (let i = 1; i < s.length; ++i) {
            if (s[i] == "(") level += 1;
            if (s[i] == ")") {
                level -= 1;
                if (level == 0) {
                    return [
                        { type: "group", value: tokenizeString(s.slice(1, i)) },
                        ...tokenizeString(s.slice(i + 1)),
                    ];
                }
            }
        }
    }
    console.error(`Can't parse string "${s}"`);
    return [null];
}

export function evalTokens(tokens) {
    if (!Array.isArray(tokens)) {
        if (["string", "number"].includes(tokens.type)) return tokens.value;
        if (tokens.type == "group") return evalTokens(tokens.value);
        throw new Error(`Unexpected token type: ${tokens}`);
    }
    // negation
    if (
        tokens.length == 2 &&
        tokens[0].type == "not" &&
        tokens[1].type == "group"
    ) {
        return { not: evalTokens(tokens[1].value) };
    }

    // cmp
    if (
        tokens.length == 3 &&
        tokens[0].type == "string" &&
        ["lt", "lte", "eq", "gte", "gt"].includes(tokens[1].type) &&
        tokens[2].type == "number"
    ) {
        return { [tokens[1].type]: [tokens[0].value, tokens[2].value] };
    }

    // or
    if (
        tokens.length >= 3 &&
        tokens.length % 2 == 1 &&
        tokens.filter((e, i) => i % 2 == 1).every((e) => e.type == "or") &&
        tokens
            .filter((e, i) => i % 2 == 0)
            .every((e) => e.type == "group" || e.type == "string")
    ) {
        return { or: tokens.filter((e, i) => i % 2 == 0).map(evalTokens) };
    }

    // and
    if (
        tokens.length >= 3 &&
        tokens.length % 2 == 1 &&
        tokens.filter((e, i) => i % 2 == 1).every((e) => e.type == "and") &&
        tokens
            .filter((e, i) => i % 2 == 0)
            .every((e) => e.type == "group" || e.type == "string")
    ) {
        return { and: tokens.filter((e, i) => i % 2 == 0).map(evalTokens) };
    }

    if (tokens.length == 1) return evalTokens(tokens[0]);

    throw new Error(`Unexpected data`, tokens);
}
