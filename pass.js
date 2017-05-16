var pass = require('pwd');
var user = {};
pass.hash('my password', function (err, salt, hash) {
    user.salt = salt;
    user.hash = hash;
    console.log(user);
});