/* Main file to handle the "page flow"
(User interactions with the page, choosing the difficulty...)
and the "game flow"
(playing the game, waiting for the enemy...). */

/*------------------------------------------------------------------------------
Page
------------------------------------------------------------------------------*/

class Page {
	constructor() {
		this.htmlPageControl = new HTMLPageControl();
		if (!window.Worker) {
			this.htmlPageControl.showNoWebWorkerMessage();
			return;
		}
		this.pageData = new PageData();
		this.site = null;

		this.introductionAction = function() { this.switchSite(new WelcomeSite(this)); }.bind(this);
		this.directGameAction = function() { this.switchSite(new DifficultySite(this)); }.bind(this);

		this.htmlPageControl.removeNoJavaScriptMessage();
		this.htmlPageControl.buildNavButtons(this.introductionAction, this.directGameAction);

		this.introductionAction();
	}

	getNextSiteFunction() {
		return function() { this.switchSite(this.site.getNextSite()); }.bind(this);
	}

	switchSite(nextSite) {
		if (this.site) this.site.leave();
		this.site = nextSite;
		this.site.enter();
	}
}

class HTMLPageControl {
	getClearedElementById(id) {
	    const element = document.getElementById(id);
	    element.innerHTML = "";
	    return element;
	}

	showNoWebWorkerMessage() {
		this.getClearedElementById("gameSection").appendChild(
			this.buildGameSectionParagraph(
				`Schade, dein Browser unterstützt keine Web Worker.
				<br />
				<br />
				Um dieses Spiel zu spielen,
				werden Web Worker benötigt.
				Versuche deinen Browser zu aktualisieren
				oder verwende einen anderen Browser.`
			)
		);
	}

	removeNoJavaScriptMessage() {
		this.getClearedElementById("gameSection");
	}

	buildNavButtons(introductionCallback, directGameCallback) {
		const introductionButton = document.createElement("li");
		introductionButton.id = "introductionButton";
		introductionButton.className = "button activeButton";
		introductionButton.textContent = "Einführung";
		introductionButton.addEventListener("click", introductionCallback);

		const directGameButton = document.createElement("li");
		directGameButton.id = "directGameButton";
		directGameButton.className = "button activeButton";
		directGameButton.textContent = "Direkt spielen";
		directGameButton.addEventListener("click", directGameCallback);

		const navButtons = document.getElementById("navButtons");
		navButtons.appendChild(introductionButton);
		navButtons.appendChild(directGameButton);
	}

	buildDescription(description, buttonName, clickCallback) {
		this.getClearedElementById("gameSection")
	        .appendChild(this.buildGameSectionParagraph(description));

	    const gameButtons = this.buildGameButtons();
	    gameButtons.appendChild(this.buildGameButton(buttonName, clickCallback));
	    this.getClearedElementById("auxiliaryGameSection").appendChild(gameButtons);
	}

	buildDifficulty(clickCallbackWrapper) {
		this.getClearedElementById("gameSection")
	        .appendChild(this.buildGameSectionParagraph(
				"Auf welchem Schwierigkeitsgrad möchtest du spielen?"));

	    const gameButtons = this.buildGameButtons();
	    gameButtons.appendChild(
	        this.buildGameButton("Leicht", clickCallbackWrapper(0)));
	    gameButtons.appendChild(
	        this.buildGameButton("Mittel", clickCallbackWrapper(1)));
	    gameButtons.appendChild(
	        this.buildGameButton("Schwer", clickCallbackWrapper(2)));
	    this.getClearedElementById("auxiliaryGameSection").appendChild(gameButtons);
	}

	buildPlayer(clickCallbackWrapper) {
		this.getClearedElementById("gameSection")
	        .appendChild(this.buildGameSectionParagraph(
				"Möchtest du als erster oder zweiter Spieler spielen?"));

	    const gameButtons = this.buildGameButtons();
	    gameButtons.appendChild(
	        this.buildGameButton("Erster", clickCallbackWrapper(1)));
	    gameButtons.appendChild(
	        this.buildGameButton("Zweiter", clickCallbackWrapper(2)));
	    this.getClearedElementById("auxiliaryGameSection")
	        .appendChild(gameButtons);
	}

