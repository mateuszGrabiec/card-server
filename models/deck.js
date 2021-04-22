const moongosee = require('mongoose');

const deckSchema = moongosee.Schema({
	_id: moongosee.Types.ObjectId,
	name: {
		type:String,
		require:true
	},
	cards:[{
		type:moongosee.Schema.Types.ObjectId,
		// TODO VALIDATE LENGTH
		// validate: {
		// 	validator: function(v) {
		// 		console.log('value',v);
		// 		return true;
		// 		// return v?.length > 3 && v?.length < 31;
		// 	},
		// 	message: props => `${props.value.length} this nums of card is `
		// },
		ref:'Card',
		require:true
	}],
	user:{
		type:moongosee.Schema.Types.ObjectId,
		ref:'User',
		require:true
	},
	isCurrent:{
		type:Boolean
	}
});

module.exports = moongosee.model('Deck',deckSchema);