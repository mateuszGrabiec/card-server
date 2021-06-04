const Deck = require('../models/deck');
const moongosee = require('mongoose');

let self = module.exports = {
	createDeck: async (user,deck)=>{
		const decksWitSameName = await Deck.find({user:user,name:deck.name});
		if(decksWitSameName?.length > 0){
			throw 'Deck with this name arleady exist';
		}else{
			if(deck.cards?.length < 15){
				throw 'Deck has to small amount of cards';
			}
			const newdeck = new Deck({
				_id: new moongosee.Types.ObjectId(),
				user:user,
				name:deck.name,
				cards:deck.cards
			});
			newdeck.save().then(result=>{
				console.log(result);
			});
		}
	},
	getDecks: async(user)=>{
		const decks = await Deck.find({user:user}).populate('cards') || [];
		return decks;
	},
	editDecks: async(deck)=>{
		console.log(deck);
		// TODO IMPL EDIT OF DECKS
	},
	setCurrent: async(user,deck)=>{
		await Deck.updateMany({user:user},{isCurrent:false});
		const currentDeck = await Deck.findOneAndUpdate({_id:deck,user:user},{isCurrent:true}).populate('cards');
		return currentDeck;
	},
	getCurrent: async(user)=>{
		const currentDeck = await Deck.findOne({user:user,isCurrent:true}).populate('cards');
		return currentDeck;
	},
	drawHand: async(user,numOfCards)=>{
		const deck = await self.getCurrent(user);
		let shuffled = deck?.cards?.sort(function(){return .5 - Math.random();}) || [];
		const selected=shuffled.slice(0,numOfCards) || [];
		return selected;
	}
};