	buildGameButtons() {
	    const gameButtons = document.createElement("ul");
	    gameButtons.id = "gameButtons";
	    gameButtons.className = "gameSectionContent";
	    return gameButtons;
	}

	buildGameButton(textContent, clickCallback) {
	    const button = document.createElement("li");
	    button.className = "button activeButton";
	    button.addEventListener("click", clickCallback);
	    button.textContent = textContent;
	    return button;
	}

	setButtonActive(buttonName, clickCallback) {
		const button = document.getElementById(buttonName);
		button.classList.add("activeButton");
		button.classList.remove("inactiveButton");
		button.addEventListener("click", clickCallback);
	}

	setButtonInactive(buttonName, clickCallback) {
		const button = document.getElementById(buttonName);
		button.classList.add("inactiveButton");
		button.classList.remove("activeButton");
		button.removeEventListener("click", clickCallback);
	}

	buildGame(fieldClickCallback) {
		this.getClearedElementById("gameSection")
			.appendChild(this.buildBoard(fieldClickCallback));

	    const auxiliaryGameSection = this.getClearedElementById("auxiliaryGameSection");
	    const hintParagraph = this.buildGameSectionParagraph();
	    hintParagraph.id = "hintParagraph";
	    auxiliaryGameSection.appendChild(hintParagraph);
	}

	buildBoard(fieldClickCallback) {
	    const board = document.createElement("table");
	    board.id = "board";
	    board.className = "gameSectionContent";
	    for (let i = 0; i < 7; i++) {
	        const tr = document.createElement("tr");
	        for (var j = 0; j < 7; j++) {
	            var field = document.createElement("td");
	            field.id = "field" + (7*i + j).toString();
	            field.className = "field clickableField";
				field.addEventListener("click", fieldClickCallback);
	            tr.appendChild(field);
	        }
	        board.appendChild(tr);
	    }
	    return board;
	}

	buildGameSectionParagraph(innerHTML) {
	    const p = document.createElement("p");
	    p.classList = "gameSectionContent";
	    p.innerHTML = innerHTML;
	    return p;
	}
}

class PageData {
	constructor() {
		this.difficulty = 1;
		this.player = 1;
		this.enemyMoveCalculater = new EnemyMoveCalculater(); /* Only used in objects of the Game class, but must outlive these objects. */
	}
}

class Site {
	constructor(page) {
		this.page = page;
	}

	enter() {}

	leave() {}

	getNextSite() {
		return null;
	}
}

class DescriptionSite extends Site {
	constructor(page, description, buttonName) {
		super(page);
		this.description = description;
		this.buttonName = buttonName;
	}

	enter() {
		this.page.htmlPageControl.buildDescription(this.description,
			this.buttonName, this.page.getNextSiteFunction());
	}
}

class WelcomeSite extends DescriptionSite {
	constructor(page) {
		super(page,
			  `Willkommen zu Kreuz-Kreis-Joker!
			  <br /><br />
			  Kreuz-Kreis-Joker ist ein Logikspiel und
			  ein Mix aus Tic-Tac-Toe und Vier Gewinnt.
			  <br />
			  Viel Spaß beim knobeln und spielen!`,
			  "Starten");
	}

	enter() {
		super.enter();
		this.page.htmlPageControl.setButtonInactive("introductionButton", this.page.introductionAction);
	}

	leave() {
		this.page.htmlPageControl.setButtonActive("introductionButton", this.page.introductionAction);
	}

	getNextSite() {
		return new BasicDescriptionSite(this.page);
	}
}

class BasicDescriptionSite extends DescriptionSite {
	constructor(page) {
		super(page,
			  `In diesem Spiel belegen du und dein Gegner
			  abwechselnd Felder eines 7x7 Spielfeldes.
			  Wer als erstes vier Spielsteine in einer horizontalen,
			  vertikalen oder diagonalen Linie aneinander gereiht hat,
			  gewinnt.`,
			  "Weiter");
	}

