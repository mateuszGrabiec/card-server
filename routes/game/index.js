const deckService = require('../../services/deckService');

module.exports = function(app,endpoint){

	//GET
	app.get(endpoint, async function(req, res){
		let error = false;
		if(req?.query?.error){
			error = req?.query?.error;
		}
		const deck = await deckService.getCurrent(req?.user) || false;
		res.render('newGame',{title:'game',deck:deck,error:error});
	});

};