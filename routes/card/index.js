const cardService = require('../../services/cardService');
module.exports= function(app,ednpoint){
	app.get(ednpoint,async(req, res)=>{
		const cards = await cardService.getCards();
		res.send({body:cards});
	});
};