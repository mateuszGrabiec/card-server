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
const tableService = require('./services/tableService');
const deckService = require('./services/deckService');

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
			cookie: { maxAge: 3600000 }
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
		if(process.env?.NODEENV=='PROD' && req.user && req.url=='/login'){
			res.redirect('/profile');
		}
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
		this.io.on('connection', async (socket) => {

			socket.on('disconnect', async()=>{
				console.log('disconnected');
				const table = await tableService.removeFromTable(socket?.request?.user);
				if(table?.playerOneSocket){
					this.io.to(table.playerTwoSocket).emit('secondPlayerDisconnected');
				}else{
					this.io.to(table.playerOneSocket).emit('secondPlayerDisconnected');
				}
			});

			const table = await tableService.addPlayer(socket?.request?.user,socket.id);

			if(table.playerOneSocket!=null && table.playerTwoSocket!=null){
				const playerOneDeck = await deckService.getCurrent({_id:table.playerOne});
				const playerTwoDeck = await deckService.getCurrent({_id:table.playerTwo});
				this.io.to(table.playerTwoSocket).emit('sendPlayer', {deckLength:playerOneDeck?.cards?.length});
				this.io.to(table.playerOneSocket).emit('sendPlayer', {deckLength:playerTwoDeck?.cards?.length});
			}

			socket.on('getTable',async()=>{
				const lines = await tableService.getLines(socket?.request?.user?._id);
				socket.emit('sendTable',lines);
			});
            
			socket.on('put', async(clientData) => {
				await tableService.putCard(clientData,socket?.request?.user);
				const lines = await tableService.getLines(socket?.request?.user?._id);
				const table = await tableService.getTable(socket?.request?.user);
				if(table.playerOneSocket==socket.id){
					// console.log('P1',socket.id);
					// console.log('P1 DB:',table.playerOneSocket);
					const otherPlayerLines = await tableService.getLines(table.playerTwo);
					this.io.to(table.playerTwoSocket).emit('sendTable', otherPlayerLines);
				}else{
					// console.log('P2',socket.id);
					// console.log('P2 DB:',table.playerTwoSocket);
					const otherPlayerLines = await tableService.getLines(table.playerOne);
					this.io.to(table.playerOneSocket).emit('sendTable', otherPlayerLines);
				}
				socket.emit('sendTable', lines);
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
