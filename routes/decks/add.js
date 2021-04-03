module.exports = function(app,endpoint){

	//GET
	app.get(endpoint,function(req,res){
		res.render('addDeck',{title:'Create new deck',cards:[]});
	});

	//POST
	app.post(endpoint,function(req,res){
		//TODO trey catch and send error to front
		console.log(req?.user);
		res.render('addDeck',{title:'Create new deck',cards:[]});
	});
};