	getNextSite() {
		return new JokerDescriptionSite(this.page);
	}
}

class JokerDescriptionSite extends DescriptionSite {
	constructor(page) {
		super(page,
			  `Es gibt noch eine Besonderheit:
			  <br />
			  Der zweite Spieler kann einmalig,
			  anstelle eines normalen Zuges,
			  einen Joker einsetzen.
			  Er wird auf ein Feld gelegt,
			  welches vom ersten Spieler besetzt ist.
			  Dieses Feld ist für den Rest des Spieles blockiert.`,
			  "Weiter");
	}

	getNextSite() {
		return new DifficultySite(this.page);
	}
}

class DifficultySite extends Site {
	constructor(page) {
		super(page);
	}

	enter() {
		this.page.htmlPageControl.buildDifficulty(this.setDifficultyAndGoToNextSiteFunction.bind(this));
		this.page.htmlPageControl.setButtonInactive("directGameButton", this.page.directGameAction);
	}

	setDifficultyAndGoToNextSiteFunction(difficulty) {
		return function() {
			this.page.pageData.difficulty = difficulty;
			this.page.getNextSiteFunction()();
		}.bind(this);
	}

	leave() {
		this.page.htmlPageControl.setButtonActive("directGameButton", this.page.directGameAction);
	}

	getNextSite() {
		return new PlayerSite(this.page);
	}
}

class PlayerSite extends Site {
	constructor(page) {
		super(page);
	}

	enter() {
		this.page.htmlPageControl.buildPlayer(this.setPlayerAndGoToNextSiteFunction.bind(this));
	}

	setPlayerAndGoToNextSiteFunction(player) {
		return function() {
			this.page.pageData.player = player;
			this.page.getNextSiteFunction()();
		}.bind(this);
	}

	getNextSite() {
		return new GameSite(this.page);
	}
}

class GameSite extends Site {
	constructor(page) {
		super(page);
		this.game = null;
	}

	enter() {
		this.game = new Game(this.page.htmlPageControl, this.page.pageData);
	}

	leave() {
		this.game.terminate();
		this.game = null;
	}
}

/*------------------------------------------------------------------------------
Game
------------------------------------------------------------------------------*/

class Game {
	constructor(htmlPageControl, pageData) {
		this.htmlGameControl = new HTMLGameControl();
		this.gameData = new GameData(pageData.player);
		this.enemyMoveCalculater = pageData.enemyMoveCalculater;
		this.enemyMoveSelector = new EnemyMoveSelector(pageData.difficulty);
		htmlPageControl.buildGame(this.handleFieldClick.bind(this));
		this.init();
	}

	init() {
	    if (this.gameData.getPlayer() == 2) {
			const field = this.htmlGameControl.fieldNumberToField(this.enemyMoveSelector.getFirstPlayerField());
			this.placeEnemyToken(field);
			this.htmlGameControl.showClickAnimation(field, "clickedFieldEnemy");
		}
	    this.htmlGameControl.setHintToYourTurn();
	}

	handleFieldClick(event) {
		if (this.gameData.boardFreezed) return;

		const field = event.target;
		const fieldType = this.htmlGameControl.getFieldType(field);

		if (fieldType == 0) this.htmlGameControl.placeToken(field, this.gameData.getPlayerToken());
		else if (fieldType == 1 && this.gameData.hasPlayerJoker()) {
			this.placeJoker(field);
		} else return; /* No valid click. */

		this.htmlGameControl.freezeBoard();
		this.gameData.boardFreezed = true;

		if (this.checkWin(this.gameData.getPlayer())) return; /* Game end animation is shown. */

		this.htmlGameControl.showClickAnimation(field,
			fieldType == 0 ? "clickedFieldPlayer" : "clickedJokerFieldPlayer");
		this.startEnemyMove();
	}

	startEnemyMove() {
		this.htmlGameControl.setHintToEnemyWait();
		const inputData = [this.htmlGameControl.getBoardData(),
						   this.gameData.getEnemy(),
						   this.gameData.jokerReady];
		this.enemyMoveCalculater.startCalculation(this.handleEnemyMoves.bind(this), inputData);
	}

