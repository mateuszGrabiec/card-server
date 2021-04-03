const userService = require('../../services/userService');

module.exports = function(app,endpoint){

	app.get(endpoint,function(req, res){
		//TODO Check is already logged
		res.render('register',{title:'Register'});
	});

	//POST
	app.post(endpoint,async(req, res) => {
		console.log(req?.username);
		try{
			const newUser = {
				username:req.body.username,
				password: req.body.password,
				emailAddress:req.body.emailAddress
			};
			const user = await userService.createUser(newUser);
			req.login(user, function(err) {
				if (err) {
					res.render('register.ejs',{error:err});
				}
				return res.redirect('/profile');
			});
		}catch(err){
			console.log(err);
			let errMessage='Unexpected Error';
			if(err.name === 'MongoError' && err.code === 11000){
				let duplicatedKeys = Object.keys(err.keyValue);
				errMessage = duplicatedKeys?.[0] ? `User with this ${duplicatedKeys[0]} already exist` : errMessage;
			}else{
				errMessage=err.message;
			}
			res.render('register',{title:'Register',error:errMessage});
		}
	});
};