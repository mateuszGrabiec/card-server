const deckService = require('../../services/deckService');
module.exports = function(app,endpoint){
	app.get(endpoint,async function(req,res){
		const decks = await deckService.getDecks(req?.user) || [];
		res.render('decks',{title:'Decks',decks});
	});
};