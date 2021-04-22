const cardService = require('../../services/cardService');
const userService = require('../../services/userService');
const deckService = require('../../services/deckService');
module.exports = function(app,endpoint){

	//GET
	app.get(endpoint,async function(req,res){
		const cards = await cardService.getCards();
		const userCards = await userService.getUserCards(req?.user?.id) || [];
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
	app.post(endpoint,async function(req,res){
		try{
			await deckService.createDeck(req.user,req.body);
			res.redirect('/decks');
		}catch(err){
			console.log('Deck Err',err);
			const decks = await deckService.getDecks(req?.user) || [];
			res.render('decks',{title:'Decks',decks,error:err});
		}
	});
};