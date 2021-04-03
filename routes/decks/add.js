const cardService = require('../../services/cardService');
const userService = require('../../services/userService');
module.exports = function(app,endpoint){

	//GET
	app.get(endpoint,async function(req,res){
		// console.log(req?.user?.id);
		let userId = '60660719b327566a8d1ee23a';
		const cards = await cardService.getCards();
		const userCards = await userService.getUserCards(userId);
		let availableCards =[];
		cards.map(card=>{
			if(card.isFree){
				availableCards.push(card);
			}else{
				const isOwned = userCards.filter(c=>c.id===card.id).length > 0 ? true : false;
				if(isOwned){
					availableCards.push(card);
				}
			}
		});
		res.render('addDeck',{title:'Create new deck',cards:availableCards});
	});

	//POST
	app.post(endpoint,function(req,res){
		//TODO trey catch and send error to front
		console.log(req?.user);
		console.log(req.body);
		//example data:
		// {
		// 	name: 'card-game',
		// 	cards: [
		// 	  '60266965039b283fe9e18527',
		// 	  '60266965039b283fe9e18528',
		// 	  '60266965039b283fe9e18529'
		// 	]
		//   }
		res.render('addDeck',{title:'Create new deck',cards:[]});
	});
};