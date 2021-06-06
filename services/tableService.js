const _ = require('lodash');
const cardService = require('./cardService');
const Table = require('../models/table');
const UserStats = require('../models/userStats');
const moongosee = require('mongoose');
const deckService = require('./deckService');
const userService = require('./userService');

const numOfHand = 10;

let self = module.exports = {

	getLinesOnly:(table,isPlayerOne)=>{
		let lines = [];
		if(isPlayerOne){
			lines=[
				table.lineOne,
				table.lineTwo,
				table.lineThree,
				table.lineFour
			];
		}else{
			lines=[
				table.lineFour,
				table.lineThree,
				table.lineTwo,
				table.lineOne
			];
		}
		return lines;
	},

	addPlayer : async(user,socketId)=>{
		let tableToReturn;
		try{
			//chekc is arleady StartedGame
			const startedGame = await Table.findOne({ $or: [{ playerOne:user },{ playerTwo:user }],status:'ongoing'});
			if(_.isEmpty(startedGame)){
			// check is freeTable
				const freeTables = await Table.find({playerTwo:null,status:'ongoing'});
				const playerOneHand = await deckService.drawHand(user,numOfHand);
				if(_.isEmpty(freeTables)){
					let table = new Table({
						_id: new moongosee.Types.ObjectId(),
						playerOne:user,
						playerOneSocket:socketId,
						round:1,
						playerTurn:user,
						playerOneHand:playerOneHand,
						status:'ongoing'
					});
					table = await table.save();
					tableToReturn = table;
				}else{
					const playerTwoHand = await deckService.drawHand(user,numOfHand);
					await freeTables[0].updateOne({playerTwo:user,playerTwoSocket:socketId,playerTwoHand:playerTwoHand}).populate(['playerOneHand','playerTwoHand']);
					tableToReturn = await Table.findOne({_id:freeTables[0]._id});
				}
			}else{
				if(startedGame.playerOne.toString() === user._id.toString()){
					startedGame.playerOneSocket=socketId;
				}else{
					startedGame.playerTwoSocket=socketId;
				}
				let table = await Table.findOneAndUpdate({_id:startedGame._id},startedGame,{returnOriginal:false}).populate(['playerOneHand','playerTwoHand']);
				tableToReturn = table;
			}
			if(tableToReturn?.playerTurn?.username){
				tableToReturn.playerTurn =  tableToReturn?.playerTurn?._id;
			}
			return tableToReturn;
		}catch(err){
			console.log('addPlayerErr: ',err);
		}
	},

	putCard: async(clientData,user)=>{
		let table = await Table.findOne({ $or: [{ playerOne:user },{ playerTwo:user }],status:'ongoing'});
		if(table.playerTurn.toString()!==user._id.toString()){
			throw 'Is not your turn';
		}
		let dbLines = ['lineOne','lineTwo','lineThree','lineFour'];
		const isPlayerOne = self.isPlayerOne(user._id,table);
		if(!isPlayerOne){
			dbLines = dbLines.reverse();
		}
		let fieldId = dbLines[--clientData.fieldId];
		const card = clientData.card;
		const cardId = card?.id || card._id;
		const isOnHand = await self.isCardOnHand(user,cardId);
		if(isOnHand){
			try {
				if (table[fieldId] && table[fieldId]?.length > 0) {
					table[fieldId].push(card);
				}
				else {
					table[fieldId] = [card];
				}
				table[fieldId] = _.sortBy(table[fieldId], ['x']);
				table[fieldId] = await self.updatePostionOnLine(table[fieldId],clientData.field,card.deckId,card.buffed,card.deBuff);
				await self.saveLines(table,fieldId);
				await self.removeCardFromHand(cardId,isPlayerOne,table);
				await self.switchRound(table._id);
			} catch (err) {
				console.log('Put Card ERR',err.message);
				throw 'Put Card ERR';
			}
		}else{
			throw 'Card is not on hand';
		}
	},

	sortCardOnLine: (line)=> {
		return _.sortBy(line, ['x']);
	},

	// TODO: i send on put a information about if is buffed, add 10 to power and save it to line and return it to front || if debuffed is true you have to substract shield if equal or greater than 10, if lower substract power instead and save it to line card paramater
	updatePostionOnLine: async(line,field, deckId)=> {

		line = await Promise.all(line.map(async(card,idx) => {
			const width = 150;
			const first = field.width / 2 - width * line.length / 2;
			const cardId = card?.id || card._id;
			const x = field.x + first + idx * width;
			const y = field.y;
			const isBuffed = card.buffed;
			const isDebuffed = card.deBuff;
			let customPower = 0;
			if(isBuffed){
				customPower = 10;
			}else if(isDebuffed){
				customPower = -10;
			}
			card = await cardService.getCardById(cardId);
			let newCard = {
				_id: card._id, 
				power:card.power + customPower,
				name:card.name,
				describe:card.describe,
				isDraggable:card.isDraggable,
				image:card.image,
				x:x,
				y:y,
				shield:card.shield,
				onPutTrigger:card.onPutTrigger,
				isFree:card.isFree,
				deckId: deckId,
				width: width,
				skill: card.skill
			};
			/*card.x=x;
			card.y=y;
			card.deckId = deckId
			card.width = width;
			return card;
			*/
			return newCard;
		})) || [];
		return line;
	},

	getLines: async(userId)=>{
		const startedGame = await Table.findOne({ $or: [{ playerOne:userId },{ playerTwo:userId }],status:'ongoing'});
		const isPlayerOne = self.isPlayerOne(userId,startedGame);
		return self.getLinesOnly(startedGame,isPlayerOne);
	},

	getTable: async(user)=>{
		const startedGame = await Table.findOne({ $or: [{ playerOne:user },{ playerTwo:user }],status:'ongoing'}).populate(['playerOneHand','playerTwoHand']);
		return startedGame;
	},

	isPlayerOne: (userId,table)=>{
		if(_.isEmpty(userId) || _.isEmpty(table)){
			throw 'Invalid data';
		}
		else if(table?.playerTwo && table.playerTwo.toString() == userId.toString()){
			return false;
		}else{
			return true;
		}
	},

	removeFromTable: async(user)=>{
		let startedGame = await Table.findOne({ $or: [{ playerOne:user },{ playerTwo:user }],status:'ongoing'});
		const isPlayerOne = await self.isPlayerOne(user._id, startedGame);
		if(isPlayerOne){
			startedGame = await Table.findOneAndUpdate({_id:startedGame._id},{playerOneSocket:null,breakCounter:startedGame.breakCounter+1},{returnOriginal:false});
		}else{
			startedGame = await Table.findOneAndUpdate({_id:startedGame._id},{playerTwoSocket:null,breakCounter:startedGame.breakCounter+1},{returnOriginal:false});
		}
		return startedGame;
	},

	getHand: async(user)=>{
		const startedGame = await Table.findOne({ $or: [{ playerOne:user._id },{ playerTwo:user._id }],status:'ongoing'}).populate(['playerOneHand','playerTwoHand']);
		const isPlayerOne = self.isPlayerOne(user._id,startedGame);
		if(isPlayerOne){
			return startedGame.playerOneHand;
		}
		return startedGame.playerTwoHand;
	},

	isCardOnHand: async (user,cardId)=>{
		const hand = await self.getHand(user);
		const isOnHand = hand.filter(card=>card._id.toString() == cardId.toString());
		return !_.isEmpty(isOnHand);
	},

	removeCardFromHand: async(cardId,isPlayerOne,table)=>{
		//TODO remove only one from hand
		if(isPlayerOne){
			let playerOneHand = table.playerOneHand.filter(card=>card._id.toString() !== cardId.toString());
			await Table.findOneAndUpdate({_id:table.id},{playerOneHand:playerOneHand});
		}else{
			let playerTwoHand = table.playerTwoHand.filter(card=>card._id.toString() !== cardId.toString());
			await Table.findOneAndUpdate({_id:table.id},{playerTwoHand:playerTwoHand});
		}
	},

	isUserMoved: async(table)=>{
		//TODO check this function
		let actualTable = await self.getTableById(table._id);
		const isPlayerOne = self.isPlayerOne(table.playerTurn,table);
		if(isPlayerOne && !actualTable?.playerOnePassed){
			const oldHand = table.playerOneHand;
			const newHand = await self.getHand(actualTable.playerOne);
			return oldHand?.length > newHand?.length;
		}else if(!actualTable?.playerTwoPassed){
			const oldHand = table.playerTwoHand;
			const newHand = await self.getHand(actualTable.playerTwo);
			return oldHand?.length > newHand?.length;
		}
	},

	getTableById: async(tableId)=>{
		return Table.findOne({_id:tableId});
	},

	passRound: async(user)=>{
		let table = await self.getTable(user);
		const isPlayerOne = self.isPlayerOne(user?._id,table);
		if(isPlayerOne && table.playerTwoPassed){
			await Table.findOneAndUpdate({_id:table._id},{playerOnePassed:true});
		}else if(isPlayerOne && !table.playerTwoPassed){
			await self.switchRound(table._id);
			await Table.findOneAndUpdate({_id:table._id},{playerOnePassed:true});
		}else if(!isPlayerOne && table.playerTwoPassed){
			await Table.findOneAndUpdate({_id:table._id},{playerTwoPassed:true});
		}else if(!isPlayerOne && !table.playerTwoPassed){
			await self.switchRound(table._id);
			await Table.findOneAndUpdate({_id:table._id},{playerTwoPassed:true});
		}
		return self.checkWhoWin(table?._id);
	},

	switchRound: async(tableId)=>{
		let table = await Table.findOne({_id:tableId});
		if(table.playerOne.toString() == table.playerTurn.toString() && !table.playerTwoPassed){
			table.playerTurn = table.playerTwo;
		}else if(!table.playerOnePassed){
			table.playerTurn = table.playerOne;
		}
		await Table.findOneAndUpdate({_id:tableId},{playerTurn:table.playerTurn});
	},

	isMyRound: async(user)=>{
		const table = await self.getTable(user);
		const isPlayerOne = self.isPlayerOne(user._id,table);
		let isMyRound=false;
		if(isPlayerOne){
			isMyRound = table.playerTurn.toString() === user?._id.toString() && !table.playerOnePassed;
		}else{
			isMyRound = table.playerTurn.toString() === user?._id.toString() && !table.playerTwoPassed;
		}
		return isMyRound;
	},

	saveLines: async(table,fieldName)=>{
		let oldTable = await Table.findOne({_id:table._id});
		oldTable[fieldName] = table[fieldName];
		await Table.findOneAndUpdate({_id:table._id},oldTable);
	},

	isGameRunning: async(user)=>{
		const table = await self.getTable(user);
		if(table.playerOneSocket && table.playerTwoSocket){
			return true;
		}else{
			return false;
		}
	},

	getCurrentPlayerSocket: async(tableId)=>{
		const table = await Table.findOne({_id:tableId});
		const isPlayerOne = self.isPlayerOne(table.playerTurn,table);
		if(isPlayerOne){
			return table.playerOneSocket;
		}else{
			return table.playerTwoSocket;
		}
	},

	checkWhoWin: async(tableId)=>{
		//TODO create new service
		let gameInfo = {
			sendRoundInfo:false,
			sendWinInfo: false,
			isDrawOfRound:false,
			isDrawOfGame:false,
			isPlayerOneWonRound:false,
			isPlayerTwoWonRound:false,
			isPlayerOneWonGame:false,
			isPlayerTwoWonGame:false
		};
		let table = await self.getTableById(tableId);
		if(table.status=='ended'){
			console.log('Game arldedy Ended');
		}
		if(table.playerOnePassed && table.playerTwoPassed){

			gameInfo.sendRoundInfo = true;

			let lines = self.getLinesOnly(table,true);
			lines = lines.map((line)=>{
				let poweOfLine = line.map(card=>{
					return card.power+card.shield;
				});
				poweOfLine = _.isEmpty(poweOfLine) ? 0 : poweOfLine.reduce( (a,c)=> a+c);
				return poweOfLine;
			});
			let playerOnePoints = lines[0] + lines[1];
			let playerTwoPoints = lines[2] + lines[3];
			let playerWin=[];
			if(playerOnePoints == playerTwoPoints){
				//0 for draw
				playerWin = 0;
				gameInfo.isDrawOfRound = true;
			}else if(playerOnePoints > playerTwoPoints){
				playerWin = 1;
				gameInfo.isPlayerOneWonRound = true;
			}else{
				playerWin = 2;
				gameInfo.isPlayerTwoWonRound = true;
			}
			if(_.isEmpty(table.roundStates)){
				table.roundStates = [playerWin];
			}else{
				table.roundStates.push(playerWin);
			}
			await self.switchRound(table?._id);
			table = await Table.findOneAndUpdate(
				{_id:table._id},
				{
					roundStates:table.roundStates,
					round:table.round+1,
					playerOnePassed:false,
					playerTwoPassed:false,
					lineOne:[],
					lineTwo:[],
					lineThree:[],
					lineFour:[],

				}
				,{returnOriginal:false});
		}
		const {
			isPlayerOneWonGame,
			isPlayerTwoWonGame,
			isDrawOfGame,
			sendWinInfo
		} = await self.whoWinGame(table);

		gameInfo.isPlayerOneWonGame=isPlayerOneWonGame;
		gameInfo.isPlayerTwoWonGame=isPlayerTwoWonGame;
		gameInfo.isDrawOfGame=isDrawOfGame;
		gameInfo.sendWinInfo=sendWinInfo;
		return gameInfo;
	},
	whoWinGame: async(table)=>{
		let gameInfo = {
			isPlayerOneWonGame:false,
			isPlayerTwoWonGame:false,
			isDrawOfGame:false,
			sendWinInfo:false
		};
		let playerOneRounds = table.roundStates.filter(p => p==1 || p==0);
		playerOneRounds = playerOneRounds?.length;
		let playerTwoRounds = table.roundStates.filter(p => p==2 || p==0);
		playerTwoRounds = playerTwoRounds?.length;
		if(playerOneRounds >=2 || playerTwoRounds>=2){

			gameInfo.sendWinInfo = true;
			let gameStatus = '';
			if(playerOneRounds==playerTwoRounds){
				gameInfo.isDrawOfGame = true;
				gameStatus='draw';
			}else if(playerOneRounds>playerTwoRounds){
				gameInfo.isPlayerOneWonGame = true;
				gameStatus='p1';
			}else{
				gameInfo.isPlayerTwoWonGame = true;
				gameStatus='p2';
			}
			//save to DB
			switch (gameStatus) {
			case 'draw':
				await userService.updateScore(table.playerOne,5);
				await userService.updateScore(table.playerTwo,5);
				break;
			case 'p1':
				await userService.updateScore(table.playerOne,10);
				await userService.updateScore(table.playerTwo,-5);
				break;
			case 'p2':
				await userService.updateScore(table.playerOne,-5);
				await userService.updateScore(table.playerTwo,10);
				break;
			default:
				console.log(`Can't save this status: ${gameStatus}.`);
			}
			await UserStats.create({_id: new moongosee.Types.ObjectId(),table:table._id,users:[table.playerOne,table.playerTwo],status:gameStatus});
			await Table.updateOne({_id:table._id},{status:'ended',result:gameStatus});
		}
		return gameInfo;
	}

};