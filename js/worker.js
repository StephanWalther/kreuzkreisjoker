/* Web Worker script. */

/* Get either an array of promosing moves or get information
about a certain move. */

importScripts("lineFieldNumbers.js");

onmessage = function(e) {
	const messageType = e.data[0];
	if (messageType == "getPromosingMoves") {
		const board = new Board(new InputData(e.data[1]));
		postMessage([e.data[0], board.getPromisingMoveQualities([8, 4])]);
	} else if (messageType == "playVirtualGame") {
		playVirtualGame(e.data[0], new InputData(e.data[1]), e.data[2]);
	}
}

/*------------------------------------------------------------------------------
virtualGame
------------------------------------------------------------------------------*/

/* The function playVirtualGame() fills the winInfo
(and deepestlayer) of a move. */

function playVirtualGame(messageType, inputData, moveQuality) {
	const virtualGame = new VirtualGame(inputData);
	virtualGame.play(moveQuality);
	postMessage([messageType, moveQuality]);
}

/* An object of this class can "play" a game on a board for a certain
move and thus giving information about this move.
It does so by getting promisingMoves from the board and testing each move.
This is then done recusively until the board is full, one player wins or
a terminate criterion is met.
The lookAheadSchedule determines how many moves (and "joker moves")
are tested in each recusion. */

class VirtualGame {
	constructor(inputData) {
		this.lookAheadSchedule = this.createLookAheadSchedule(); /* Format: [[normal move count, joker move count], ...] */
		this.board = new Board(inputData);
	}

	createLookAheadSchedule() {
		const lookAheadSchedule = [];
		this.addLookAheadPairs(lookAheadSchedule, [5, 3], 5);
		this.addLookAheadPairs(lookAheadSchedule, [1, 3], 43);
		return lookAheadSchedule;
	}

	addLookAheadPairs(lookAheadSchedule, pair, count) {
		for (let i = 0; i < count; i++) {
			lookAheadSchedule.push(pair);
		}
	}

	play(moveQuality) {
		return this.calculateMoveQuality(moveQuality, 0);
	}

	calculateMoveQuality(moveQuality, lookAheadLayer) {
		moveQuality.deepestLayer = lookAheadLayer;

	    if (lookAheadLayer == this.lookAheadSchedule.length) return;

	    this.board.doMove(moveQuality.move);
	    const promisingMoveQualities =
	        this.board.getPromisingMoveQualities(this.lookAheadSchedule[lookAheadLayer]);
		if (promisingMoveQualities.length == 0) {
			this.board.undoMove();
			return;
		}
		if (this.checkWin(moveQuality, promisingMoveQualities[0])) return;

	    let loosingMoveCount = 0;
	    for (const promisingMoveQuality of promisingMoveQualities) {
	        this.calculateMoveQuality(promisingMoveQuality, lookAheadLayer + 1);
			moveQuality.deepestLayer = Math.max(moveQuality.deepestLayer,
				promisingMoveQuality.deepestLayer);
			if (this.checkWin(moveQuality, promisingMoveQuality)) return;
			if (promisingMoveQuality.winInfo == -1) loosingMoveCount++;
	    }

	    if (loosingMoveCount == promisingMoveQualities.length) {
			moveQuality.winInfo = 1;
		}
	    this.board.undoMove();
	}

	checkWin(parentMoveQuality, childMoveQuality, board) {
		if (childMoveQuality.winInfo == 1) {
			parentMoveQuality.winInfo = -1;
			parentMoveQuality.deepestLayer = childMoveQuality.deepestLayer;
			this.board.undoMove();
			return true;
		}
		return false;
	}
}

/*------------------------------------------------------------------------------
board
------------------------------------------------------------------------------*/

/* Represents a game state, which can be changed by doing and undoing moves.
For the current game state, we can get the "best" moves by
getPromisingMoveQualities(). Each possible move has points according to
the LineQualities. */

/* !!!
The function Board.getPromisingMoveQualities()
(together with LineQualities.get())
takes almost all computation time when calculating enemy moves.
Refactoring this method might have a bad impact on performance.
!!! */

class Board {
    constructor(inputData) {
		this.lineFieldNumbers = createLineFieldNumbers();
		this.boardData = inputData.boardData.slice();
        this.nextPlayer = inputData.nextPlayer;
        this.jokerReady = inputData.jokerReady;
        this.backwardMoves = [];
    }

    doMove(move) {
		this.rememberBackwardMove(move);
        this.switchNextPlayer();
        this.handleMove(move);
    }

	rememberBackwardMove(move) {
        this.backwardMoves.push(
			new Move(move.fieldNumber, this.boardData[move.fieldNumber]));
	}

    undoMove() {
        this.switchNextPlayer();
        this.handleMove(this.backwardMoves.pop());
    }

