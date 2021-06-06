const tableService = require('../../services/tableService');

module.exports = function(app,endpoint){
	app.get(endpoint,async function(req,res){
		const table = await tableService.getTable(req?.user);
		const areBothPlayers = (table.playerOneSocket && table.playerTwoSocket) ? true : false;
		res.send({body:{returned:areBothPlayers}});
	});
};