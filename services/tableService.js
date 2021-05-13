const _ = require('lodash');
const cardService = require('./cardService');
const Table = require('../models/table');
const moongosee = require('mongoose');

var self = module.exports = {

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
		try{
			//chekc is arleady StartedGame
			const startedGame = await Table.findOne({ $or: [{ playerOne:user },{ playerTwo:user }]});
			if(_.isEmpty(startedGame)){
			// check is freeTable
				const freeTables = await Table.find({playerTwo:null});
				if(_.isEmpty(freeTables)){
					let table = new Table({
						_id: new moongosee.Types.ObjectId(),
						playerOne:user,
						playerOneSocket:socketId,
						round:1,
						playerTurn:user
					});
					await table.save();
					return await Table.findOne({_id:table._id});
				}else{
					await freeTables[0].updateOne({playerTwo:user,playerTwoSockey:socketId});
					return await Table.findOne({_id:freeTables[0]._id});
				}
			}else{
				if(startedGame.playerOne.toString() === user._id.toString()){
					startedGame.playerOneSocket=socketId;
				}else{
					startedGame.playerTwoSocket=socketId;
				}
				await startedGame.updateOne(startedGame);
				return await Table.findOne({_id:startedGame._id});
			}
		}catch(err){
			console.log('addPlayerErr: ',err);
		}
	},

	putCard: async(clientData,user)=>{
		let table = await Table.findOne({ $or: [{ playerOne:user },{ playerTwo:user }]});
		let dbLines = ['lineOne','lineTwo','lineThree','lineFour'];
		if(table.playerTwo.toString() === user._id.toString()){
			dbLines = dbLines.reverse();
		}
		let fieldId = dbLines[--clientData.fieldId];
		const card = clientData.card;
		try {
			if (table[fieldId] && table[fieldId]?.length > 0) {
				table[fieldId].push(card);
				table[fieldId] = _.sortBy(table[fieldId], ['x']);
				table[fieldId] = await self.updatePostionOnLine(table[fieldId],clientData.field,card.deckId);
				table = await Table.findOneAndUpdate({_id:table._id},table);
			}
			else {
				table[fieldId] = [card];
				table[fieldId] = await self.updatePostionOnLine(table[fieldId],clientData.field,card.deckId);
				table = await Table.findOneAndUpdate({_id:table._id},table);
			}
		} catch (err) {
			console.log(err);
		}
	},

	sortCardOnLine: (line)=> {
		return _.sortBy(line, ['x']);
	},

	updatePostionOnLine: async(line,field, deckId)=> {
		line = await Promise.all(line.map(async(card,idx) => {
			const width = 50;
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
				width: width
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
		const isPlayerOne = startedGame.playerOne.toString() === userId.toString();
		return self.getLinesOnly(startedGame,isPlayerOne);
	},

	getTable: async(user)=>{
		const startedGame = await Table.findOne({ $or: [{ playerOne:user },{ playerTwo:user }]});
		return startedGame;
	},

	removeFromTable: async(user)=>{
		const startedGame = await Table.findOne({ $or: [{ playerOne:user },{ playerTwo:user }]});
		if(startedGame.playerTwo.toString() === user._id.toString()){
			//TODO remove PlayerTwo socket
		}else{
			//TODO remove PlayerOne socket
		}
		return startedGame;
	},

};