	handleEnemyMoves(enemyQualityMoves) {
		if (enemyQualityMoves.length == 0) {
			this.htmlGameControl.setHintToDraw();
			return;
		}

		const qualityMove = this.enemyMoveSelector.selectMove(enemyQualityMoves);
		const field = this.htmlGameControl.fieldNumberToField(qualityMove.move.fieldNumber);
		const animationName = this.placeEnemyToken(field);
		if (this.checkWin(this.gameData.getEnemy())) return; /* Game end animation is shown. */
		this.htmlGameControl.showClickAnimation(field, animationName);

		this.htmlGameControl.setHintToYourTurn();
		this.htmlGameControl.unfreezeBoard(this.gameData.hasPlayerJoker());
		this.gameData.boardFreezed = false;
	}

	placeEnemyToken(field) {
	    if (this.htmlGameControl.getFieldType(field) == 1) {
			this.placeJoker(field);
			return "clickedJokerFieldEnemy";
		}
	    this.htmlGameControl.placeToken(field, this.gameData.getEnemyToken());
		return "clickedFieldEnemy";
	}

	placeJoker(field) {
		this.gameData.jokerReady = false;
		this.htmlGameControl.placeJoker(field);
	}

	checkWin(token) {
		const boardData = this.htmlGameControl.getBoardData();
		for (let i = 0; i < this.gameData.lineFieldNumbers.length; i++) {
			if (this.checkForLineFieldNumberWin(boardData, this.gameData.lineFieldNumbers[i], token)) {
				return true;
			}
		}
		return false;
	}

	checkForLineFieldNumberWin(boardData, lineNumbers, tokenNumber) {
		for (let i = 0; i < lineNumbers.length - 3; i++) {
			if (boardData[lineNumbers[i]] == tokenNumber &&
				boardData[lineNumbers[i + 1]] == tokenNumber &&
				boardData[lineNumbers[i + 2]] == tokenNumber &&
				boardData[lineNumbers[i + 3]] == tokenNumber) {
					const playerWins = tokenNumber == this.gameData.getPlayer();
					if (playerWins) this.htmlGameControl.setHintToWin();
					else this.htmlGameControl.setHintToLoss();
					for (let j = 0; j < 4; j++) {
						const field = this.htmlGameControl.fieldNumberToField(lineNumbers[i + j]);
						if (playerWins) this.htmlGameControl.showWinAnimation(field);
						else this.htmlGameControl.showLossAnimation(field);
					}
					return true;
			}
		}
		return false;
	}

	terminate() {
		this.enemyMoveCalculater.terminateAndPrepareNewWorkers();
	}
}

class HTMLGameControl {
	constructor() {
		this.waitForEnemyString = "Warte auf den Gegner";
		this.enemyWaitIntervalID = null;
		this.directGameString = "<br />Wähle \"Direkt spielen\" aus, um ein neues Spiel zu Starten.";
	}

	fieldNumberToField(fieldNumber) {
	    return document.getElementById("field" + fieldNumber);
	}

	freezeBoard() {
	    for (let i = 0; i < 49; i++) {
	        const field = this.fieldNumberToField(i);
	        field.classList.remove("clickableField");
	    }
	}

	unfreezeBoard(hasPlayerJoker) {
	    for (let i = 0; i < 49; i++) {
	        const field = this.fieldNumberToField(i);
			const fieldType = this.getFieldType(field);
	        if (fieldType == 0 ||
				(fieldType == 1 && hasPlayerJoker)) {
				field.classList.add("clickableField");
	        }
	    }
	}

	getBoardData() {
	    const boardData = [];
	    const board = document.getElementById("board");
	    for (let i = 0; i < 7; i++) {
	        const tr = board.children[i];
	        for (let j = 0; j < 7; j++) {
	            const field = tr.children[j];
	            boardData.push(this.getFieldType(field));
	        }
	    }
	    return boardData;
	}

