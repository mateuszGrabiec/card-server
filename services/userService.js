const User = require('../models/user');
const moongosee = require('mongoose');
const bcrypt = require('bcrypt');

module.exports = {
	createUser: async (user)=>{
		// console.log(user);
		if(user?.password?.length < 8){
			throw {message:'Password is to short should be at least 8 characters'};
		}
		const newUser = new User({
			_id: new moongosee.Types.ObjectId(),
			username: user.username,
			password: await bcrypt.hash(user.password,parseInt(process.env.NUM_HASH)),
			emailAddress: user.emailAddress
		});
		const createdUser = newUser.save().then(result=>{
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
	updateCards: async(id,cards)=>{
		const result = await User.findOneAndUpdate({_id:id}, cards);
		return result;
	},
	getUserCards: async(id)=>{
		const result = await User.findOne({_id:id}).populate('cards');
		return result?.cards || [];
	},
	updateScore: async(userId,points)=>{
		let {score} = await User.findOne({_id:userId});
		score = score+points;
		score = score >0 ? score : 0;
		await User.updateOne({_id:userId},{score:score});
	}
};