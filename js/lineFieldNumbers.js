/* This file is needed in main.js and worker.js */

/* This function creates an array containing arrays with
board numbers of the 28 lines
with more then four fields (7 horzintal, 7 vertical and 14 diagonal lines).
Using these arrays, one can index the board data to obtain all lines
on which a player might win. */

function createLineFieldNumbers() {
	const lineFieldNumbers = [];

	for (let i = 0; i < 7; i++) {
		const horizintalNumbers = [];
		const verticalNumbers = [];
		for (let j = 0; j < 7; j++) {
			horizintalNumbers.push(7*i + j);
			verticalNumbers.push(7*j + i);
		}
		lineFieldNumbers.push(horizintalNumbers);
		lineFieldNumbers.push(verticalNumbers);
	}

	for (let i = 0; i < 4; i++) {
		const lowerDiagonalNumbers = [];
		for (let j = 0; j < i + 4; j++) {
			lowerDiagonalNumbers.push(7*(3 - i + j) + j);
		}
		lineFieldNumbers.push(lowerDiagonalNumbers);
	}
	for (let i = 0; i < 3; i++) {
		const lowerDiagonalNumbers = [];
		for (let j = 0; j < 6 - i; j++) {
			lowerDiagonalNumbers.push(7*j + i + 1 + j);
		}
		lineFieldNumbers.push(lowerDiagonalNumbers);
	}

	for (let i = 3; i < 7; i++) {
		const upperDiagonalNumbers = []
		for (let j = 0; j < i + 1; j++) {
			upperDiagonalNumbers.push(7*(i - j) + j);
		}
		lineFieldNumbers.push(upperDiagonalNumbers)
	}
	for (let i = 0; i < 3; i++) {
		const upperDiagonalNumbers = []
		for (let j = 0; j < 6 - i; j++) {
			upperDiagonalNumbers.push(7*(6 - j) + i + 1 + j);
		}
		lineFieldNumbers.push(upperDiagonalNumbers)
	}

	return lineFieldNumbers;
}
