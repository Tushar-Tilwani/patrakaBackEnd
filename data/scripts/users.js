conn = new Mongo();
db = conn.getDB("patrakaDB");

db.dummy_vendors.update(
    {},
    {
        $set: {
            blacklist: ['5853a2983dc77b661dbf364f']
        }
    }
);

var f = db.users.insert({
    "first_name": "Tina",
    "last_name": "Burns",
    "email": "cc@github.io",
    "gender": "Female",
    "ip_address": "6.91.99.82",
    "user_name": "cc",
    "password": "1a1dc91c907325c69271ddf0c944bc72",
    "balance": 436.01,
    "avatar": "https://robohash.org/quiadistinctioeum.jpg?size=200x200&set=set1",
    "phone": "+01-815-129-6360",
    "type": "vendor",
    "vendorId": "5853a44cc0166bd61dd4232d"
});
