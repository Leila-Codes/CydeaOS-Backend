var mysql = require("mysql2");
var con;

module.exports = {
    createConnection: createConnection,
    query: query,
    getLastInsertID: getLastInsertID
};

let lastInsertID = 0;

function createConnection(sql) {
    con = mysql.createConnection(sql);
    
    // this is to keep the connection alive, just a statement executed every 10 minutes
    setInterval(function(){
        query("SELECT UserID FROM Accounts LIMIT 1", [], function(){});
    }, 60000);
}

function query(string, params, callback = null) {
    con.execute(string, params, function (err, results, fields) {
        if(callback != null)
            callback(results);
		else
			return results;
    });
}

/*function query(string, params) {
	con.query(string, params, function(err, res) {
		if (err) throw err;
		console.log(res);
	});
}*/

function getLastInsertID(){
    return lastInsertID;
}