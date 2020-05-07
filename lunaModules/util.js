var crypto;

module.exports = function (_crypto) {
    crypto = _crypto;

    return {
        createCharString: createCharString,
        sha256: sha256
    };
};

function createCharString(targetLength) {
    var toReturn = "";
    var dictionary = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < targetLength; i++)
        toReturn += dictionary.charAt(Math.floor(Math.random() * dictionary.length));
    return toReturn;
}

function sha256(string) {
    return crypto.createHmac("sha256", string).digest("hex");
}