	getFieldType(field) {
	    if (field.textContent == "X") return 1;
	    if (field.textContent == "O") return 2;
	    if (field.classList.contains("jokerField")) return 3;
	    return 0;
	}

	placeToken(field, token) {
		field.textContent = token;
	}

	placeJoker(field) {
		field.classList.add("jokerField");
		field.textContent = "";
	}

	showClickAnimation(field, animation) {
		field.classList.add(animation);
		this.restartAnimation(field); /* If a class with the "click" animation was already set */
	}

	restartAnimation(field) {
		field.style.animation = 'none';
	  	field.offsetHeight; /* Trigger reflow */
	  	field.style.animation = null;
	}

	showWinAnimation(field) {
		field.classList.add("winField");
	}

	showLossAnimation(field) {
		field.classList.add("lossField");
	}

	setHintToYourTurn() {
	    this.writeToHintText("Wähle ein Feld");
	}

	setHintToEnemyWait() {
	    this.writeToHintText(this.waitForEnemyString + "<br />.");
		this.enemyWaitIntervalID = window.setInterval(this.enemyMoveTextUpdater.bind(this), 500);
	}

	enemyMoveTextUpdater() {
		const hintParagraph = document.getElementById("hintParagraph");
		if (!hintParagraph ||
			!hintParagraph.innerHTML.startsWith(this.waitForEnemyString)) {
			window.clearInterval(this.enemyWaitIntervalID);
			return;
		}
		hintParagraph.innerHTML += ".";
		if (hintParagraph.innerHTML.endsWith(".....")) {
			hintParagraph.innerHTML = hintParagraph.innerHTML.slice(0, -4);
		}
	}

	setHintToWin() {
		this.writeToHintText("Glückwunsch, du hast gewonnen!" + this.directGameString);
	}

	setHintToDraw() {
		this.writeToHintText("Unentschieden!" + this.directGameString);
	}

	setHintToLoss() {
		this.writeToHintText("Schade, du hast verloren." + this.directGameString);
	}

	writeToHintText(innerHTML) {
	    document.getElementById("hintParagraph").innerHTML = innerHTML;
	}
}

class GameData {
    constructor(player) {
		this.lineFieldNumbers = createLineFieldNumbers();
		this.player = player;
        if (player == 1) {
            this.playerToken = "X";
            this.enemyToken = "O";
        } else {
            this.playerToken = "O";
            this.enemyToken = "X";
        }

        this.jokerReady = true;
        this.boardFreezed = false;
    }

    getPlayer() {
        return this.player;
    }

	getEnemy() {
		return (this.player % 2) + 1;
	}

    getPlayerToken() {
        return this.playerToken;
    }

    getEnemyToken() {
        return this.enemyToken;
    }

	hasPlayerJoker() {
		return this.player == 2 && this.jokerReady;
	}
}

class EnemyMoveCalculater {
    constructor() {
		this.isCalculating = false;
		this.maxWorkerCount = 2;
		if (typeof navigator.hardwareConcurrency !== 'undefined') {
	    	this.maxWorkerCount = navigator.hardwareConcurrency;
		}
		this.workers = this.createWorkers();
    }

	createWorkers() {
		const workers = [];
		for (let i = 0; i < this.maxWorkerCount; i++) {
			const worker = new Worker("js/worker.js");
			const thisEnemyMoveCalculator = this;
			worker.onmessage = function(e) {
				const messageType = e.data[0];
				if (messageType == "getPromosingMoves") {
					thisEnemyMoveCalculator.handlePromisingMoves(e.data[1]);
				} else if (messageType == "playVirtualGame") {
					thisEnemyMoveCalculator.moveQualityList.push(e.data[1]);
					if (thisEnemyMoveCalculator.moveQualityList.length == thisEnemyMoveCalculator.moveQualityCount) {
						thisEnemyMoveCalculator.handleCalculationEnd();
					} else if (thisEnemyMoveCalculator.promisingMoves.length > 0) {
						this.postMessage([messageType,
							thisEnemyMoveCalculator.inputDataArray,
							thisEnemyMoveCalculator.promisingMoves.pop()]);
					}
				}
			};
			workers.push(worker);
		}
		return workers;
	}

