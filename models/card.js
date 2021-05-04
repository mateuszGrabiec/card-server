const moongosee = require('mongoose');

const cardSchema = moongosee.Schema({
	_id: moongosee.Types.ObjectId,
	power:Number,
	name:String,
	describe:String,
	isDraggable:Boolean,
	image:String,
	shield:Number,
	onPutTrigger:Boolean,
	isFree:Boolean
});

module.exports = moongosee.model('Card',cardSchema);