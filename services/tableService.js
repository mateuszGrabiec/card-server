const _ = require('lodash');
module.exports = class Table {
	constructor() {
		this.table = Array(4).fill([]);
	}

	putCard(clientData) {
		let fieldId = clientData.fieldId;
		const card = clientData.card;
		console.log(card);
		//-- becouse index on front must be >=1
		--fieldId;
		try {
			if (this.table[fieldId].length > 0) {
				this.table[fieldId]=this.removeDuplicate(fieldId,card.id);
				this.table[fieldId].push(card);
				this.table[fieldId] = this.sortCardOnLine(this.table[fieldId]);
				this.updatePostionOnLines(clientData.field);
			}
			else {
				this.table[fieldId] = [card];
				this.updatePostionOnLines(clientData.field);
			}
		} catch (err) {
			console.log(err);
		}
	}

	sortCardOnLine(line) {
		return _.sortBy(line, ['x']);
	}

	updatePostionOnLines(field) {
		this.table.map((line) => {
			line.map((card, numOnLine) => {
				const first = field.width / 2 - card.width * line.length / 2;
				card.x = field.x + first + numOnLine * card.width;
				card.y = field.y;
			});
		});
	}

	removeDuplicate(fieldId,cardId){
		return this.table[fieldId].filter(card=>card.id!=cardId);
	}
};