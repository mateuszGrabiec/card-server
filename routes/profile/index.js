
module.exports = function(app,endpoint){
	app.get(endpoint,function(req, res){
		res.render('profile',{title:'profile',name: req?.user?.username});
	});
};