const environment_prod =  require("../../environments/environment_prod");

var mysql = require('mysql');

// TODO: Configure environments.ts, import environment object, and use that instead
var connection;
if (process.env.NODE_ENV === 'production') {
  connection = mysql.createConnection(environment_prod);
} else {
  connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'CHANGEME',
    database: 'CHANGEME'
  });
}

// sneakily extend our mysql connection object to handle the requests it receives.
// reduces boilerplate like A LOT. Also throw an easy to manage and centralized
// place for logging to occur.
connection.handleRequest = (res,label='UNKNOWN REQUEST') => {
  return function(err, result){
    if (err) {
      console.log(`${label} FAIL`);
      throw err;
    } else {
      console.log(`${label} OK`);
      return res.status(200).send(JSON.stringify(result));
    }
  }
};
connection.connect();
module.exports = connection;
