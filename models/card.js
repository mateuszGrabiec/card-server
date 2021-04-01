const moongosee = require('mongoose');

const cardSchema = moongosee.Schema({
	_id: moongosee.Types.ObjectId,
	power:Number,
	name:String,
	describe:String,
	isDraggable:Boolean,
	image:String,
	x:Number,
	y:Number,
	shield:Number,
	onPutTrigger:Boolean,
});

module.exports = moongosee.model('Card',cardSchema);