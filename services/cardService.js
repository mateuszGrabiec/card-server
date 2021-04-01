const Card = require('../models/card');
const moongosee = require('mongoose');

module.exports = {
	createCard: async (card)=>{
		// console.log(user);
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
	}
};