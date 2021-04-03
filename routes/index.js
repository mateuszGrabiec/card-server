const fs = require('fs');
const path = require('path');


function throughDirectory(directory,callback) {
	fs.readdirSync(directory).forEach(file => {
		const absolute = path.join(directory, file);
		const isAbsoulte = fs.statSync(absolute).isDirectory();
		callback(absolute,isAbsoulte);
	});
}

module.exports = function(app){
	const addRoute = (filepath,isAbsolute) =>{
		if(isAbsolute){
			throughDirectory(filepath,addRoute);
		}else{
			if (filepath === __dirname+'/index.js' || filepath?.substr(filepath?.lastIndexOf('.') + 1) !== 'js')
				return;
			var name = filepath.split(__dirname+'/')[1];
			const charToCut = name.indexOf('index.js') === -1 ? name?.length-3 :  name.indexOf('index.js');
			const endpoint = '/'+name.slice(0,charToCut);
			require('./' + name)(app,endpoint);
		}
		
	};
	throughDirectory(__dirname,addRoute);
};