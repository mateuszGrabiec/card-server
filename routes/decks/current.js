const deckService = require('../../services/deckService');
module.exports = function(app,endpoint){
	app.post(endpoint,async function(req,res){
		await deckService.setCurrent(req?.user,req?.body?.deck);
		const decks = await deckService.getDecks(req?.user) || [];
		res.render('decks',{title:'Decks',decks});
	});

	app.get(endpoint,async function(req,res){
		const deck = await deckService.getCurrent(req?.user) || false;
		res.send(deck);
	});
};