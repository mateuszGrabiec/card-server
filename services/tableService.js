const _ = require('lodash');
const cardService = require('./cardService');
const Table = require('../models/table');
const moongosee = require('mongoose');
const deckService = require('./deckService');

const numOfHand = 3;

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
			const startedGame = await Table.findOne({ $or: [{ playerOne:user },{ playerTwo:user }]});
			if(_.isEmpty(startedGame)){
			// check is freeTable
				const freeTables = await Table.find({playerTwo:null});
				const playerOneHand = await deckService.drawHand(user,numOfHand);
				if(_.isEmpty(freeTables)){
					let table = new Table({
						_id: new moongosee.Types.ObjectId(),
						playerOne:user,
						playerOneSocket:socketId,
						round:1,
						playerTurn:user,
						playerOneHand:playerOneHand
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
		let table = await Table.findOne({ $or: [{ playerOne:user },{ playerTwo:user }]});
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
				table[fieldId] = await self.updatePostionOnLine(table[fieldId],clientData.field,card.deckId, card.buffed, card.deBuff);
				if(isPlayerOne){
					table.playerTurn=table.playerTwo;
				}else{
					table.playerTurn=table.playerOne;
				}
				// table = await Table.findOneAndUpdate({_id:table._id},table);
				await self.removeCardFromHand(cardId,isPlayerOne,table);
			} catch (err) {
				console.log(err.message);
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
	updatePostionOnLine: async(line,field, deckId, buff, deBuff)=> {
		line = await Promise.all(line.map(async(card,idx) => {
			const width = 150;
			const first = field.width / 2 - width * line.length / 2;
			const cardId = card?.id || card._id;
			const x = field.x + first + idx * width;
			const y = field.y;
			card = await cardService.getCardById(cardId);
			let newCard = {
				_id: card._id, 
				power:card.power,
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
		const startedGame = await Table.findOne({ $or: [{ playerOne:userId },{ playerTwo:userId }]});
		const isPlayerOne = self.isPlayerOne(userId,startedGame);
		return self.getLinesOnly(startedGame,isPlayerOne);
	},

	getTable: async(user)=>{
		const startedGame = await Table.findOne({ $or: [{ playerOne:user },{ playerTwo:user }]}).populate(['playerOneHand','playerTwoHand']);
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
		let startedGame = await Table.findOne({ $or: [{ playerOne:user },{ playerTwo:user }]});
		const isPlayerOne = await self.isPlayerOne(user._id, startedGame);
		if(isPlayerOne){
			startedGame = await Table.findOneAndUpdate({_id:startedGame._id},{playerOneSocket:null},{returnOriginal:false});
		}else{
			startedGame = await Table.findOneAndUpdate({_id:startedGame._id},{playerTwoSocket:null},{returnOriginal:false});
		}
		return startedGame;
	},

	getHand: async(user)=>{
		const startedGame = await Table.findOne({ $or: [{ playerOne:user._id },{ playerTwo:user._id }]}).populate(['playerOneHand','playerTwoHand']);
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
		if(isPlayerOne){
			table.playerOneHand = table.playerOneHand.filter(card=>card._id.toString() !== cardId.toString());
			await Table.findOneAndUpdate({_id:table.id},table);
		}else{
			table.playerTwoHand = table.playerTwoHand.filter(card=>card._id.toString() !== cardId.toString());
			await Table.findOneAndUpdate({_id:table.id},table);
		}
	},

	isUserMoved: async(table)=>{
		const isPlayerOne = await self.isPlayerOne(table.playerTurn,table);
		if(isPlayerOne){
			const oldHand = table.playerOneHand;
			const newHand = await self.getHand(table.playerOne);
			return oldHand?.length > newHand?.length;
		}else{
			const oldHand = table.playerTwoHand;
			const newHand = await self.getHand(table.playerTwo);
			return oldHand?.length > newHand?.length;
		}
	},

	getTableById: async(tableId)=>{
		return Table.findOne({_id:tableId});
	}
};