    switchNextPlayer() {
        this.nextPlayer = (this.nextPlayer % 2) + 1;
    }

    handleMove(move) {
        if (move.token == 3) this.jokerReady = false;
        else if (this.boardData[move.fieldNumber] == 3) this.jokerReady = true;
        this.boardData[move.fieldNumber] = move.token;
    }

    getPromisingMoveQualities(count) {
		const fieldValues = this.getFieldValueArray();
		if (this.collectJokerMoves()) {
			var fieldValuesJoker = this.getFieldValueArray();
		}

		for (let i = 0; i < this.lineFieldNumbers.length; i++) {
			const line = [];
			const lineIndices = this.lineFieldNumbers[i];
			for (const lineIndex of lineIndices) {
				line.push(this.boardData[lineIndex]);
			}
			const lineValues = lineQualities.get(line);
			for (const lineValue of lineValues[this.nextPlayer - 1]) {
				const fieldNumber = lineIndices[lineValue[0]];
				const value = lineValue[1];
				if (value < 0) {
					const move = new Move(fieldNumber, this.nextPlayer);
					const qualityMove = new MoveQuality(move, 0, 1);
					return [qualityMove];
				}
				fieldValues[fieldNumber][1] += value;
				if (this.collectJokerMoves()) {
					for (const lineValue of lineValues[2]) {
						const fieldNumber = lineIndices[lineValue[0]];
						const value = lineValue[1];
						fieldValuesJoker[fieldNumber][1] += value;
					}
				}
			}
		}

		this.sortFieldValues(fieldValues);
		if (this.collectJokerMoves()) this.sortFieldValues(fieldValuesJoker);

		const promisingMoveQualities = [];
		this.pushMoveQualities(
			count[0], this.nextPlayer, fieldValues, promisingMoveQualities);
		if (this.collectJokerMoves()) {
			this.pushMoveQualities(
				count[1], 3, fieldValuesJoker, promisingMoveQualities);
		}

		return promisingMoveQualities;
    }

	getFieldValueArray() {
		const fieldValues = Array(49);
		for (let i = 0; i < fieldValues.length; i++) {
			fieldValues[i] = [i, 0]; /* Format: [fieldNumber, fieldValue] */
		}
		return fieldValues;
	}

	sortFieldValues(fieldValues) {
		fieldValues.sort(function(a, b) {
			return b[1] - a[1];
		});
	}

	pushMoveQualities(count, token, fieldValues, promisingMoveQualities) {
		for (let i = 0; i < count; i++) {
			const move = new Move(fieldValues[i][0], token);
			const qualityMove = new MoveQuality(move, fieldValues[i][1], 0);
			if (qualityMove.quality == 0) break;
			promisingMoveQualities.push(qualityMove);
		}
	}

	collectJokerMoves() {
		return this.jokerReady && this.nextPlayer == 2;
	}
}

/*------------------------------------------------------------------------------
data
------------------------------------------------------------------------------*/

class InputData {
	constructor(inputDataArray) {
		this.boardData = inputDataArray[0];
		this.nextPlayer = inputDataArray[1];
		this.jokerReady = inputDataArray[2];
	}
}

class Move {
    constructor(fieldNumber, token) {
        this.fieldNumber = fieldNumber;
        this.token = token;
    }
}

class MoveQuality {
	constructor(move, quality, winInfo) {
		this.move = move;
		this.quality = quality;
		this.winInfo = winInfo;
		this.deepestLayer = 0;
	}
}

/*------------------------------------------------------------------------------
lineQualities
------------------------------------------------------------------------------*/

/* "qualities" have the following format:
It is an array, containing three elements for the tokens 1, 2 and 3.
Each of this array contains arrays with two elements.
The first element is the index of the position of the line
and the second the points a player would get,
for placing the corresponding token at this position. */

/* !!!
The function LineQualities.get()
(together with Board.getPromisingMoveQualities())
takes almost all computation time when calculating enemy moves.
The way to store the qualities as an "array of arrays of arrays of ..."
seems to be superior to a Map.
!!! */

class LineQualities {
	constructor() {
		this.qualities = [];
		this.checkNextLayer(this.qualities);
	}

	checkNextLayer(arr) {
		if (arr.length == 0) {
			for (let i = 0; i < 4; i++) arr.push([]);
		}
	}

	set(line, entry) {
		let arr = this.qualities[line.length - 4];
		for (let j = 0; j < line.length - 1; j++) {
			this.checkNextLayer(arr);
			arr = arr[line[j]];
		}
		arr[line[line.length - 1]] = entry;
	}

	get(line) {
		let arr = this.qualities[line.length - 4];
		for (let j = 0; j < line.length - 1; j++) {
			arr = arr[line[j]];
		}
        return arr[line[line.length - 1]];
	}
}

