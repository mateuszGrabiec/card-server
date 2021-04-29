const express = require('express');
const socketIO = require('socket.io');
const http = require('http');
const passport = require('passport');
const initializePassport = require('./passport-config');
const flash = require('express-flash');
const session = require('express-session');
const hbs = require('express-handlebars');
const {allowInsecurePrototypeAccess} = require('@handlebars/allow-prototype-access');
const Handlebars = require('handlebars');

const userService = require('./services/userService');
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

		if(process.env.NODEENV=='DEV'){
			// this.app.use(cors());
			console.log();
			this.app.use(function(req, res, next) {
				res.header('Access-Control-Allow-Credentials', true);
				res.header('Access-Control-Allow-Origin', req.headers.origin);
				res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
				res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
				if ('OPTIONS' == req.method) {
					res.sendStatus(200);
				} else {
					next();
				}
			});
		}

		this.app.use(express.json());
		this.app.use(express.urlencoded({
			extended: true
		}));
		
		//view-engine
		this.app.engine('hbs', hbs({handlebars: allowInsecurePrototypeAccess(Handlebars), extname: 'hbs', defaultLayout: 'layout', layoutsDir: __dirname + '/views/layouts/'}));
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
		this.app.use(this.checkAuthenticated);
		
		//initialize sever
		this.httpServer = http.createServer(this.app);

		//Enalble cors to deveploment
		if(process.env.NODEENV=='DEV'){			
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

		//serving files
		this.clientPath=`${__dirname}/public`;
		console.log(`Serving static from ${this.clientPath}`);
		this.app.use(express.static(this.clientPath));

		this.table=new Table();

		// ADD card to user by id
		//60660719b327566a8d1ee23a
		// cardService.getCards().then(cards=>{
		// 	console.log(cards?.length);
		// 	userService.updateCards('60660719b327566a8d1ee23a',cards)
		// 		.then(result=>{
		// 			console.log(result);
		// 		});
		// });

	}

	handleRoutes() {
		require('./routes')(this.app);
	}

	checkAuthenticated(req,res,next){
		if(req.url=='/login' || req.url=='/' || req.url=='/register' || req.url=='/deck/current'){
			return next();
		}
		if(process.env?.NODEENV=='DEV' && req.url=='/card'){
			return next();
		}
		if(req.isAuthenticated()){
			return next();
		}
		res.redirect('/login');
	}

	handleSocketConnection() {
		this.io.on('connection', (socket) => {

			// console.log('connected',socket.id);
			console.log(socket?.request?.user);

			socket.emit('hello');

			socket.on('getTable',()=>{
				socket.emit('sendTable',this.table.table);
			});
            
			socket.on('', (clientData) => {
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
