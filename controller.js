const express = require('express');
const socketIO = require('socket.io');
const http = require('http');
const Table = require('./services/tableService');
const passport = require('passport');
const initializePassport = require('./passport-config');
const flash = require('express-flash');
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');

const userService = require('./services/userService');
const cardService = require('./services/cardService');

class Controller {

	constructor() {
		initializePassport(passport, async(emailAddress)=>{
			return await userService.getByMail(emailAddress);
		}, async(id)=>{
			return await userService.getById(id);
		});
		this.app = express();
		this.clientPath=`${__dirname}/public`;
		console.log(`Serving static from ${this.clientPath}`);
		this.app.use(express.static(this.clientPath));
		this.app.use( bodyParser.json() );
		this.app.use(bodyParser.urlencoded({
			extended: true
		}));
		this.app.set('view-engine','ejs');
		this.app.use(flash());
		this.sessionMiddleware=session({
			secret: process.env.SESSION_SECRET,
			resave: true,
			saveUninitialized: true
		});
		this.app.use(this.sessionMiddleware);
		this.app.use(passport.initialize());
		this.app.use(passport.session());
		this.app.options('*', cors());

		this.httpServer = http.createServer(this.app);
		this.io = socketIO(this.httpServer,{
			cors: {
				origin: process.env.DEV_CLIENT || '',
				methods: ['GET', 'POST'],
				credentials: true
			}
		});
		// convert a connect middleware to a Socket.IO middleware
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

		this.handleRoutes();
		this.handleSocketConnection();
		this.table=new Table();
	}

	handleRoutes() {
		this.app.get('/',function(req, res){
			res.send('Hello world!!!1231231245');
		});
		this.app.get('/profile',function(req, res){
			res.render('profile.ejs',{name: req?.user?.username});
		});

		this.app.get('/register',function(req, res){
			//TODO Check is already logged
			res.render('register.ejs');
		});

		this.app.post('/register',async(req, res) => {
			try{
				const newUser = {
					username:req.body.username,
					password: req.body.password,
					emailAddress:req.body.emailAddress
				};
				const user = await userService.createUser(newUser);
				req.login(user, function(err) {
					if (err) {
						res.render('register.ejs',{error:err});
					}
					return res.redirect('/profile');
				});
			}catch(err){
				console.log(err);
				let errMessage='Unexpected Error';
				if(err.name === 'MongoError' && err.code === 11000){
					let duplicatedKeys = Object.keys(err.keyValue);
					errMessage = duplicatedKeys?.[0] ? `User with this ${duplicatedKeys[0]} already exist` : errMessage;
				}else{
					errMessage=err.message;
				}
				res.render('register.ejs',{error:errMessage});
			}
		});
		this.app.get('/card',async(req, res)=>{
			// console.log(req.body);
			// for(let i=0;i<5;i++){
			// 	await cardService.createCard({
			// 		power:10,
			// 		name:'Example card '+i,
			// 		describe:'Example description '+i,
			// 		image:'https://i.pinimg.com/236x/8b/d7/41/8bd741103d058d908b71fba467e732d3--game-ui-card-games.jpg',
			// 		x:10,
			// 		y:10,
			// 		shield:10,
			// 		onPutTrigger:false,
			// 	});
			// }
			const cards = await cardService.getCards();
			res.send({body:cards});
		});
		this.app.get('/login',function(req, res){
			res.render('login.ejs');
		});
		this.app.post('/login',passport.authenticate('local',{
			successRedirect: process.env.NODEENV === 'prod' ? '/game':process.env.DEV_CLIENT,
			failureRedirect: '/login',
			failureFlash:true
		}));
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
