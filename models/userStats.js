const moongosee = require('mongoose');

const statsSchema = moongosee.Schema({
	_id: moongosee.Types.ObjectId,
	table:{
		type:moongosee.Schema.Types.ObjectId,
		ref:'Table',
		require:true
	},
	users:[{
		type:moongosee.Schema.Types.ObjectId,
		ref:'User',
		require:true
	}],
	status:{
		type:String,
		enum: ['p1', 'p2','draw']
	}
});

module.exports = moongosee.model('UserStats',statsSchema);