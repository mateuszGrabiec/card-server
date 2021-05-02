const _ = require('lodash');
const cardService = require('./cardService');
module.exports = class Table {
	constructor() {
		this.table = Array(4).fill([]);
	}

	async putCard(clientData) {
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
				await this.updatePostionOnLines(clientData.field);
			}
			else {
				this.table[fieldId] = [card];
				await this.updatePostionOnLines(clientData.field);
			}
		} catch (err) {
			console.log(err);
		}
	}

	sortCardOnLine(line) {
		return _.sortBy(line, ['x']);
	}

	async updatePostionOnLines(field) {
		this.table = await Promise.all(this.table.map(async(line) => {
			line = await Promise.all(line.map(async(card, numOnLine) => {
				const first = field.width / 2 - card.width * line.length / 2;
				card = await cardService.getCardById(card?.id);
				card.x = field.x + first + numOnLine * card.width;
				card.y = field.y;
				return card;
			})) || [];
			return line;
		}));
	}

	removeDuplicate(fieldId,cardId){
		return this.table[fieldId].filter(card=>card.id!=cardId);
	}
};