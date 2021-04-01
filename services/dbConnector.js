const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const connetionString = process.env.NODEENV==='PROD' ? 
	'mongodb'+process.env.MONGO_PRE+'://'+process.env.MONGO_USER+':'+process.env.MONGO_PW+'@'+process.env.MONGO_ADDRESS+'/'+process.env.MONGO_DBNAME+process.env.MONGO_PARAMS : 
	'mongodb://'+process.env.MONGO_USER+':'+process.env.MONGO_PW+'@'+process.env.MONGO_ADDRESS+'/'+process.env.MONGO_DBNAME;

module.exports = {
	initConnection: (callback) => {
		console.info('Trying to reach database');
		mongoose.connect(connetionString,{ useNewUrlParser: true, useUnifiedTopology:true, useCreateIndex: true, });
		const db = mongoose.connection;
		db.on('error', function (err) {
			console.error('Failed to connect to database',err);
			process.exit(1);
		});
  
		db.once('open', function () {
			console.info('Connected to database');
			callback();
		});
	}
};