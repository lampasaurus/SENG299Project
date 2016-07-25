/*
 * This server is modified from and based on code supplied by SENG 299,
 * summer session 2016, for labs 4 and 6. Originally written by Simon Diemert.
 */

"use strict";

var express = require("express");

var humanInterface = require("./HumanInterface.js");
var back = require("./back.js");
var boardObject = require("./board.js");

var app = express();

var backs = [];


app.use(require("body-parser").json());

app.use(express.static('public'));

// script.js should make POST requests to this when it wants to play hotseat
app.post("/hotseat", function(req, res) {
    console.log("POST Request to: /hotseat");
	
	var ba; // This is our back end object. It will be stored in an array of back objects so multiple people can access the server at once
	var backIndex = req.body.ind; // This is the index that ba cound be found at in the array
	
	if(backIndex === null){ // This checks for if its a users first move to the board. The server needs to create a new back-end object
		var br;
		for (br = []; br.length < req.body.b.length; br.push(Array(req.body.b.length).fill(0))); // Building the board state...
		ba = new back("hotseat",br,req.body.t); // Creating the new back-end object...
		
		backs.push(ba); // The object is pushed onto the array
		backIndex = backs.length - 1; // and the index is logged
	}else{
		ba = backs[backIndex]; // If this is a later turn by the user, the back-end object is just pulled from the array directly
		ba.turn = req.body.t; // The back-end's turn counter is updated
	}
	
	var board = ba.masterBoard; // The board state is obtained. A conceptual model could be that the MVC model lives inside the back-end object

	// The move is attempted, the server automatically knows if the move is black or white depending on the current turn.
	var r = ba.makeMove(new boardObject(req.body.prev), req.body.x, req.body.y, (ba.turn % 2 === 0) ? 2 : 1, req.body.p);
	
	if(req.body.p){ // If the player passes, the server responds with increasing to turn counter
		if(ba.pass){ // If they passed once before
			ba.pass = false;
			var scores = ba.endGame(board);
			console.log(scores[0] + ", " + scores[1]);
			res.json({r: 'done', blackScore: scores[0], whiteScore: scores[1]}); // End the game if there is two passes
		}else{
			ba.pass = true;
			res.json({turn: ba.turn + 1, r: r, ind: backIndex}); // backIndex is sent so the front-end can store it. r is any sort of error message
		}
		return;
	}else{
		ba.pass = false;
	}
	
	if(r == 'success'){ // On success, the new board state is returned. An incremented turn counter is passed
		res.json({board: board.readBoard(), turn: ba.turn + 1,r: r, ind: backIndex});
	}else{ // On failure, an error message is returned
		res.json({r: r, ind: backIndex});
	}
});

// script.js should make POST requests to this when it wants ai responses
app.post("/aa", function(req, res){ // This method is lighter on comments since it's very similar to the /hotseat
	console.log("POST Request to: /aa");
	
	var diff = req.body.diff; //  should probably be controlled by something on the front end, but that doesn't exist yet
	
	var ba;
	var backIndex = req.body.ind;
	if(backIndex === null){
		var br;
		for (br = []; br.length < req.body.b.length; br.push(Array(req.body.b.length).fill(0)));
		ba = new back("ai",br,req.body.t);
		
		backs.push(ba);
		backIndex = backs.length - 1;
	}else{
		ba = backs[backIndex];
		ba.turn = req.body.t;
	}
	
	var board = ba.masterBoard;
	
	ba.connect(ba.type, diff);
	
	if(ba.turn % 2 === 1){ // place a player move
		var r = ba.makeMove(new boardObject(req.body.prev), req.body.x, req.body.y, 1, req.body.p);

		if(req.body.p){ // If the player passes, the server responds with increasing to turn counter
			if(ba.pass){ // If they passed once before
				ba.pass = false;
				var scores = ba.endGame(board);
				console.log(scores[0] + ", " + scores[1]);
				res.json({r: 'done', blackScore: scores[0], whiteScore: scores[1]}); // End the game if there is two passes
			}else{ // If this is the first pass
				ba.pass = true;
				res.json({turn: ba.turn + 1, r: r, ind: backIndex}); // backIndex is sent so the front-end can store it. r is any sort of error message
			}
			return;
		}else{ // Player didn't pass
			ba.pass = false;
		}
	
		if(r == 'success'){
			res.json({board: board.readBoard(), turn: ba.turn + 1, r: r, ind: backIndex});
		}else{
			res.json({r: r, ind: backIndex});
		}
		
	}else{ // Request an AI move. This is automatically called after a delay from the front-end
		ba.getMove(ba.type, board, board.lastMove.x, board.lastMove.y, board.lastMove.c, board.lastMove.pass, function(r,board){
			if(r == 'pass'){ // If the AI passes, the server responds with increasing to turn counter
				if(ba.pass){ // If they passed once before
					ba.pass = false;
					var scores = ba.endGame(board);
					res.json({r: 'done', blackScore: scores[0], whiteScore: scores[1]}); // End the game if there is two passes
				}else{ // If this is the first pass
					ba.pass = true;
					res.json({turn: ba.turn + 1, r: r, ind: backIndex}); // backIndex is sent so the front-end can store it. r is any sort of error message
				}
				return;
			}else{ // If the AI didn't pass
				ba.pass = false;
			}
				
			if(r == 'success'){
				res.json({board: board.readBoard(), turn: ba.turn + 1, r: r, ind: backIndex});
			}else{
				res.json({r: r, ind: backIndex});
			}
		});
	}
});

// script.js should make post requests to this when it wants pvp responses
app.post("/versus", function(req,res){
	// ADD PVP HERE
});


app.listen(process.env.PORT || 3000, function () {
    console.log("Listening on port 3000");
});
