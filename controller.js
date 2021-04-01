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
		this.clientPath=`${__dirname}/public`;// deklaracja ścieżki klienta
		console.log(`Serving static from ${this.clientPath}`);
		this.app.use(express.static(this.clientPath));
		this.app.use( bodyParser.json() );
		this.app.use(bodyParser.urlencoded({
			extended: true
		}));
		this.app.set('view-engine','ejs');
		this.app.use(flash());
		this.app.use(session({
			secret: 'XD',//process.env.SESSION_SECRET
			resave: true,
			saveUninitialized: true
		}));
		this.app.use(passport.initialize());
		this.app.use(passport.session());
		this.app.options('*', cors());

		this.httpServer = http.createServer(this.app);
		this.io = socketIO(this.httpServer,{
			cors: {
				origin: 'http://localhost:8080',
				methods: ['GET', 'POST'],
				// allowedHeaders: ['my-custom-header'],
				credentials: true
			}
		});
		this.handleRoutes();
		this.handleSocketConnection();
		this.table=new Table();
	}

	handleRoutes() {
		this.app.get('/',function(req, res){
			res.send('Hello world!!!');
		});
		this.app.get('/profile',function(req, res){
			// res.send('Hello world!!');
			console.log(req.user);
			res.render('profile.ejs',{name: req?.user?.username});
		});

		this.app.post('/register',async(req, res) => {
			// console.log(req.body);
			try{
				const user = {
					username:req.body.username,
					password: req.body.password,
					emailAddress:req.body.emailAddress
				};
				const out = await userService.createUser(user);
				console.log(out);
				res.send(user);
			}catch(err){
				res.status(400);
				res.send({error:err});
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
		this.app.get('/admin/login',function(req, res){
			// res.send('Hello world!!');
			res.render('login.ejs');
		});
		this.app.post('/admin/login',passport.authenticate('local',{
			successRedirect: 'http://localhost:8080/',
			failureRedirect: '/admin/login',
			failureFlash:true
		}));
	}

	handleSocketConnection() {
		this.io.on('connection', (socket) => {

			console.log('A user connected: ' + socket.id);

			this.io.emit('connected');

			socket.on('getTable',()=>{
				this.io.emit('sendTable',this.table.table);
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
