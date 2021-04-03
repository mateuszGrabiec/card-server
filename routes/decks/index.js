module.exports = function(app,endpoint){
	app.get(endpoint,function(req,res){
		res.render('decks',{title:'Decks',decks:[]});
	});
};