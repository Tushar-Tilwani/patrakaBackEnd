conn = new Mongo();
db = conn.getDB("patrakaDB");

db.dummy_vendors.update(
    {},
    {
        $set: {
           blacklist:['5853a2983dc77b661dbf364f']
        }
    }
);
