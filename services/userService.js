const User = require('../models/user');
const moongosee = require('mongoose');
const bcrypt = require('bcrypt');

module.exports = {
	createUser: async (user)=>{
		// console.log(user);
		if(user?.password?.length < 8){
			throw {message:'Password is to short'};
		}
		const newUser = new User({
			_id: new moongosee.Types.ObjectId(),
			username: user.username,
			password: await bcrypt.hash(user.password,10),
			emailAddress: user.emailAddress
		});
		const createdUser = newUser.save().then(result=>{
			// console.log(result);
			return result;
		});
		return createdUser;
	},
	getByMail: async(mail)=>{
		const user = await User.findOne({emailAddress:mail}, function (err, user) {
			return user;
		}) || false;
		return user;
	},
	getById: async(id)=>{
		const user = await User.findOne({_id:id}, function (err, user) {
			return user;
		}) || false;
		return user;
	},
};