	startCalculation(enemyMoveHandlerCallback, inputDataArray) {
		if (this.isCalculating) {
			throw Error("This EnemyMoveCalculater is already working.");
		}
		this.isCalculating = true;
		this.enemyMoveHandlerCallback = enemyMoveHandlerCallback;
		this.inputDataArray = inputDataArray;
		this.workers[0].postMessage(["getPromosingMoves", inputDataArray]);
	}

	handlePromisingMoves(promisingMoves) {
		this.promisingMoves = promisingMoves;
		this.moveQualityCount = this.promisingMoves.length;
		this.moveQualityList = [];

		if (this.promisingMoves.length == 0) {
			this.handleCalculationEnd();
			return;
		}
		if (this.promisingMoves[0].winInfo == 1) {
			this.moveQualityList.push(this.promisingMoves[0]);
			this.handleCalculationEnd();
			return;
		}

		for (const worker of this.workers) {
			if (this.promisingMoves.length == 0) break;
			worker.postMessage(["playVirtualGame", this.inputDataArray, this.promisingMoves.pop()]);
		}
	}

	handleCalculationEnd() {
		this.enemyMoveHandlerCallback(this.moveQualityList);
		this.isCalculating = false;
	}

    terminateAndPrepareNewWorkers() {
        for (const worker of this.workers) worker.terminate();
		this.workers = this.createWorkers();
		this.isCalculating = false;
		/* At first, we need to terminate the workers since
		a new Game might be started before the worker is finished,
		the worker would then return a move from the old game.

		Second, we already create new workers so that the
		worker.js script is already executed,
		in particular creating an instance of LineQualities in,
		which takes some time.
		Creating the workers just when a new game starts,
		might result in a longer wait time for the first move when
		the move is played fast enough. */
    }
}

/* EnemyMoveSelector:

Select the first move of player one and
a move from a list depending on the difficulty.
For the list selection there are four selection parameters:

- upcomingLossRemovalLayer:
Remove all loss moves with a low deepestLayer
when there are win or draw moves.
This effectively clears the loss move pool when there are only
"bad loss moves" (low deepestLayer), so that no "bad loss moves"
is chosen according to the blockPercentiles.

- blockPercentiles:
Gives the percentage for choosing the win, draw or loss pool of moves.
(The first number gives the chance for a loss move, the second minus the
third for a draw move and the rest for a win move).

- maxLayerList:
Divides the win moves by its deepstLayer, so that when choosing a move from
the win move pool, the move is chosen from the moves
which seems to give a fast win.

- minLayerList:
Analog to the maxLayerList, only for the loss moves, so that a loss move
is chosen from the loss moves which seems to delay the loss.

The maxLayerList and minLayerList effectively divide the win and loss
move pool into "subpools", so that we can select the "best" subpool
and then still choose a random move from this subpool
(providing more different game experiences). */

class EnemyMoveSelector {
	constructor(difficulty) {
		this.difficulty = difficulty;
		this.firstCenterFieldNumber = 24;
		this.secondCenterFieldNumbers = [16, 17, 18, 23, 25, 30, 31, 32];
		this.thirdCenterFieldNumbers = [8, 9, 10, 11, 12,
								 		  15, 19, 22, 26, 29, 33,
								 	  	  36, 37, 38, 39, 40];

		if (difficulty == 0) {
			this.upcomingLossRemovalLayer = 2;
			this.blockPercentiles = [0.3, 0.6];
			this.maxLayerList = [10];
			this.minLayerList = this.maxLayerList.slice().reverse();
		} else if (difficulty == 1) {
			this.upcomingLossRemovalLayer = 6;
			this.blockPercentiles = [0.1, 0.3];
			this.maxLayerList = [5, 10, 20];
			this.minLayerList = this.maxLayerList.slice().reverse();
		} else if (difficulty == 2) {
			this.upcomingLossRemovalLayer = 10;
			this.blockPercentiles = [-1, 0.1];
			this.maxLayerList = [1, 2, 3, 5, 10, 15];
			this.minLayerList = [30, 20, 10, 5, 3, 2, 1];
		}
	}

