const moongosee = require('mongoose');

const userSchema = moongosee.Schema({
	_id: moongosee.Types.ObjectId,
	username: {
		type:String,
		validate: {
			validator: function(v) {
				return v?.length > 3;
			},
			message: props => `${props.value} is to short use at least 4 characters!`
		},
		required: [true, 'Username required'],
		unique: true,
		lowercase: true
	},
	emailAddress: {
		type:String,
		validate: {
			validator: function(v) {
				return new RegExp(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/).test(v);///^[^\s@]+@[^\s@]+$/
			},
			message: props => `${props.value} is not valid mail!`
		},
		required: [true, 'E-mail address required'],
		lowercase: true,
		unique: true
	},
	password: {
		type:String,
		required: [true, 'Password required'],
	},
	cards:[{
		type:moongosee.Schema.Types.ObjectId,
		ref:'Card'
	}],
	score:{
		type:Number,
		default:100,
	}
});

module.exports = moongosee.model('User',userSchema);