const moongosee = require('mongoose');

const tableSchema = moongosee.Schema({
	_id: moongosee.Types.ObjectId,
	playerOne:{
		type:moongosee.Schema.Types.ObjectId,
		ref:'User',
		require:true
	},
	playerOneSocket:{
		type:String
	},
	playerTwo:{
		type:moongosee.Schema.Types.ObjectId,
		ref:'User'
	},
	playerTwoSocket:{
		type:String
	},
	round:{
		type:Number,
		require:true
	},
	playerTurn:{
		type:moongosee.Schema.Types.ObjectId,
		ref:'User',
		require:true
	},
	lineOne:{
		type: Array
	},
	lineTwo:{
		type: Array
	},
	lineThree:{
		type: Array
	},
	lineFour:{
		type: Array
	},
	status:{
		type:String
	}
});

module.exports = moongosee.model('Table',tableSchema);