/* LineQualitiesClassBuilder:
The build process consists of two stages,
first, a line is given a "simple" value for a player (getPlayerLineValue()).
Second, for a given token and line, we set points for a certain position
in the line by taking the difference of the "simple" values before and
after the placement of the token. This is done for the player and the enemy
and the overall "quality" is the player gain
plus the enemy loss (getQualitiesForToken()). */

class LineQualitiesBuilder {
	constructor() {
		this.createSimpleValues();
		this.buildLines();
	}

	createSimpleValues() {
		this.winTokenTwoValueNextPlayer = 1000;
		this.winTokenOneValueNextPlayer = 500;
		this.winTokenTwoValueLastPlayer = 100;
		this.winTokenOneValueLastPlayer = 50;
		this.tokenToWinTokenTwoValueNextPlayer = 10;
		this.tokenToWinTokenOneValueNextPlayer = 5;
		this.tokenToWinTokenTwoValueLastPlayer = 1;
		this.tokenToWinTokenOneValueLastPlayer = 0.5;

		this.lines7 = [];
		this.lines6 = [];
		this.lines5 = [];
		this.lines4 = [];
		this.lines4567 = [this.lines4, this.lines5, this.lines6, this.lines7];

		this.lines7.push([[0, 0, 0, 1, 0, 0, 0], [0.01, 0.1]]);
		this.lines7.push([[1, 0, 0, 0, 1, 0, 0], [0.0099, 0.099]]);
		this.lines7.push([[0, 0, 1, 0, 0, 0, 0], [0.0099, 0.099]]);
		this.lines7.push([[1, 0, 0, 0, 0, 1, 0], [0.0098, 0.098]]);
		this.lines7.push([[0, 1, 0, 0, 0, 1, 0], [0.0098, 0.098]]);
		this.lines7.push([[0, 1, 0, 0, 0, 0, 0], [0.0097, 0.097]]);
		this.lines6.push([[0, 0, 1, 0, 0, 0], [0.0096, 0.096]]);
		this.lines6.push([[1, 0, 0, 0, 1, 0], [0.0095, 0.095]]);
		this.lines6.push([[0, 1, 0, 0, 0, 0], [0.0095, 0.095]]);
		this.lines5.push([[0, 0, 1, 0, 0], [0.0094, 0.094]]);
		this.lines5.push([[0, 1, 0, 0, 0], [0.0093, 0.093]]);

		this.lines7.push([[1, 0, 0, 0, 0, 0, 1], [0.005, 0.05]]);
		this.lines7.push([[1, 0, 0, 0, 0, 0, 0], [0.0049, 0.049]]);
		this.lines6.push([[1, 0, 0, 0, 0, 1], [0.0048, 0.048]]);
		this.lines6.push([[1, 0, 0, 0, 0, 0], [0.0047, 0.047]]);
		this.lines5.push([[1, 0, 0, 0, 0], [0.0046, 0.046]]);
		this.lines5.push([[1, 0, 0, 0, 1], [0.0046, 0.046]]);
		this.lines4.push([[0, 1, 0, 0], [0.0045, 0.045]]);
		this.lines4.push([[1, 0, 0, 0], [0.0044, 0.044]]);

		this.lines7.push([[0, 0, 0, 0, 0, 0, 0], [0, 0]]);
		this.lines6.push([[0, 0, 0, 0, 0, 0], [0, 0]]);
		this.lines5.push([[0, 0, 0, 0, 0], [0, 0]]);
		this.lines4.push([[0, 0, 0, 0], [0, 0]]);
	}

	buildLines() {
		this.lines = [];
		for (let i = 4; i < 8; i++) {
			this.buildLine([], i);
		}
	}

	buildLine(line, remainingLength) {
		if (remainingLength == 0) {
			if (!this.isRedundant(line)) this.lines.push(line);
			return;
		}
		for (let i = 0; i < 4; i++) {
			const lineCopy = line.slice();
			lineCopy.push(i);
			this.buildLine(lineCopy, remainingLength - 1);
		}
	}

	isRedundant(line) {
		let hasJoker = false;
		for (const token of line) {
			if (token == 3) {
				if (hasJoker) return true;
				hasJoker = true;
			}
		}
		return false;
	}

	build() {
		const lineQualities = new LineQualities();
		for (const line of this.lines) {
			lineQualities.set(line, [
				this.getQualitiesForToken(line, 1),
				this.getQualitiesForToken(line, 2),
				this.getQualitiesForToken(line, 3)]);
		}
		return lineQualities;
	}