	getFirstPlayerField() {
		switch (this.difficulty) {
			case 2: {
				return this.firstCenterFieldNumber;
			}
			case 1: {
				if (Math.random() < 0.5) return this.firstCenterFieldNumber;
				return this.getRandomElement(this.secondCenterFieldNumbers);
			}
			case 0: {
				const randomNumber = Math.random();
				if (randomNumber < 0.33) return this.firstCenterFieldNumber;
				if (randomNumber < 0.66) return this.getRandomElement(this.secondCenterFieldNumbers);
				return this.getRandomElement(this.thirdCenterFieldNumbers);
			}
		}
	}

	selectMove(qualityMoves) {
		const dividedQualityMoves = this.divideByWinInfo(qualityMoves);
		this.checkForUpcomingLossRemoval(dividedQualityMoves);
		const selectionBlockNumber = this.getSelectionBlockNumber(dividedQualityMoves);
		const selectionBlock = dividedQualityMoves.get(selectionBlockNumber);

		if (selectionBlockNumber == 1) {
			const selectionBlockMaxLayer = this.filterMovesByLayerList(
				selectionBlock, this.maxLayerList, false);
			return this.getRandomElement(selectionBlockMaxLayer);
		}
		if (selectionBlockNumber == 0) {
			return this.getRandomElement(selectionBlock);
		}
		if (selectionBlockNumber == -1) {
			const selectionBlockMinLayer = this.filterMovesByLayerList(
				selectionBlock, this.minLayerList, true);
			return this.getRandomElement(selectionBlockMinLayer);
		}
	}

	divideByWinInfo(qualityMoves) {
		const dividedQualityMoves = new Map();
		dividedQualityMoves.set(-1, []);
		dividedQualityMoves.set(0, []);
		dividedQualityMoves.set(1, []);

		for (const qualityMove of qualityMoves) {
			dividedQualityMoves.get(qualityMove.winInfo).push(qualityMove);
		}
		return dividedQualityMoves;
	}

	checkForUpcomingLossRemoval(dividedQualityMoves) {
		if (dividedQualityMoves.get(1).length == 0 && dividedQualityMoves.get(0).length == 0) {
			return;
		}
		const lossArr = dividedQualityMoves.get(-1);
		for (let i = 0; i < lossArr.length; i++) {
			if (lossArr[i].deepestLayer < this.upcomingLossRemovalLayer) {
				lossArr.splice(i, 1);
				i--;
			}
		}
	}

	getSelectionBlockNumber(dividedQualityMoves) {
		let selectionBlockNumber = this.getWantedSelectionBlockNumber();
		while (dividedQualityMoves.get(selectionBlockNumber).length == 0) {
			if (selectionBlockNumber != 0) selectionBlockNumber = 0;
			else {
				if (dividedQualityMoves.get(1).length > 0) {
					selectionBlockNumber = 1;
				} else selectionBlockNumber = -1;
			}
		}
		return selectionBlockNumber;
	}

	getWantedSelectionBlockNumber() {
		const randomNumber = Math.random();
		for (let i = 0; i < this.blockPercentiles.length; i++) {
			if (randomNumber < this.blockPercentiles[i]) {
				return i - 1;
			}
		}
		return 1;
	}

	filterMovesByLayerList(selectionBlock, layerList, min) {
		for (const layer of layerList) {
			const filteredSelectionBlock = selectionBlock.filter(
				function (qualityMove) {
					if (min) return qualityMove.deepestLayer >= layer;
					return qualityMove.deepestLayer <= layer;
				}
			);
			if (filteredSelectionBlock.length > 0) {
				return filteredSelectionBlock;
			}
		}
		return selectionBlock;
	}

	getRandomElement(arr) {
		return arr[Math.floor(Math.random() * arr.length)];
	}
}

/*------------------------------------------------------------------------------
Init
------------------------------------------------------------------------------*/

document.addEventListener("DOMContentLoaded", function() { new Page(); });
