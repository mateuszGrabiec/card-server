const userService = require('../../services/userService');

module.exports = function(app,endpoint){

	//GET
	app.get(endpoint, async function(req, res){
		let scores = await userService.getScores();
		res.render('leaderboard',{title:'Leaderboard',scores:scores});
	});

};