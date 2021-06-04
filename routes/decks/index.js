const deckService = require('../../services/deckService');
module.exports = function(app,endpoint){
	app.get(endpoint,async function(req,res){
		let error = false;
		if(req?.query?.error){
			error = req?.query?.error;
		}
		const decks = await deckService.getDecks(req?.user) || [];
		res.render('decks',{title:'Decks',decks, error});
	});
};