const Deck = require('../models/deck');
const moongosee = require('mongoose');

module.exports = {
	createDeck: async (deck)=>{
		console.log(deck);
		// const newdeck = new Deck({
		// 	_id: new moongosee.Types.ObjectId(),
		// });
		// newdeck.save().then(result=>{
		// 	console.log(result);
		// });
	},
	getDecks: async(user)=>{
		const decks = await Deck.find({user:user}, function (err, decks) {
			return decks;
		}) || [];
		return decks;
	},
	editDecks: async(deck)=>{
		console.log(deck);
		// TODO IMPL EDIT OF DECKS
	}
};