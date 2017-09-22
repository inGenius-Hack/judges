module.exports = function(io){
	var express = require('express');
	var router = express.Router();
	var papa = require("papaparse");
	var fs = require("fs");
	var mysql = require('mysql');

	
	var connection;
	var handleDisconnect = function(){
		connection = mysql.createConnection({
								host:'localhost',
								user : 'root',
								password : 'p@t@n@hi',
								database : 'judges'
							});
			 
		connection.connect(function(err){
			if(err){
			  console.log(err);
			}else{
			  console.log("Connected as id" + connection.threadId);
			}
		});

		connection.on('error', function(err){
			console.log("DB ERROR "+err);
			if(err.code == 'PROTOCOL_CONNECTION_LOST'){
				handleDisconnect();
			}else{
				console.log('CANNOT handleDisconnect');
				throw err;
			}
		});
	}

	handleDisconnect();



	var stream = fs.createReadStream("judges.csv");
	var judegeNameStream = fs.createReadStream("judgenames.csv");

	var insertTeams = function(t){
		console.log("INSIDE TEAMS " + t);
		for(var i in t){
			connection.query({
				sql : "insert into rooms values(?, ?, ?)",
				values : [t[i].room, t[i].table_id, t[i].team_name] 
			}, function(err, r, f){
				if(err){
					console.log("ERROR " +err);
				} 
				else{
					console.log("inserted " + t[i]);
				}
			});
		}
	}

	var insertJudges = function(j){
		console.log("INSIDE TEAMS " + j);

		for(var i in j){
			connection.query({
				sql : "insert into judges values(?)",
				values : [j[i].name]
			}, function(err, r, f){
				if(err){
					console.log("ERROR " +err);
				} 
				else{
					console.log("inserted " + j[i]);
				}
			});
		}
	}

	/* GET home page. */
	var teams, judges;

	router.get('/', function(req, res, next) {
		connection.query({
			sql : 'select * from rooms'
		}, function(err, r, f){
			console.log(r);
			connection.query({
				sql : 'select * from judges'
			}, function(err, j, f){
				if(err) throw err;
				res.render('index', { title: 'Express', team_data : r, judge_data : j });
			});

		});
		
	});

	router.get('/load', function(req, res, next){
		papa.parse(stream, {
			delimeter : ",",
			header : true,
			complete : function(result, file){
				console.log(result.data);
				teams = result.data;
				papa.parse(judegeNameStream, {
					delimeter : ",",
					header : true,
					complete : function(judgenames, file){
						console.log(judgenames.data);
						judges = judgenames.data;

						insertTeams(teams);
						insertJudges(judges);
						res.send("DONE");
					},
				});
			},
			error : function(error, file){
				console.log(error);
			}
		});
	});

	io.on("connection", function(socket){
		socket.on('filterSearch_request', function(filter) {
	        console.log("Socket connected");
	        console.log(filter);
	        var sendData = [];
	        for(var i in teams){
	        	// console.log("I " + i);

	        	if(teams[i].room == filter.rooms){
	        		item = {}
	        		// console.log("MATCHED");
	        		item["room"] = teams[i].room;
	        		item["table_id"] = teams[i].table_id;
	        		item["team_name"] = teams[i].team_name;
	        		sendData.push(item);
	        	}else{
	        		// console.log("NOT MATCHED");
	        	}
	        }
	        console.log(sendData);
	        // console.log(teams);
	        // console.log(judges);
	        // util.search_article(filter, function(filterResult){
	        //     socket.emit("filterSearch_response", filterResult);
	        //     console.log("Socket emitted");
	        // });
	        socket.emit("filterSearch_response", sendData);
	        console.log("Emitted");
	    });
	});

	return router;
}
	