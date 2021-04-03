const express = require('express');
const socketIO = require('socket.io');
const http = require('http');
const passport = require('passport');
const initializePassport = require('./passport-config');
const flash = require('express-flash');
const session = require('express-session');
const cors = require('cors');
const hbs = require('express-handlebars');

const userService = require('./services/userService');
const cardService = require('./services/cardService');
const Table = require('./services/tableService');

class Controller {

	constructor() {
		//passport
		initializePassport(passport, async(emailAddress)=>{
			return await userService.getByMail(emailAddress);
		}, async(id)=>{
			return await userService.getById(id);
		});

		//
		this.app = express();

		this.app.use(express.json());
		this.app.use(express.urlencoded({
			extended: true
		}));

		//serving files
		this.clientPath=`${__dirname}/public`;
		console.log(`Serving static from ${this.clientPath}`);
		this.app.use(express.static(this.clientPath));
		
		//view-engine
		this.app.engine('hbs', hbs({extname: 'hbs', defaultLayout: 'layout', layoutsDir: __dirname + '/views/layouts/'}));
		//TODO get all subfolders and map
		this.app.set('views',`${__dirname}/views`);
		this.app.set('view engine','hbs');

		//passprt configuration
		this.app.use(flash());
		this.sessionMiddleware=session({
			secret: process.env.SESSION_SECRET,
			resave: true,
			saveUninitialized: true,
			cookie: { maxAge: 60000 }
		});
		this.app.use(this.sessionMiddleware);
		this.app.use(passport.initialize());
		this.app.use(passport.session());
		
		//initialize sever
		this.httpServer = http.createServer(this.app);

		//Enalble cors to deveploment
		if(process.env.NODEENV=='DEV'){
			this.app.use(cors());
			this.io = socketIO(this.httpServer,{
				cors: {
					origin: process.env.DEV_CLIENT || '',
					methods: ['GET', 'POST'],
					credentials: true
				}
			});
		}else{
			this.io = socketIO(this.httpServer);
		}


		// Socket.IO passport middleware
		const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
		this.io.use(wrap(this.sessionMiddleware));
		this.io.use(wrap(passport.initialize()));
		this.io.use(wrap(passport.session()));
		this.io.use((socket, next) => {
			if (socket.request.user) {
				next();
			} else {
				socket.disconnect();
				next(new Error('unauthorized'));
			}
		});

		//config routes
		this.handleRoutes();
		this.handleSocketConnection();
		this.table=new Table();
	}

	handleRoutes() {
		require('./routes')(this.app);
		// this.app.get('/login',function(req, res){
		// 	res.render('login.ejs');
		// });
		// this.app.post('/login',passport.authenticate('local',{
		// 	successRedirect: process.env.NODEENV === 'prod' ? '/game':process.env.DEV_CLIENT,
		// 	failureRedirect: '/login',
		// 	failureFlash:true
		// }));
	}

	handleSocketConnection() {
		this.io.on('connection', (socket) => {

			// console.log('connected',socket.id);
			// console.log(!socket?.request?.user);

			socket.emit('hello');

			socket.on('getTable',()=>{
				socket.emit('sendTable',this.table.table);
			});
            
			socket.on('put', (clientData) => {
				this.table.putCard(clientData);
				socket.emit('sendTable',this.table);
			});
		});
	}

	listen(PORT) {
		this.httpServer.listen(PORT,()=>console.log('Server is listening on http://localhost:'+PORT));
	}
}

module.exports = {
	Controller
};
