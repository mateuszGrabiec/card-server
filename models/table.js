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
	playerOneHand:[{
		type:moongosee.Schema.Types.ObjectId,
		ref:'Card'
	}],
	playerTwoHand:[{
		type:moongosee.Schema.Types.ObjectId,
		ref:'Card'
	}],
	playerOnePassed:{
		type:Boolean,
		default: false
	},
	playerTwoPassed:{
		type:Boolean,
		default: false
	},
	roundStates:{
		type: Array
	},
	result:{
		type:String,
		enum: ['p1', 'p2','draw']
	},
	breakCounter:{
		type:Number,
		default:0
	},
	status:{
		type:String,
		enum: ['ongoing','paused','ended']
	}
});

module.exports = moongosee.model('Table',tableSchema);