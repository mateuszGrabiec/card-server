const {Controller} = require('./controller.js');
const dotenv = require('dotenv');
const {initConnection} = require('./services/dbConnector');

dotenv.config();

console.info('Mode =',process.env.NODEENV);

const server = new Controller();

const { PORT = 3000 } = process.env;


initConnection(()=> {
	server.listen(PORT);
});