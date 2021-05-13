
module.exports = function(app,endpoint){
	app.get(endpoint,function(req, res){
		res.render('profile',{title:'Profile',name: req?.user?.username});
	});
};