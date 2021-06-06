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
const _ = require('lodash');

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

		//config const variablex i.e. roundTime
		this.roundTime = 32000;

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
		//TODO WHEN SECOND PLAYER CONNECTS send a enemy deck_id
		this.io.on('connection', async (socket) => {
			socket.on('disconnect', async()=>{
				const table = await tableService.removeFromTable(socket?.request?.user);
				if(table?.playerOneSocket){
					this.io.to(table?.playerOneSocket).emit('secondPlayerDisconnected');
				}else if(table?.playerTwoSocket){
					this.io.to(table?.playerTwoSocket).emit('secondPlayerDisconnected');
				}
			});

			const table = await tableService.addPlayer(socket?.request?.user,socket.id);

			if(!_.isEmpty(table.playerOneSocket) && !_.isEmpty(table.playerTwoSocket)){	
				this.io.to(table.playerTwoSocket).emit('sendPlayer', {oppnentHandLength:table.playerOneHand?.length, enemyDeckId: await deckService.getCurrentDeckId(table.playerOne)});
				this.io.to(table.playerOneSocket).emit('sendPlayer', {oppnentHandLength:table.playerTwoHand?.length, enemyDeckId: await deckService.getCurrentDeckId(table.playerTwo)});
				
				setTimeout(async ()=>{
					const isUserMoved = await tableService.isUserMoved(table);
					const refreshedTable = await tableService.getTableById(table._id);
					if(table.playerTurn.toString() ==refreshedTable.playerTurn.toString()){
						if(!isUserMoved && table.breakCounter == refreshedTable.breakCounter && table.round == refreshedTable.round){
							const currentSocket = await tableService.getCurrentPlayerSocket(table?._id);
							if(refreshedTable.playerOneSocket==currentSocket && !refreshedTable.playerOnePassed){
								this.io.to(currentSocket).emit('roundSkipped');
							}else if(refreshedTable.playerTwoSocket==currentSocket && !refreshedTable.playerTwoPassed){
								this.io.to(currentSocket).emit('roundSkipped');
							}
						}
					}
				}, this.roundTime);
			}

			socket.on('getTable',async()=>{
				const lines = await tableService.getLines(socket?.request?.user?._id);
				const myHand = await tableService.getHand(socket?.request?.user);
				const isMyround = await tableService.isMyRound(socket?.request?.user) || false;
				const isGameRunning = await tableService.isGameRunning(socket?.request?.user) || false;
				socket.emit('sendTable',{table:lines,myHand:myHand, isMyRound: isMyround && isGameRunning});
			});

			socket.on('endRound',async()=>{
				const table = await tableService.getTable(socket?.request?.user);
				let gameInfo = await tableService.passRound(socket?.request?.user);
				let runTimeOut = false;
				if(gameInfo.sendWinInfo){
					if(gameInfo.isDrawOfRound){
						this.io.to(table.playerOneSocket).emit('gameStatus',{gameStatus:'DRAW'});
						this.io.to(table.playerTwoSocket).emit('gameStatus',{gameStatus:'DRAW'});
					}else if(gameInfo.isPlayerOneWonRound){
						this.io.to(table.playerOneSocket).emit('gameStatus',{gameStatus:'WIN'});
						this.io.to(table.playerTwoSocket).emit('gameStatus',{gameStatus:'LOSE'});
					}else if(gameInfo.isPlayerTwoWonRound){
						this.io.to(table.playerOneSocket).emit('gameStatus',{gameStatus:'LOSE'});
						this.io.to(table.playerTwoSocket).emit('gameStatus',{gameStatus:'WIN'});
					}
				}else if(gameInfo.sendRoundInfo){
					if(gameInfo.isDrawOfRound){
						this.io.to(table.playerOneSocket).emit('roundStatus',{roundStatus:'DRAW'});
						this.io.to(table.playerTwoSocket).emit('roundStatus',{roundStatus:'DRAW'});
					}else if(gameInfo.isPlayerOneWonRound){
						this.io.to(table.playerOneSocket).emit('roundStatus',{roundStatus:'WIN'});
						this.io.to(table.playerTwoSocket).emit('roundStatus',{roundStatus:'LOSE'});
					}else if(gameInfo.isPlayerTwoWonRound){
						this.io.to(table.playerOneSocket).emit('roundStatus',{roundStatus:'LOSE'});
						this.io.to(table.playerTwoSocket).emit('roundStatus',{roundStatus:'WIN'});
					}
				}else{
					runTimeOut=true;
					const isPlayerOne = await tableService.isPlayerOne(socket?.request?.user?._id,table);
					if(isPlayerOne){
						const lines = await tableService.getLines(table.playerTwo);
						const myHand = await tableService.getHand(table.playerTwo);
						const isMyround = await tableService.isMyRound(table.playerTwo) || false;
						const isGameRunning = await tableService.isGameRunning(table.playerTwo) || false;
						this.io.to(table.playerTwoSocket).emit('sendTable',{table:lines,myHand:myHand, isMyRound: isMyround && isGameRunning});
					}else{
						const lines = await tableService.getLines(table.playerOne);
						const myHand = await tableService.getHand(table.playerOne);
						const isMyround = await tableService.isMyRound(table.playerOne) || false;
						const isGameRunning = await tableService.isGameRunning(table.playerOne) || false;
						this.io.to(table.playerOneSocket).emit('sendTable',{table:lines,myHand:myHand, isMyRound: isMyround && isGameRunning});
					}
				}
				if(runTimeOut){
					setTimeout(async ()=>{
						const isUserMoved = await tableService.isUserMoved(table);
						const refreshedTable = await tableService.getTableById(table._id);
						if(!isUserMoved && table.breakCounter == refreshedTable.breakCounter && table.round == refreshedTable.round){
							const currentSocket = await tableService.getCurrentPlayerSocket(table?._id);
							if(refreshedTable.playerOneSocket==currentSocket && !refreshedTable.playerOnePassed){
								this.io.to(currentSocket).emit('roundSkipped');
							}else if(refreshedTable.playerTwoSocket==currentSocket && !refreshedTable.playerTwoPassed){
								this.io.to(currentSocket).emit('roundSkipped');
							}
						}
					}, this.roundTime);
				}
			});
            
			socket.on('put', async(clientData) => {
				try{
					let table = await tableService.getTable(socket?.request?.user);
					if(table.playerTwoSocket && table.playerTwoSocket && (!table.playerTwoPassed || !table.playerOnePassed)){
						await tableService.putCard(clientData,socket?.request?.user);
						const {playerOneHand,playerTwoHand} = await tableService.getTable(socket?.request?.user);
						table.playerOneHand=playerOneHand;
						table.playerTwoHand=playerTwoHand;
						const isPlayerOne = await tableService.isPlayerOne(socket?.request?.user?._id,table);
						const myHand = await tableService.getHand(socket?.request?.user._id);
						const isMyround = await tableService.isMyRound(socket?.request?.user);
						const isOpponentRound = !isMyround;
						if(isPlayerOne){
							const otherPlayerLines = await tableService.getLines(table.playerTwo);
							this.io.to(table.playerTwoSocket).emit('sendTable', {table:otherPlayerLines,myHand:myHand, isMyRound: isOpponentRound});
						}else{
							const myHand = await tableService.getHand(table.playerOne);
							const otherPlayerLines = await tableService.getLines(table.playerOne);
							this.io.to(table.playerOneSocket).emit('sendTable', {table:otherPlayerLines,myHand:myHand, isMyRound: isOpponentRound});
						}
						const lines = await tableService.getLines(socket?.request?.user?._id);
						socket.emit('sendTable',  {table:lines,myHand:myHand, isMyRound:isMyround});
						setTimeout(async ()=>{
							const isUserMoved = await tableService.isUserMoved(table);
							const refreshedTable = await tableService.getTableById(table._id);
							const wasPass = table.playerTwoPassed != refreshedTable.playerTwoPassed || table.playerOnePassed != table.playerOnePassed;
							if(!wasPass){
								if(table.breakCounter == refreshedTable.breakCounter && table.round == refreshedTable.round && !isUserMoved){
									const currentSocket = await tableService.getCurrentPlayerSocket(table?._id);
									if(refreshedTable.playerOneSocket==currentSocket && !refreshedTable.playerOnePassed){
										this.io.to(currentSocket).emit('roundSkipped');
									}else if(refreshedTable.playerTwoSocket==currentSocket && !refreshedTable.playerTwoPassed){
										this.io.to(currentSocket).emit('roundSkipped');
									}
								}
							}
						}, this.roundTime);
					}else{
						socket.emit('error',{message:'No second Player'});
					}
				}catch(err){
					console.error(err);
					socket.emit('error',{message:err});
				}
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