	getQualitiesForToken(line, token) {
		const tokenToChange = token == 3 ? 1 : 0;
		const player = token == 3 ? 2 : token;
		const enemy = (player % 2) + 1;
		const qualities = [];
		for (let i = 0; i < line.length; i++) {
			if (line[i] == tokenToChange) {
				let playerGain = -this.getPlayerLineValue(line, player, player);
				let enemyLoss = this.getPlayerLineValue(line, enemy, player);
				line[i] = token;
				playerGain += this.getPlayerLineValue(line, player, player);
				enemyLoss -= this.getPlayerLineValue(line, enemy, player);
				line[i] = tokenToChange;
				qualities.push([i, playerGain + enemyLoss]);
			}
		}
		return qualities;
	}

	getPlayerLineValue(line, player, lastPlayer) {
	    const lineLength = line.length;

	    if (lineLength < 4) return 0;

	    /* Split line until it contains only 0 and player tokens. */
	    for (let i = 0; i < lineLength; i++) {
	        if (line[i] != 0 && line[i] != player) {
	            let returnVal = 0;
	            if (i > 0) {
	                const prevLine = line.slice(0, i);
	                returnVal = this.getPlayerLineValue(prevLine, player, lastPlayer);
				}
				if (i + 1 < lineLength) {
	                const postLine = line.slice(i + 1, lineLength);
	                returnVal += this.getPlayerLineValue(postLine, player, lastPlayer);
				}
				return returnVal;
			}
		}

	    if (this.checkLineWin(line)) return -1;

	    const winTokenCount = this.getLineWinTokenCount(line, player);
	    if (winTokenCount == 2) {
	        if (player == lastPlayer) return this.winTokenTwoValueLastPlayer;
	        return this.winTokenTwoValueNextPlayer;
		}
	    if (winTokenCount == 1) {
	        if (player == lastPlayer) return this.winTokenOneValueLastPlayer;
	        return this.winTokenOneValueNextPlayer;
		}

	    const tokenToWinTokenCount = this.getLineTokenToWinTokenCount(line, player);
	    if (tokenToWinTokenCount == 2) {
	        if (player == lastPlayer) return this.tokenToWinTokenTwoValueLastPlayer;
	        return this.tokenToWinTokenTwoValueNextPlayer;
		}
	    if (tokenToWinTokenCount == 1) {
	        if (player == lastPlayer) return this.tokenToWinTokenOneValueLastPlayer;
	        return this.tokenToWinTokenOneValueNextPlayer;
		}

	    const linesWithCorrectLength = this.lines4567[lineLength - 4];
	    let lineValues = this.getLineValues(line, linesWithCorrectLength);
	    if (lineValues) {
	        if (player == lastPlayer) return lineValues[0];
	        return lineValues[1];
		}
	    const reversedLine = line.slice().reverse();
	    lineValues = this.getLineValues(reversedLine, linesWithCorrectLength);
	    if (lineValues) {
	        if (player == lastPlayer) return lineValues[0];
	        return lineValues[1];
		}
	    throw Error("The following line was not found: " + str(line));
	}

	checkLineWin(line) {
	    for (let i = 0; i < line.length - 3; i++) {
	        if (line[i] != 0 && line[i + 1] != 0 && line[i + 2] != 0
				&& line[i + 3] != 0) return true;
		}
	    return false;
	}

	getLineWinTokenCount(line, player) {
	    let winTokenCount = 0
	    for (let i = 0; i < line.length; i++) {
	        if (line[i] == 0) {
	            line[i] = player;
	            if (this.checkLineWin(line)) winTokenCount += 1;
				line[i] = 0;
			}
		}
	    return winTokenCount;
	}

	getLineTokenToWinTokenCount(line, player) {
	    let tokenToWinTokenCount = 0
	    for (let i = 0; i < line.length; i++) {
	        if (line[i] == 0) {
	            line[i] = player;
	            const winTokenCount = this.getLineWinTokenCount(line, player);
	            tokenToWinTokenCount = Math.max(tokenToWinTokenCount, winTokenCount);
				line[i] = 0;
			}
		}
	    return tokenToWinTokenCount;
	}

	getLineValues(line, linesWithCorrectLength) {
	    for (const lineWithValues of linesWithCorrectLength) {
	        if (this.areLinesEqual(line, lineWithValues[0])) {
	            return lineWithValues[1];
			}
		}
	    return null;
	}

	areLinesEqual(lineOne, lineTwo) {
	    if (lineOne.length != lineTwo.length) return false;
	    for (let i = 0; i < lineOne.length; i++) {
	        if (lineOne[i] == 0 && lineTwo[i] != 0) return false;
	        if (lineOne[i] != 0 && lineTwo[i] == 0) return false;
		}
	    return true;
	}
}

/*------------------------------------------------------------------------------
globals
------------------------------------------------------------------------------*/

/* We create here the lineQualities (which takes some time)
so that this already starts to execute when loading the worker.js script
in a web worker.
See also EnemyMoveCalculater.terminateAndPrepareNewWorkers() in main.js. */

const lineQualities = new LineQualitiesBuilder().build();
