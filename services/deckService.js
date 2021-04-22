const Deck = require('../models/deck');
const moongosee = require('mongoose');

module.exports = {
	createDeck: async (user,deck)=>{
		const decksWitSameName = await Deck.find({user:user,name:deck.name});
		if(decksWitSameName?.length > 0){
			throw 'Deck with this name arleady exist';
		}else{
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
	}
};