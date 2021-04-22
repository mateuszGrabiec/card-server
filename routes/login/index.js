const passport = require('passport');

module.exports = function(app,endpoint){

	//GET
	app.get(endpoint, function(req, res){
		res.render('login',{title:'Login'});
	});

	//POST
	app.post(endpoint,passport.authenticate('local',{
		successRedirect: process.env.NODEENV === 'prod' ? '/game':process.env.DEV_CLIENT,
		failureRedirect: '/login',
		failureFlash:true
	}));
};