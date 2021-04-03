const moongosee = require('mongoose');

const deckSchema = moongosee.Schema({
	_id: moongosee.Types.ObjectId,
	name: {
		type:String,
		require:true
	},
	cards:[{
		type:moongosee.Schema.Types.ObjectId,
		validate: {
			validator: function(v) {
				return v?.length > 14 && v?.length < 31;
			},
			message: props => `${props.value.length} this nums of card is `
		},
		ref:'Card',
		require:true
	}],
	user:{
		type:moongosee.Schema.Types.ObjectId,
		ref:'User',
		require:true
	}
});

module.exports = moongosee.model('Deck',deckSchema);