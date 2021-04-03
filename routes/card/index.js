const cardService = require('../../services/cardService');
module.exports= function(app,ednpoint){
	app.get(ednpoint,async(req, res)=>{
		// console.log(req.body);
		// for(let i=0;i<5;i++){
		// 	await cardService.createCard({
		// 		power:10,
		// 		name:'Example card '+i,
		// 		describe:'Example description '+i,
		// 		image:'https://i.pinimg.com/236x/8b/d7/41/8bd741103d058d908b71fba467e732d3--game-ui-card-games.jpg',
		// 		x:10,
		// 		y:10,
		// 		shield:10,
		// 		onPutTrigger:false,
		// 	});
		// }
		const cards = await cardService.getCards();
		res.send({body:cards});
	});
};