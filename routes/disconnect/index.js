module.exports = function(app,endpoint){
	app.get(endpoint,async function(req,res){
		res.send({body:{returned:false}});
	});
};