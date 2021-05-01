const moongosee = require('mongoose');

const deckSchema = moongosee.Schema({
	_id: moongosee.Types.ObjectId,
	name: {
		type:String,
		require:true
	},
	cards:[{
		type:moongosee.Schema.Types.ObjectId,
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