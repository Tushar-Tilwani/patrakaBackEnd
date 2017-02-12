load('/Users/tilwanit/Documents/nodeJs/patrakaServer/data/scripts/moment.js');
load('/Users/tilwanit/Documents/nodeJs/patrakaServer/data/scripts/lodash.js');


var vendorCollection = db.vendors,
    movieCollection = db.movies;

//starts at 4pm

var showsTimes = [57600, 61200, 64800, 68400, 72000, 75600, 79200, 82800];
var prices = [12.25, 15.50, 10.00, 17.00];
var ticketAvilable = [45, 60, 90, 120, 150];
var theaterNumber = [1, 2, 3, 4, 5];

var showCollection = db.shows;


function getRandom(arr, n) {
    var result = new Array(n),
        len = arr.length,
        taken = new Array(len);
    if (n > len)
        throw new RangeError("getRandom: more elements taken than available");
    while (n--) {
        var x = Math.floor(Math.random() * len);
        result[n] = arr[x in taken ? taken[x] : x];
        taken[x] = --len;
    }
    return result.sort();
}


function generateShows(movieId, vendorId) {

    var resData = {
        showsTimes: getRandom(showsTimes, 3),
        price: prices[_.random(prices.length - 1)],
        startDate: moment().format('MM-DD-YYYY'),
        noOfDays: 1,
        movieId: movieId,
        vendorId: vendorId,
        ticketAvailable: ticketAvilable[_.random(ticketAvilable.length - 1)],
        theaterNumber: theaterNumber[_.random(theaterNumber.length - 1)]
    };
    //printjson(obj);

    var bulk = showCollection.initializeUnorderedBulkOp();


    //var shows = [];

    _.times(_.toInteger(resData.noOfDays) + 1, function (i) {
        _.forEach(resData.showsTimes, function (seconds) {
            bulk.insert({
                date: moment(resData.startDate, 'MM-DD-YYYY').add(i, 'd').add(seconds, 's').unix(),
                price: _.toNumber(resData.price),
                movieId: resData.movieId,
                vendorId: resData.vendorId,
                ticketAvailable: resData.ticketAvailable,
                theaterNumber: resData.theaterNumber,
                showTime: seconds
            });

        });
    });

    bulk.execute();
    printjson('executed!');
}

showCollection.drop();

movieCollection.find().limit(5).forEach(function (movie) {
    var movieId = movie._id;
    vendorCollection.find().limit(200).forEach(function (vendor) {
        var vendorId = vendor._id;
        generateShows(movieId, vendorId);
    });
});

/*
 var showsTimes = [];
 var shows = ['584cd68821add78d38680300','584cd68821add78d386802f2','584cd68821add78d386802f0'];


 obj = {
 showsTimes: [],
 price: 12.00,
 startDate: '12-25-1995',
 noOfDays: 150,
 showId:'584cd68821add78d38680300',
 vendorId:<String>,
 ticketAvailable:45
 };

 var objects = [];

 _.times(_.toInteger(resData.noOfDays) + 1, function (i) {
 _.forEach(resData.showsTimes, function (seconds) {
 objects.push({
 date: moment().add(i, 'd').add(seconds, 's').unix(),
 price: _.toNumber(resData.price),
 showId: resData.showId,
 vendorId: resData.vendorId,
 ticketAvailable: resData.ticketAvailable
 });
 });
 });



 var d = moment();
 _.times(2,function() {
 print(d);
 }); */

db.vendors.find().forEach(function (doc) {
    delete doc.shows;
    db.vendors.save(doc);
});
