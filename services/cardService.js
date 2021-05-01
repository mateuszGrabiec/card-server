const Card = require('../models/card');
const moongosee = require('mongoose');

module.exports = {
	createCard: async (card)=>{
		const newCard = new Card({
			_id: new moongosee.Types.ObjectId(),
			power:card.power,
			name:card.name,
			describe:card.describe,
			image:card.image,
			x:card.x,
			y:card.y,
			shield:card.shield,
			onPutTrigger:card.onPutTrigger,
			isFree: card.isFree
		});
		newCard.save().then(result=>{
			console.log(result);
		});
	},
	getCards: async()=>{
		const cards = await Card.find({}, function (err, cards) {
			return cards;
		}) || [];
		return cards;
	},
	getFreeCards: async()=>{
		const cards = await Card.find({isFree:true}, function (err, cards) {
			return cards;
		}) || [];
		return cards;
	},
	getCardById: async(id)=>{
		const card = await Card.findOne({_id:id}) || false;
		return card;
	}
};