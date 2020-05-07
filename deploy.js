const express = require('express');
const app = express();
const fs = require("fs");
const crypto = require('crypto');

//const config = require("./config.json");
//const util = require("./cydModules/util.js")(crypto);
//const sql = require("./cydModules/sql.js");
//const accounts = require("./cydModules/account.js")(sql, util);

const config = require("./lunaModules/config.json");
const util = require("./lunaModules/util.js")(crypto);
const sql = require("./lunaModules/sql.js");
const accounts = require("./lunaModules/accounts.js")(sql, util);

//const cors = require('cors');
//require("computer-db.js");

/* IF THE SYSTEM IS UPLOADED TO THE WEBSERVER - THIS IS REQUIRED FOR SSL  */
var https = require("https");
var server = https.createServer({
	key: fs.readFileSync('/etc/letsencrypt/privkey.pem'),
	cert: fs.readFileSync('/etc/letsencrypt/fullchain.pem'),
    requestCert: false,
    rejectUnauthorized: false
}, app);

https.globalAgent.options.rejectUnauthorized = false;

//const io = require('socket.io')(server, { origins: '*:*'});
const io = require('socket.io')(server);

/* ELSE 
var http = require("http");
var server = http.createServer(app);
*/
//var io = require('socket.io')(server);

//app.use(cors());

// Used briefly to figure out where Pokee was storing my actual scripts so I could get FTP access to the accounts database... temporarily anyways.
/*const path = require("path");
console.log(path.dirname(process.argv[1])); */
// Yeah Fayti helped me out with that... xD

var AccountDB = [];

var VersionNumber = "1.0.1";

function ExportAccountDB(BackupReason) {
	let TextToWrite = JSON.stringify(AccountDB);
	
	fs.writeFile('/home/AdmiralJoshua/accountDB.dat', TextToWrite, (err) => {
		if (err) {
			console.log(BackupReason + " Database Export Failed - " + err);
		} else {
			console.log(BackupReason + " Database Export Success\n - " + AccountDB.length + " accounts backed up successfully!");
		}
	});
}

/*function FullDBBackup() {
	for (x=0; x < AccountDB.length; x++) {
		var CurrentUser = AccountDB[x];
		accounts.uploadUser(CurrentUser.username, CurrentUser.email, CurrentUser.password, CurrentUser.passwordSalt);
	}
}*/

function ImportAccountDB() {
	let ImportedData = fs.readFileSync('/home/AdmiralJoshua/accountDB.dat');
	if (ImportedData != null && ImportedData != "undefined") {	
		AccountDB = JSON.parse(ImportedData);
		console.log("Database Import Successful!");
	} else {
		console.log("Database Import Failed - File is empty!");
	}
}
// THE MUSIC SYNCING SERVICE
//  "resources/music"

// THIS CODE IS USED FOR PICKING / LOADING MUSIC TRACKS FOR DISTRIBUTION IN-GAME LATER ON...
//  THIS IS SERVER-SIDE TO SOMEWHAT PREVENT SIMPLE DOWNLOADING OF THE FILES BUT ALSO TO ENSURE ALL PLAYER'S ARE PLAYING THE SAME TRACKS OR THAT THE SERVER SWITCHES DEPENDING ON EVENTS INSTEAD.
var CurrentGenre;

ChillTracks = ["1 - sushi - 3'00.mp3", "2 - Timecop1983 - Dimensions.mp3", "3 - Timecop1983 - Somewhere We Can Go.mp3",
		"4 - Timecop1983 - Bright Lights.mp3", "5 - Gridscape - Mallscape.mp3", "6 - Bachelor of Hearts - Aurora Borealis.mp3",
		"7 - Raydar - Neon Graffiti.mp3", "8 - Unreal Tournament - Foregone Destruction.mp3", "9 - Quixotic - Dust To Dust.mp3",
		"10 - Emil Rottmayer - MEGA.mp3", "11 - D Kexer - Fiestaa.mp3", "12 - Moderat_-_A_New_Error.mp3", "13 - JIMMYSQUAAARE.mp3",
		"14 - Mick Jenkins - Vibe Instrumental Prod. Monee.mp3", "15 - Efence - Spaceflight.mp3"];
		
DramaticTracks = ["1 - Gridscape - Runaway.mp3", "2 - Waveshaper - Crystal Protocol.mp3", "3 - Payday 2 - Criminals Ambition (instrumental).mp3",
		"4 - Payday 2 - The Gauntlet.mp3", "5 - TeknoAXE - Uneasy Truce.mp3", "6 - Systek - Arthas My Son.mp3",
		"7 - TeknoAXE - A Meeting of Genres.mp3", "8 - The Complex.mp3"];
		
UpbeatTracks = ["1 - BEATBOX MACHINERY - Cities of the Future.mp3", "2 - Nightstop - Harrison Ford.mp3",
		"3 - DJ Kestutis - Uplifting Trance.mp3", "4 - Emil Rottmayer - W.A.V.E.mp3",
		"5 - Decisions.mp3"];

MainMenuTracks = ["1 - D Kexer - POFF.mp3", "2 - As Yet Untitled.mp3", "3 - TeknoAXE - Home Sweet Megalopolisc.mp3"];

function LoadFullPaths() {
	for (i = 0; i < ChillTracks.length; i++) {
		ChillTracks[i] = "resources/music/chill/" + ChillTracks[i];
	}
	for (i = 0; i < DramaticTracks.length; i++) {
		DramaticTracks[i] = "resources/music/dramatic/" + DramaticTracks[i];
	}
	for (i = 0; i < UpbeatTracks.length; i++) {
		UpbeatTracks[i] = "resources/music/upbeat/" + UpbeatTracks[i];
	}
	for (i = 0; i < MainMenuTracks.length; i++) {
		MainMenuTracks[i] = "resources/music/main-menu/" + MainMenuTracks[i];
	}
}
LoadFullPaths();

function PickRandomTrack(TargetGenre) {
	if (TargetGenre == "chill") {
		return ChillTracks[Math.floor(Math.random()*ChillTracks.length)];
	} else if (TargetGenre == "dramatic") {
		return DramaticTracks[Math.floor(Math.random()*DramaticTracks.length)];
	} else if (TargetGenre == "upbeat") {
		return UpbeatTracks[Math.floor(Math.random()*UpbeatTracks.length)];
	} else {
		return MainMenuTracks[Math.floor(Math.random()*MainMenuTracks.length)];
	}
}

function RemoveInvalidChars(inputString) {
	return inputString.replace(/[|&;$%"<>()+,]/g, "");
}

//console.log(PickRandomTrack("chill"));

// MAIN GAME CODE AND STUFF GOES HERE

/* DATA STORED IN AN ACTIVE GAME OBJECT:
	GameID - A Unique ID Number that the player must enter correctly to join later on.
	AssignedIPs - A list storing all IP addresses currently assigned to nodes - This will prevent accidental duplicate IPs.
	CompData - Array of all the computers that are in the current game, this will include:
	  - Each of the Players' Computers
	  - Whitelist Servers
	  - NPC servers / Servers with cracking tools on them.
	PlayerList - An array of the players in this particular game
	  - Username - A string this player will be referred to as throughout the game
	  - Status - This will be either string or boolean representing whether the player is connected successfully or not etc.
	  - Connected IP - A string identifying which computer (if any that that player is currently connected to)
	  - SocketID - The associated ID of this player that identifies their connections when communicating with the webserver compared to others.
	  - ID - A Unique Identifier for this particular player object
	  - GameCode - The ID this player is currently connected to - This isn't necessary but does make identifying which game a player is in much easier.
*/
var ActiveGames = [];


var CompDatabase = [
{
	hostname: "elgoog Root DNS",
	ip: "16.16.16.16",
	owner: "NPC",
	SecLvl: 0,
	Data: [
		["Browser.txt", "Due to recent Cyber-Attacks, our browser, Plantinum, is temporarily disabled. We apologise for any inconvenience caused."],
		["log.dat", "#RANDOMIP# accessed system with administrative privileges on localhost\n#RANDOMIP# has deleted folder."],
		["SysCorruptor.exe", "#BINARYLARGE#"],
		["BruteSSH.exe", "#BINARYLARGE#"]
	]/*,
	Whitelist: false,
	WhitelistSrv: "none"*/
},
{
	hostname: "MallMart Security System",
	ip: "59.31.153.194",
	owner: "NPC",
	SecLvl: 1,
	Data: [
		["overridesec.js", "#BINARYLARGE#"],
		["LOIC.exe", "#BINARYSMALL#"],
		["MemesVirus.exe", "#BINARYSMALL#"],
		["FTPBounce.exe", "#BINARYLARGE#"]
	],
	Whitelist: false,
	WhitelistSrv: "Whitelist Server Farm #101"
},
{
	hostname: "Noone's PC #232",
	ip: "#RANDOMIP6#",
	owner: "NPC",
	SecLvl: 0,
	Data: [
		["87517.icr", "<Cotton Mouth> How do you describe the color blue to someone who is blind and has never seen a color before? \n<NickBlasta> 0 0 255"],
		["8226.irc", "(@T-56): anyone up for some drunken baseball fun next weekend? /n(+de-v1): baseball? /n(+de-v1): k before i just THOUGHT you were gay /n(+de-v1): now i know for sure /n(+de-v1): :P /n(@T-56): steph: ok, scratch baseball, how about water polo /n(+de-v1): you just want to be in a pool with 20 guys in speedos are trying to grab balls"]
	]
	/*Whitelist: false,
	WhitelistSrv: "none",
	Ports: []*/
},
{
	hostname: "Upside-link Gateway #2215",
	ip: "#RANDOMIP4#",
	owner: "NPC",
	SecLvl: 3,
	Data: [
		["Welcome to upside-link.txt", "This is default Gateway for your specific account, no one else can access it without hacking."],
		["anotherFile.dat", "Completely useless data here, we don't know why we even put this in here."],
		["information.txt", "If you get hacked, we will not be able to help, and all our employees will testify that they weren't involved with your actions and gateway. No but seriously, don't get hacked."],
		["Your services password.txt", "Your specific Upside-link password is Banana_bread12532@$1A"],
		["First_test.ip.txt", "Your first test server ip is [ERROR](Please contact customer support)"],
		["multiline.info", "For multiline you can use \n and I'll figure out someway to get that working later on."]
	],
	Whitelist: false,
	WhitelistSrv: "Whitelist Server Farm #101"
},
{
	hostname: "Whitelist Server Farm #101",
	ip: "#RANDOMIP4#",
	owner: "NPC",
	SecLvl: 1,
	Data: [
		["Whitelist.cfg", "#BINARYLARGE#"],
		["Allowed_IPs.bin", "#BINARY#"],
	],
	Whitelist: true,
	Ports: [22]
},
{
	hostname: "Lithium Whitelist Server",
	ip: "#RANDOMIP4#",
	owner: "NPC",
	SecLvl: 2,
	Data: [
		["Whitelist.cfg", "#BINARYLARGE#"],
		["Allowed_IPs.bin", "#BINARY#"],
		["87517.icr", "<Cotton Mouth> How do you describe the color blue to someone who is blind and has never seen a color before? \n<NickBlasta> 0 0 255"],
		["8226.irc", "(@T-56): anyone up for some drunken baseball fun next weekend? /n(+de-v1): baseball? /n(+de-v1): k before i just THOUGHT you were gay /n(+de-v1): now i know for sure /n(+de-v1): :P /n(@T-56): steph: ok, scratch baseball, how about water polo /n(+de-v1): you just want to be in a pool with 20 guys in speedos are trying to grab balls"]
	],
	Whitelist: true,
	Ports: [22, 1443]
},
{
	hostname: "Ares Whitelister",
	ip: "#RANDOMIP4#",
	owner: "NPC",
	SecLvl: 3,
	Data: [
		["Whitelist.cfg", "#BINARYLARGE#"],
		["Allowed_IPs.bin", "#BINARY#"],
		["14572.irc", "<hewbert> goths have been progressively wearing less clothing as the years have gone by \n<hewbert> how shamless! \n<hewbert> they should be progressivly wearing more and MORE clothing \n<hewbert> until they are bundled up with 200 pound parkas \n<Unfy> they would have names like goth_eskimo_69 \n<hewbert> you could save on facepaint by using snow"],
		["28141.irc", "<Dedushka> Syntax error: function hell() needs an argument. Please choose what hell you want to involve \n<Dedushka> i dunno much fortran \n<madiera> FORTRAN compilers are more like 'error, gorak think u program not working.  gorak consult rock and tree.'"]
	],
	Whitelist: true,
	Ports: [22, 21, 1443]
}]

var ExamplePlayer = {
	hostname: ("PLAYERNAME" + "'s Computer").toString(),
	ip: "#RANDOMIP4#",
	owner: "PLAYERNAME",
	SecLvl: 0,
	Data: [
		"system.bin", "#BINARYLARGE#",
		"network.cfg", "#BINARY#",
		"terminal.cfg", "#BINARY#",
		"gui.cfg", "#BINARY#"
	],
	Whitelist: false,
	WhitelistSrv: "Ares Whitelister"
}


var assignedCodes = [];
var loopCounter;
function generateGameCode(){
	loopCounter = 0;
	var code = (Math.floor(Math.random() * 9999999) + 1111).toString();
	while (assignedCodes.indexOf(code) != -1) {
		code = (Math.floor(Math.random() * 9999999) + 1111).toString();
		console.log("Game Code Generation Failed - Retrying... (Failed " + loopCounter.toString() + " time(s)")
		loopCounter++;
	}
	assignedCodes.push(code);
	return code;
}

function PickThreeIPs(TargetGame) {
	var ChosenIPs = [];
	var IPClone = TargetGame.CompData.slice(0);
	var RandomIndex;
	for (a = 0; a < 2; a++) {
		RandomIndex = Math.floor(Math.random() * IPClone.length);
		ChosenIPs.push(IPClone[RandomIndex].ip);
		IPClone.splice(RandomIndex, 1);
	}
	RandomIndex = Math.floor(Math.random() * ChosenIPs.length);
	ChosenIPs.splice(RandomIndex, 0, TargetGame.CompData[0].ip);
	return ChosenIPs;
}

function generateIPv4() {
	var CurrentIP = "";
	for (i = 0; i < 4; i++) {
		CurrentIP += (Math.floor(Math.random() * 256)).toString();
		if (i < 3) {
			CurrentIP += ".";
		}
	}
	return CurrentIP;
}

function generateIPv6() {
	var CurrentIP = "";
	for (i = 0; i < 8; i++) {
		CurrentIP += (Math.floor(Math.random() * 65536)).toString(16);
		if (i < 7) {
			CurrentIP += ":";	
		}
	}
	return CurrentIP.replace("0000", "");
}


var gameTick = setInterval(function() {
	for (i = 0; i < ActiveGames.length; i++) {
		if (ActiveGames[i].GameStatus === "in-game") {
			if (ActiveGames[i].TimeLeft > 0) {
				ActiveGames[i].TimeLeft -= 1;	
			}
		} else if (ActiveGames[i].GameStatus === "summary") {
			console.log("Game with code: " + ActiveGames[i].GameID + " has ended!");
			ActiveGames[i].GameStatus = "ended";
		}
	}
}, 1000);

/*var garbageCollector = setInterval(function() {
	var IndexesToRemove = [];
	for (x = 0; x < ActiveGames.length; x++) {
		if (ActiveGames[x].GameStatus === "ended") {
			IndexesToRemove.push(x);
		}
	}
	var DeleteCount = 0;
	for (y = IndexesToRemove.length; y > -1; y--) {
		ActiveGames.splice(IndexesToRemove[y], 1);
		DeleteCount++;
	}
	console.log("Garbage Collection Completed - " + DeleteCount.toString() + " game(s) were deleted!");
}, 1200000);*/

var gargabeCollector = setInterval(function() {
	var TargetLength = ActiveGames.length;
	var NumberRemoved = 0;
	if (TargetLength > 0) {
		while (TargetLength > 0) {
			TargetLength -= 1;
			if (ActiveGames[TargetLength].GameStatus === "ended") {
				NumberRemoved += 1;
				ActiveGames.splice(TargetLength, 1);
			}
		}
	}
	if (NumberRemoved > 0) {
		console.log("Garbage Collection Completed - " + NumberRemoved.toString() + " game(s) were cleaned!");
	}
}, 7200000);

function GetGameById(targetId) {
	var GameFound = ActiveGames.find(GameObject => GameObject.GameID === targetId);
	if (GameFound == null || GameFound == "undefined") {
		return false;
	} else {
		return GameFound;
	}
}

function GetCompByName(GameObject, targetName) {
	CompFound = false;
	for (y=0; y < GameObject.CompData.length; y++) {
		if (GameObject.CompData[y].hostname == targetName) {
			CompFound = true;
			return y;
			break;
		}
	}
	if (CompFound == false) {
		return false;
	}
}

function GetCompByIP(GameObject, targetIP) {
	CompFound = false;
	for (z=0; z < GameObject.CompData.length; z++) {
		if (GameObject.CompData[z].ip == targetIP) {
			return z;
			CompFound = true;
		}
	}
	if (CompFound == false) {
		return false;
	}
	
}

function GetFileByFileName(TargetComp, DesiredName) {
	var TargetFiles = TargetComp.Data;
	var FileFound = false;
	for (z=0; z < TargetFiles.length; z++) {
		if (TargetFiles[z][0] === DesiredName) {
			FileFound = true;
			return TargetComp.Data[z];
			break;
		}
	}
	if (FileFound === false) {
		return null;
	}
}

function GetFileIndexByName(targetComp, targetFilename) {
	var failed = true;
	for (i=0; i < targetComp.Data.length; i++) {
		if (targetComp.Data[i][0] == targetFilename) {
			return i;
			failed = false;
			brea;
		}
	}
	if (failed) {
		return null;
	}
}
function GetPlayerBySocketID(GameObject, targetSocket) {
	var PlayerFound = false;
	for (z=0; z < GameObject.PlayerList.length; z++) {
		if (GameObject.PlayerList[z].PlayerSocket == targetSocket) {
			return GameObject.PlayerList[z];
			PlayerFound = true;
			break;
		}
	}
	if (PlayerFound === false) {
		return false;
	}
}

function GetPlayerByName(GameObject, targetName) {
	var PlayerFound = false;
	for (z=0; z < GameObject.PlayerList.length; z++) {
		if (GameObject.PlayerList[z].username == targetName) {
			PlayerFound = true;
			return z;
			break;
		}
	}
	if (PlayerFound === false) {
		return false;
	}
}

var remoteClients = [{netName: "exampleNetwork", netClients: []}];

function getRemoteSesh(seshName) {
	let seshFound = false;
	for (let selectedSession of remoteClients) {
		if (selectedSession.netName == seshName) {
			return selectedSession;
			seshFound = true;
			break;
		}
	}
	if (seshFound == false) {
		return null;
	}
}

io.on('connection', function(socket) {
    
    socket.on("lunaAccts", function(msg) {
        if (msg.type == "loginReq") {
            let username = msg.username;
            let password = msg.password;
            
        } else if (msg.type == "regReq") {
            let newUser = msg.username;
            let newPass = msg.password;
            let newMail = msg.email;
            console.log(msg);
            if (newPass != msg.passwordConfirm) {
                socket.emit("lunaAccts", {type: "regErr", error: "Your passwords do not match."});
            } else {
                if (!newUser.length > 3) {
                    socket.emit("lunaAccts", {type: "regErr", error: "Your username must be at least 4 characters long."});
                } else {
                    if (!newMail.length >= 7) {
                        socket.emit("lunaAccts", {type: "regErr", error: "Email address is invalid."});
                    } else {
                        /*let newSalt = createCharString(12);
                        let finalPass = newPass + newSalt;
				        var hashPass = crypto.createHmac('sha256', finalPass.toString()).digest('hex');//shaModule.sha256(FinalPass);*/
                        
                        let registerResponse = accounts.registerUser(newUser, newMail, newPass, msg.discord, msg.skype, msg.bio);
                        
						if (registerResponse == true) {
							socket.emit("lunaAccts", {type: "regSucc", text: "Account created successfully!"});
						} else {
							socket.emit("lunaAccts", {type: "regErr", error: "The Display Name chosen has already been taken."});
						}
                        
                    }
                }
            }
        }
    });
	
	socket.on("remoteReq", function(msg) {
		//console.log(socket.client);
		var clientIp = socket.request.connection.remoteAddress.toString();
		clientIp = clientIp.substring(7, clientIp.length)
		console.log("Comp with ID: '" + msg.compId.toString() + "' and Network ID: '" + clientIp + "'");
		//socket.emit("remoteSuccess", {});
		
		let targetSession = getRemoteSesh(clientIp);
		if (targetSession === null) {
			// DO NOTHING
			remoteClients.push({netName: clientIp, netClients: []});
			targetSession = remoteClients[remoteClients.length - 1];
		}
		
		targetSession.netClients.push({name: msg.compId, conn: socket.id});
		socket.emit("remoteSuccess", {netId: clientIp, compId: msg.compId});
		for (let clientAddress of targetSession.netClients) {
			if (clientAddress.conn != socket.id) {
				socket.to(clientAddress.conn).emit("clientRefresh", {clientList: targetSession.netClients});
			} else {
				socket.emit("clientRefresh", {netId: clientIp, compId: msg.compId, clientList: targetSession.netClients});
			}
		}
	});
	
	socket.on("playUrl", function(msg) {
		console.log("PLAY instruction sent to: '" + msg.targetConn + "' with URL: " + msg.targetUrl);
		socket.to(msg.targetConn).emit("playUrl", {targetUrl: msg.targetUrl});
	});
	
	socket.on("gameReq", function(msg) {
		console.log(msg);
		if (msg.type == "gamePing") {
			var SelectedGame = GetGameById(msg.gameCode);
			var CompFound = false;
			if (SelectedGame != false && SelectedGame != null) {
				for (x = 0; x < SelectedGame.CompData.length; x++) {
					if (msg.TargetIP === SelectedGame.CompData[x].ip) {
						try {
							socket.emit('gameRes', {type: "pingRes", code: msg.gameCode, response: "Computer Found!", compinfo: SelectedGame.CompData[x], WhitelistIP: SelectedGame.CompData[GetCompByName(SelectedGame, SelectedGame.CompData[x].WhitelistSrv)].ip,timeLeft: SelectedGame.TimeLeft});
						}
						catch(ex) {
							socket.emit('gameRes', {type: "pingRes", code: msg.gameCode, response: "Computer Found!", compinfo: SelectedGame.CompData[x], WhitelistIP: null, timeLeft: SelectedGame.TimeLeft});
						}
						CompFound = true;
						var SourcePlayer = GetPlayerBySocketID(SelectedGame, socket.id);
						socket.to(SelectedGame.ServerSocket).emit("serverRes", {type: "logEvent", timeLeft: SelectedGame.TimeLeft, code: SelectedGame.GameID, text: ("Player '" + SourcePlayer.username + "' connected to Computer with IP: '" + SelectedGame.CompData[x].ip + "'").toString()});
						if (SelectedGame.CompData[x].owner != "NPC") {
							for (y=0; y < SelectedGame.PlayerList.length; y++) {
								console.log("CompOwner: " + SelectedGame.CompData[x].owner);
								if (SelectedGame.CompData[x].owner.indexOf(SelectedGame.PlayerList[y].username) >= 0) {
									socket.to(SelectedGame.PlayerList[y].PlayerSocket).emit('gameRes', {type: "incomingConn", code: msg.gameCode});
									break;
								}
							}	
						}
						break;
					}
				}
				if (CompFound == false) {
					socket.emit("gameRes", {type: "pingRes", code: msg.gameCode, response: "No Computer", compinfo: null, timeLeft: SelectedGame.TimeLeft});
				}
			}
		} else if (msg.type == "fkLaunch") {
			console.log("FORKBOMB REQUEST RECEIVED!");
			var SelectedGame = GetGameById(msg.code);
			console.log(SelectedGame);
			if (SelectedGame !== null && SelectedGame !== false) {
				var PlayerFound = false;
				for (i = 0; i < SelectedGame.PlayerList.length; i++) {
					if (SelectedGame.PlayerList[i].AssocIP === msg.targetIP) {
						PlayerFound = SelectedGame.PlayerList[i];
						break;
					}
				}
				console.log(PlayerFound);
				if (PlayerFound !== false) {
					var SourcePlayer = GetPlayerBySocketID(SelectedGame, socket.id);
					console.log(("Player '" + SourcePlayer.username + "' has launched a forkbomb on player '" + PlayerFound.username + "'!").toString());
					socket.emit("gameRes", {type: "forkBomb-launch", code: msg.code, response: "Successful!"});
					socket.to(PlayerFound.PlayerSocket).emit("gameRes", {type: "forkBomb", code: msg.code});
					socket.to(SelectedGame.ServerSocket).emit("serverRes", {type: "logEvent", code: msg.code, text: ("Player '" + SourcePlayer.username + "' has launched a forkbomb on player '" + PlayerFound.username + "'!").toString()});
				} else {
					socket.emit("gameRes", {type: "forkBomb-launch", code: msg.code, response: "Failure - Target IP is either NPC or can't be found!"});
				}
			}
		} else if (msg.type == "openFile") {
			var SelectedGame = GetGameById(msg.code);
			if (SelectedGame != null && SelectedGame !== false) {
				var TargetIndex = GetCompByIP(SelectedGame, msg.targetIP);
				if (TargetIndex !== null && TargetIndex !== false) {
					var TargetComp = SelectedGame.CompData[TargetIndex];
					var FileActual = GetFileByFileName(TargetComp, msg.fileName);
					if (FileActual !== null && FileActual !== false) {
						socket.emit("gameRes", {type: "openFile", code: msg.code, response: "Success", fileName: FileActual[0].toString(), fileData: FileActual[1].toString()});
						console.log("File with name '" + FileActual[0] + "' opened!");
					} else {
						socket.emit('gameRes', {type: "openFile", code: msg.code, response: "Failure - File not found."});
					}
				} else {
					socket.emit('gameRes', {type: "openFile", code: msg.code, response: "Failure - Computer with that IP could not be found."});
				}
			} else {
				console.log("Fatal Error Occurred - Game with code '" + msg.code + "' could not be located.");
			}
		} else if (msg.type == "createFile") {
			var SelectedGame = GetGameById(msg.code);
			var CompIndex = GetCompByIP(SelectedGame, msg.targetIP);
			var CompFiles = SelectedGame.CompData[CompIndex].Data;
			var NumberOfFiles = 0;
			for (b=0; b < CompFiles.length; b++) {
				if (CompFiles[b][0] == ("untitled" + NumberOfFiles.toString() + ".txt").toString()) {
					NumberOfFiles += 1;
				}
			}
			var newFileName = "untitled" + NumberOfFiles.toString() + ".txt";
			SelectedGame.CompData[CompIndex].Data.push([newFileName, ""]);
			socket.emit('gameRes', {type: "fileCreation", code: msg.code, response: "Success!", newFilename: newFileName});
		} else if (msg.type == "updateFile") {
			var SelectedGame = GetGameById(msg.code);
			Success = false;
			if (SelectedGame !== false && SelectedGame !== null) {
				var CompIndex = GetCompByIP(SelectedGame, msg.targetIP);
				console.log("FileUpdate - CompIndex: " + CompIndex.toString());
				if (CompIndex != null && CompIndex !== false) {
					var FileLocation = GetFileIndexByName(SelectedGame.CompData[CompIndex], msg.filename);
					console.log("FileUpdate - FileIndex: " + FileLocation.toString());
					if (FileLocation != null && FileLocation != false) {
						SelectedGame.CompData[CompIndex].Data[FileLocation][1] = msg.newData;
						Success = true;
					}
				}
			}
			if (Success === false) {
				socket.emit('gameRes', {type: "fileUpdate", code: msg.code, response: "Update Failed!"});
			} else {
				socket.emit('gameRes', {type: "fileUpdate", code: msg.code, response: "Update Success!", timeLeft: SelectedGame.TimeLeft});
			}
		} else if (msg.type == "portCrack") {
			var SelectedGame = GetGameById(msg.code);
			if (SelectedGame != null && SelectedGame != false) {
				var SourcePlayer = GetPlayerBySocketID(SelectedGame, socket.id);
				if (SourcePlayer != null && SelectedGame != false) {
					var SourceComp = SelectedGame.CompData[GetCompByIP(SelectedGame, SourcePlayer.AssocIP)];
					if (SourceComp != null && SourceComp != false) {
						var FileCheck;
						if (msg.pType == "ssh") {
							FileCheck = GetFileIndexByName(SourceComp, "BruteSSH.exe");
						} else if (msg.pType == "ftp") {
							FileCheck = GetFileIndexByName(SourceComp, "FTPBounce.exe");
						} else if (msg.pType == "sql") {
							FileCheck = GetFileIndexByName(SourceComp, "SQLCorrupt.exe");
						} else if (msg.pType == "pword") {
							FileCheck = GetFileIndexByName(SourceComp, "PassCrack.exe");
						}
						
						if (FileCheck === null || FileCheck === false) {
							socket.emit("gameRes", {type: "portCrack", code: msg.code, pType: msg.pType, response: "This application is not currently installed on your machine."});
						} else {
							socket.emit("gameRes", {type: "portCrack", code: msg.code, pType: msg.pType, response: "Success!"});
						}
					}
				}
			}
		} else if (msg.type == "virusLaunch") {
			var SelectedGame = GetGameById(msg.code);
			var SourcePlayer = GetPlayerBySocketID(SelectedGame, socket.id);
			var SourceComp = SelectedGame.CompData[GetCompByIP(SelectedGame, SourcePlayer.AssocIP)];
			//console.log(SourceComp);
			
			if (msg.vType == "memes") {
				var FileCheck = GetFileIndexByName(SourceComp, "MemesVirus.exe");
				if (FileCheck === null || FileCheck === false) {
					socket.emit("gameRes", {type: "virusLaunch", code: msg.code, vType: "memez", response: "This application is not currently installed on your machine."});
				} else {
					var TargetComp = SelectedGame.CompData[GetCompByIP(SelectedGame, msg.targetIP)];
					var Success = false;
					if (TargetComp !== null && TargetComp !== false) {
						for (x=0; x < SelectedGame.PlayerList.length; x++) {
							var TargetPlayer = SelectedGame.PlayerList[x];
							if (TargetPlayer.AssocIP === TargetComp.ip) {
								socket.to(SelectedGame.PlayerList[x].PlayerSocket).emit("gameRes", {type: "launchVirus", code: msg.code, virusType: "memez"});
								socket.emit("gameRes", {type: "virusLaunch", code: msg.code, vType: "memez", response: "Success!"});
								Success = true;
								break;
							}
						}
						if (Success == false) {
							socket.emit("gameRes", {type: "virusLaunch", code: msg.code, vType: "memez", response: "Fail - Target Computer is not a player."});
						}
					}
				}
			}

		} else if (msg.type == "dlReq") {
			var DownloadSuccess = false;
			var SelectedGame = GetGameById(msg.code);
			/*if (SelectedGame != false && SelectedGame != null) {
				console.log("DLREQ - Game Found with code: " + msg.code);
			}*/
			var CompIndex = GetCompByIP(SelectedGame, msg.targetIP);
			//console.log("DLREQ - Comp Found with IP: " + msg.targetIP + " At Index: " + CompIndex);
			if (CompIndex !== false && CompIndex !== null) {
				var SourcePlayer = GetPlayerBySocketID(SelectedGame, socket.id);
				//console.log("DLREQ - Player Found with id: " + socket.id + " Player IP: " + SourcePlayer.AssocIP);
				if (SourcePlayer !== false && SourcePlayer !== null) {
					var TargetFile = GetFileIndexByName(SelectedGame.CompData[CompIndex], msg.filename);
					//console.log("Target File with name: " + msg.filename + " found at index: " + TargetFile);
					if (TargetFile !== false && TargetFile !== null) {
						var PlayerCompIndex = GetCompByIP(SelectedGame, SourcePlayer.AssocIP);
						//console.log("Player's computer found at IP:" + SourcePlayer.AssocIP + " with index: " + PlayerCompIndex);
						if (PlayerCompIndex !== null && PlayerCompIndex !== false) {
							SelectedGame.CompData[PlayerCompIndex].Data.push((SelectedGame.CompData[CompIndex].Data[TargetFile]));
							socket.emit("gameRes", {type: "dlRes", code: msg.code, response: "Download Success!", timeLeft: SelectedGame.TimeLeft});
							DownloadSuccess = true;
						}
					}
				}
			}
			if (DownloadSuccess === false) {
				socket.emit("gameRes", {type: "dlRes", code: msg.code, repsonse: "Download Failure!", timeLeft: SelectedGame.TimeLeft});
			}
		} else if (msg.type == "renReq") {
			var SelectedGame = GetGameById(msg.code);
			Success = false;
			if (SelectedGame !== false && SelectedGame !== null) {
				var CompIndex = GetCompByIP(SelectedGame, msg.targetIp);
				if (CompIndex != null && CompIndex != false) {
					var FileLocation = GetFileIndexByName(SelectedGame.CompData[CompIndex], msg.origFilename);
					if (FileLocation != null && FileLocation != false) {
						SelectedGame.CompData[CompIndex].Data[FileLocation][0] = msg.newFilename;
						Success = true;
					}
				}
			}
			if (Success == false) {
				socket.emit('gameRes', {type: "renRes", response: "Rename Failed!"});
			} else {
				socket.emit('gameRes', {type: "renRes", response: "Rename Success!", CompInfo: SelectedGame.CompData[CompIndex], timeLeft: SelectedGame.TimeLeft});
			}
		} else if (msg.type == "delReq") {
			var SelectedGame = GetGameById(msg.code);
			Success = false;
			if (SelectedGame != false && SelectedGame != null) {
				var CompIndex = GetCompByIP(SelectedGame, msg.targetIp);
				if (CompIndex != null && CompIndex != false) {
					var FileLocation = GetFileIndexByName(SelectedGame.CompData[CompIndex], msg.filename);
					//console.log(FileLocation);
					if (FileLocation !== null && FileLocation !== false) {
						SelectedGame.CompData[CompIndex].Data.splice(FileLocation, 1);
						Success = true;
						
						var SourcePlayer = GetPlayerBySocketID(SelectedGame, socket.id);
						//var SourceCompIndex = GetCompByIP(SelectedGame, SourcePlayer.AssocIP);
						
						if (SelectedGame.CompData[CompIndex].Data.length === 0) {
							console.log("CompData is now Empty -- Testing and Triggering Elimination");
							if (SelectedGame.CompData[CompIndex].owner != "NPC" && SelectedGame.CompData[CompIndex].owner !== "N/A") {
								var CompOwner = GetPlayerByName(SelectedGame, SelectedGame.CompData[CompIndex].owner.toString());
								console.log("Player to Eliminate ID: " + CompOwner.toString());
								var OwnerActual = SelectedGame.PlayerList[CompOwner];
								console.log("Player to Eliminate Name: " + OwnerActual.username);
								socket.to(OwnerActual.PlayerSocket).emit("gameRes", {type: "elimination", code: msg.code, message: "eliminated"});
								SelectedGame.PlayerList[CompOwner].status = "Eliminated";
								socket.emit('gameRes', {type: "delRes", response: "Delete Success!", CompInfo: SelectedGame.CompData[CompIndex], elim: true});
								socket.to(SelectedGame.ServerSocket).emit("serverRes", {type: "logEvent", timeLeft: SelectedGame.TimeLeft, code: SelectedGame.GameID, text: ("Player '" + SourcePlayer.username + "' has deleted file '" + msg.filename + "'").toString() + "\n" + ("Player '" + SourcePlayer.username + "' has eliminated '" + SelectedGame.PlayerList[CompOwner].username + "' from the game!").toString()});
							}
						} else {
							socket.emit('gameRes', {type: "delRes", response: "Delete Success!", CompInfo: SelectedGame.CompData[CompIndex], elim: false});
							socket.to(SelectedGame.ServerSocket).emit("serverRes", {type: "logEvent", timeLeft: SelectedGame.TimeLeft, code: SelectedGame.GameID, text: ("Player '" + SourcePlayer.username + "' has deleted file '" + msg.filename + "'").toString()});
						}
					}
				}
				if (Success === false) {
					socket.emit('gameRes', {type: "delRes", response: "Delete Failed!"});
				}
			}
		} /*else if (msg.type == "imageReq") {
			console.log("Player with ID: " + msg.PlayerID + " requested Image Update.");
			var SelectedGame = GetGameById(msg.code);
			if (SelectedGame != false && SelectedGame != null) {
				//console.log("Image Req - Checking Game with ID: " + SelectedGame.GameID);
				for (x=0; x < SelectedGame.PlayerList.length; x++) {
					console.log(SelectedGame.PlayerList[x].UserID + " = " + msg.PlayerID);
					if (SelectedGame.PlayerList[x].UserID == msg.PlayerID) {
						socket.emit("gameRes", {type: "imageRes", ImageSource: (SelectedGame.PlayerList[x].UserIMG).toString(), PlayerName: SelectedGame.PlayerList[x].username});
						SelectedGame.PlayerList[x].PlayerSocket = socket.id;
						console.log("Image Request Responded with: " + (SelectedGame.PlayerList[x].UserIMG).toString());
						break;
					}
				}
			} else {
				socket.emit("gameRes", {type: "codeTest", response: "Failure!"});
			}
		} else if (msg.type == "reconnectReq") {
			var PlayerFound = false;
			var GameFound = false;
			for (y = 0; y < ActiveGames.length; y++) {
				if (ActiveGames[y].GameID === msg.code) {
					GameFound = true;
					for (z = 0; z < ActiveGames[y].PlayerList.length; z++) {
						if (ActiveGames[y].PlayerList[z].UserID == msg.PlayerID) {
							ActiveGames[y].PlayerList[z].PlayerSocket = socket.id;
							ActiveGames[y].PlayerList[z].username = msg.playerName;
							socket.emit("gameRes", {type: "reconnectRes", response: "Success!", timeLeft: ActiveGames[y].TimeLeft});
							PlayerFound = true;
							break;
						}
					}
				}
				if (PlayerFound) {
					break;
				} else if (GameFound) {
					break;
				}
			}
			if (PlayerFound == false) {
				socket.emit("gameRes", {type: "reconnectRes", response: "Failure!", timeLeft: ActiveGames[y].TimeLeft});
			} else {
				socket.emit("gameRes", {type: "reconnectRes", response: "Success!"});
			}
		} else if (msg.type == "UpdateImage") {
			var GameFound = false;
			for (i = 0; i < ActiveGames.length; i++) {
				if (msg.gameCode == SelectedGame.GameID) {
					for (x = 0; x < SelectedGame.PlayerList.length; x++) {
						console.log(SelectedGame.PlayerList[x].UserID + " = " + msg.PlayerID);
						if (SelectedGame.PlayerList[x].UserID == msg.PlayerID) {
							SelectedGame.PlayerList[x].UserIMG = msg.ImageSrc;
							console.log("USER IMAGE UPDATED: " + msg.ImageSrc);
							socket.emit("gameRes", {type: "ImageResponse", response: "Success!"});
							break;
						}
					}
					GameFound = true;
				}
				if (GameFound == true) {
					break;
				}
			}
			if (GameFound == false) {
				socket.emit("gameRes", {type: "ImageResponse", response: "Failure!"});
			} 
		}*/
	});
	
	socket.on('clientReq', function(msg) {
		console.log("clientReq: ");
		console.log(msg);
		if (msg.type == "addPlayer") {
			var SelectedGame = GetGameById(msg.gameCode);
			if (SelectedGame != false && SelectedGame != null) {
				var PlayerIndex = GetPlayerByName(SelectedGame, msg.name);
				if (PlayerIndex !== false && PlayerIndex !== null) {
					console.log("Attempted to Add Player with name '" + msg.name + "' - However player already exists - Switching Socket...");
					SelectedGame.PlayerList[PlayerIndex].PlayerSocket = socket.id
					socket.emit("clientRes", {type: "playerResult", code: msg.gameCode, response: "Success!", PlayerID: SelectedGame.PlayerList.length.toString()});
				} else {
					console.log("Successfully Added Player with name '" + msg.name + "' and ID: '" + SelectedGame.PlayerList.length.toString() + "'.");
					var PlayerIP = generateIPv4();
					SelectedGame.PlayerList.push({UserID: SelectedGame.PlayerList.length.toString(), username: msg.name, status: "Online", ConnectedIP: "", AssocIP: PlayerIP, PlayerSocket: socket.id, UserIMG: ""});
					SelectedGame.AssignedIPs.push(PlayerIP);
					SelectedGame.CompData.push({hostname: (RemoveInvalidChars(msg.name).toString() + "'s Computer").toString(), ip: PlayerIP, owner: msg.name, SecLvl: 0, Data: [["system.bin", "#BINARYLARGE#"],["network.cfg", "#BINARY#"],["terminal.cfg", "#BINARY"],["gui.cfg", "#BINARY"],["PassCrack.exe", "#BINARYLARGE#"]], Whitelist: false, WhitelistSrv: "Ares Whitelister"});
					socket.emit("clientRes", {type: "playerResult", code: msg.gameCode, response: "Success!", PlayerID: SelectedGame.PlayerList.length.toString()});
					socket.to(SelectedGame.ServerSocket).emit("serverRes", {type: "addPlayer", code: msg.gameCode, playerName: msg.name});
				}
			}
		} else if (msg.type === "checkCode") {
			var SelectedGame = GetGameById(msg.code);
			if (SelectedGame !== false && SelectedGame !== null) {
				if (msg.playerName !== null && msg.playerName !== "undefined" && msg.playerName !== "null") {
					for (v=0; v < SelectedGame.PlayerList.length; v++) {
						if (SelectedGame.PlayerList[v].username == msg.playerName) {
							SelectedGame.PlayerList[v].PlayerSocket = socket.id;
							console.log("Updated players socket ID with name '" + msg.playerName + "' to '" + socket.id + "'");
							break;
						}
					}
				}
				socket.emit('clientRes', {type:"codeTest", code: msg.code, response: "Success!", gameStatus: SelectedGame.GameStatus, timeLeft: SelectedGame.TimeLeft});
			} else {
				socket.emit('clientRes', {type:"codeTest", code: msg.code, response: "Failure!", gameStatus: "No Game"});
			}
		} else if (msg.type == "playerLoaded") {
			var SelectedGame = GetGameById(msg.code);
			if (SelectedGame != false && SelectedGame != null) {
				var PlayerFound = false;
				/*for (z=0; z < SelectedGame.PlayersLoaded; z++) {
					if (SelectedGame.PlayersLoaded[z].UserID == msg.UserID) {
						PlayerFound = true;
						break;
					}
				}
				if (PlayerFound == false) {
					SelectedGame.PlayersLoaded.push({UserID: msg.UserID, status: "loaded"});
					console.log("Game: '" + msg.code + "' has loaded in " + SelectedGame.PlayersLoaded.length + "/" + SelectedGame.PlayerList.length);
				}*/
				SelectedGame.PlayersLoaded.push({playerID: msg.UserID, status: "loaded"});
				var SourcePlayer = GetPlayerByName(SelectedGame, msg.username);
				socket.to(SelectedGame.ServerSocket).emit("serverRes", {type: "logEvent", timeLeft: SelectedGame.TimeLeft, code: SelectedGame.GameID, msg: ("Player '" + SourcePlayer.username + "' has connected / reconnected to the game.").toString()});
				if (SelectedGame.PlayersLoaded.length >= SelectedGame.PlayerList.length) {
					console.log("All Players Loaded In! Starting Timers...");
					if (SelectedGame.PlayersLoaded.length == SelectedGame.PlayerList.length) {
						for (y=0; y < SelectedGame.PlayerList.length; y++) {
							if (SelectedGame.PlayerList[y].PlayerSocket == socket.id) {
								socket.emit('gameRes', {type:"timerStart", code: msg.code});
							} else {
								socket.to(SelectedGame.PlayerList[y].PlayerSocket).emit('gameRes', {type:"timerStart", code: msg.code});
							}
							console.log("Starting Player with SocketID: '" + SelectedGame.PlayerList[y].PlayerSocket + "' and Gamecode: " + msg.code);
						}
						console.log("Pinging final Start Timer to Server  -->  " + SelectedGame.ServerSocket);
						//var TargetIPs = PickThreeIPs(SelectedGame);
						var TargetIPs = [];
						socket.to(SelectedGame.ServerSocket).emit('gameRes', {type:"timerStart", code: msg.code, threeIPs: SelectedGame.AssignedIPs, gameTime: SelectedGame.TimeLeft});
						SelectedGame.GameStatus = "in-game";
					} else {
						socket.emit('gameRes', {type:"timerStart", code: msg.code});
					}
					/*
					for (z = 0; z < SelectedGame.PlayerList.length; z++) {
						socket.to((SelectedGame.PlayerList[z].PlayerSocket).toString()).emit('gameRes', {type:"timerStart", code: msg.gameCode});
						
						if (SelectedGame.PlayerList[z].PlayerSocket != socket.id) {
						} else {
							socket.emit('gameRes', {type:"timerStart", code: msg.code});
						}
					}*/
				}
			}
		}
	});
	
	socket.on("loginReq", function(msg) {
		/*console.log(msg);*/
		if (msg.type == "login") {
			var Username = RemoveInvalidChars(msg.username);
			var Password = RemoveInvalidChars(msg.password);
			
			var UserFound = false;
			for (i = 0; i < AccountDB.length; i++) {
				if (AccountDB[i].username == Username) {
					var FinalPass = Password + AccountDB[i].passwordSalt;
					var HashResult = crypto.createHmac('sha256', FinalPass.toString()).digest('hex');
					UserFound = true;
					if (HashResult == AccountDB[i].password) {
						socket.emit("loginRes", {type: "login", username: Username, image: AccountDB[i].imageSrc, response: "Success!"});
					} else {
						socket.emit("loginRes", {type: "login", username: Username, response: "Invalid Password!"});
					}
					break;
				}
			}
			if (UserFound != true) {
				socket.emit("loginRes", {type: "login", username: Username, response: "Account does not exist!"});
			}
		} else if (msg.type == "getImage") {
			if (msg.username !== null && msg.username !== "undefined") {
				var TargetUsername = RemoveInvalidChars(msg.username);
				var UserFound = false;
				for (i = 0; i < AccountDB.length; i++) {
					if (AccountDB[i].username == TargetUsername) {
						if (msg.source === null) {
							socket.emit("loginRes", {type: "imageRes", username: TargetUsername, imageSrc: AccountDB[i].imageSrc, response: "Success!"});
						} else {
							socket.emit("loginRes", {type: "imageRes", username: TargetUsername, imageSrc: AccountDB[i].imageSrc, response: "Success!", source: msg.source});
						}
						UserFound = true;
						break;
					}
				}
				if (UserFound === false) {
					socket.emit("loginRes", {type: "imageRes", username: TargetUsername, response: "Failure!"});	
				}
			}
		} else if (msg.type == "updatePass") {
			var Username = RemoveInvalidChars(msg.username);
			var Password = RemoveInvalidChars(msg.password);
			var NewPassword = RemoveInvalidChars(msg.newPass);
			
			var UserFound = false;
			for (i = 0; i < AccountDB.length; i++) {
				if (AccountDB[i].username == Username) {
					var FinalPass = Password + AccountDB[i].passwordSalt;
					var HashResult = crypto.createHmac('sha256', FinalPass.toString()).digest('hex');
					UserFound = true;
					if (HashResult == AccountDB[i].password) {
						//socket.emit("loginRes", {type: "login", username: Username, image: AccountDB[i].imageSrc, response: "Success!"});
						NewPassVal = crypto.createHmac('sha256', (NewPassword + AccountDB[i].passwordSalt).toString()).digest('hex');
						AccountDB[i].password = NewPassVal;
						socket.emit("loginRes", {type: "passUpdate", username: Username, response: "Password Updated Successfully!"});
					} else {
						socket.emit("loginRes", {type: "passUpdate", username: Username, response: "Old password was incorrect!"});
					}
					break;
				}
			}
		} else if (msg.type == "updateUser") {
			var Username = RemoveInvalidChars(msg.username);
			var Password = RemoveInvalidChars(msg.password);
			var NewUsername = RemoveInvalidChars(msg.newUser);
			
			var UserFound = false;
			for (i = 0; i < AccountDB.length; i++) {
				if (AccountDB[i].username == Username) {
					var FinalPass = Password + AccountDB[i].passwordSalt;
					var HashResult = crypto.createHmac('sha256', FinalPass.toString()).digest('hex');
					UserFound = true;
					if (HashResult == AccountDB[i].password) {
						//socket.emit("loginRes", {type: "login", username: Username, image: AccountDB[i].imageSrc, response: "Success!"});
						socket.emit("loginRes", {type: "passUpdate", username: Username, response: "Username Updated Successfully : \n'" + AccountDB[i].username + "'  --->  '" + NewUsername + "'"});
						AccountDB[i].username = NewUsername;
					} else {
						socket.emit("loginRes", {type: "passUpdate", username: Username, response: "Old password was incorrect!"});
					}
					break;
				}
			}
			
		} else if (msg.type == "updateEmail") {
			var Username = RemoveInvalidChars(msg.username);
			var Password = RemoveInvalidChars(msg.password);
			var NewEmail = RemoveInvalidChars(msg.newMail);
			
			for (i = 0; i < AccountDB.length; i++) {
				if (AccountDB[i].username == Username) {
					var FinalPass = Password + AccountDB[i].passwordSalt;
					var HashResult = crypto.createHmac('sha256', FinalPass.toString()).digest('hex');
					UserFound = true;
					if (HashResult == AccountDB[i].password) {
						//socket.emit("loginRes", {type: "login", username: Username, image: AccountDB[i].imageSrc, response: "Success!"});
						AccountDB[i].email = NewEmail;
						socket.emit("loginRes", {type: "emailUpdate", username: Username, response: "Email Updated Successfully!"});
					} else {
						socket.emit("loginRes", {type: "emailUpdate", username: Username, response: "Old password was incorrect!"});
					}
					break;
				}
			}
		} else if (msg.type == "setImage") {
			var TargetUsername = RemoveInvalidChars(msg.username);
			var TargetIMG = msg.targetImg;
			
			var UserFound = false;
			for (i = 0; i < AccountDB.length; i++) {
				if (AccountDB[i].username == TargetUsername) {
					AccountDB[i].imageSrc = TargetIMG;
					UserFound = true;
					break;
				}
			}
			if (UserFound == false) {
				socket.emit("loginRes", {type: "imageUpdate", username: TargetUsername, response: "Failure!"});
			} else {
				socket.emit("loginRes", {type: "imageUpdate", username: TargetUsername, response: "Success!"});
				console.log("Account with name '" + TargetUsername + "' assigned URL: " + TargetIMG);
			}
			
		} else if (msg.type == "register") {
			var generatedSalt = "";
			var saltChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

			for (var i = 0; i < 8; i++)
				generatedSalt += saltChars.charAt(Math.floor(Math.random() * saltChars.length));
			
			var Username = RemoveInvalidChars(msg.username);
			var Password = RemoveInvalidChars(msg.password);
			var Email = RemoveInvalidChars(msg.email);
			
			if (Username.length < 1) {
				socket.emit("loginRes", {type: "register", username: Username, response: "Creation Failure! Username blank"});
			} else if (Password.length < 4) {
				socket.emit("loginRes", {type: "register", username: Username, response: "Creation Failure! Password must be 4 or more characters!"});
			} else {
				var FinalPass = Password + generatedSalt;
				var HashedPass = crypto.createHmac('sha256', FinalPass.toString()).digest('hex');//shaModule.sha256(FinalPass);
				AccountDB.push({username: Username, password: HashedPass, email: Email, imageSrc: "assets/blank-person.png", passwordSalt: generatedSalt, imageSrc: null});
				socket.emit("loginRes", {type: "register", username: Username, response: "Success!"});
			}
		}
	});
	
	socket.on("musicReq", function(msg) {
		var SelectedGame = GetGameById(msg.gameCode);
		if (SelectedGame != false && SelectedGame != null) {
			console.log(SelectedGame);
			SelectedGame.CurrentTrack = PickRandomTrack(msg.genre);
			if (msg.type == "changeTrack") {
				clearInterval(SelectedGame.MusicTick);
				SelectedGame.MusicTick = null;
				SelectedGame.MusicTick = setInterval(function() {
					if (SelectedGame.GameStatus == "in-game") {
						SelectedGame.CurrentTrack = PickRandomTrack("chill");
					} else if (SelectedGame.GameStatus == "ended") {
						SelectedGame.CurrentTrack = PickRandomTrack("upbeat");
					} else {
						SelectedGame.CurrentTrack = PickRandomTrack("main-menu");
					}
				}, 150000);
				if (SelectedGame.MusicMode == "client-side") {
					for (let selectedPlayer of SelectedGame.PlayerList) {
						if (selectedPlayer.PlayerSocket != socket.id) {
							socket.to(selectedPlayer.PlayerSocket).emit("musicRes", {type:"playTrack", code: msg.gameCode, musicSrc: SelectedGame.CurrentTrack});
						} else {
							socket.emit("musicRes", {type:"playTrack", code: msg.gameCode, musicSrc: SelectedGame.CurrentTrack});
						}
					}
				} else {
					socket.to(SelectedGame.ServerSocket).emit("musicRes", {type:"playTrack", code: msg.gameCode, musicSrc: SelectedGame.CurrentTrack});
				}
			} else if (msg.type == "getTrack") {
				if (SelectedGame.MusicMode == "client-side") {
					if (socket.id !== SelectedGame.ServerSocket) {
						socket.emit("musicRes", {type: "playTrack", code: msg.gameCode, musicSrc: SelectedGame.CurrentTrack});
					}
				} else {
					if (socket.id == SelectedGame.ServerSocket) {
						socket.emit("musicRes", {type: "playTrack", code: msg.gameCode, musicSrc: SelectedGame.CurrentTrack});
					} /*else {
						socket.to(SelectedGame.ServerSocket).emit("musicRes", {type: "playTrack", code: msg.gameCode, musicSrc: SelectedGame.CurrentTrack});
					}*/
				}
			}
		}
	});
	socket.on('serverReq', function(msg) {
		console.log("serverReq: ");
		console.log(msg);
		if (msg.type == "createGame") {
			var gameSettings = msg.gameSettings;
			console.log("Game Generation Process Started!");
			var newGameCode = generateGameCode();
			console.log("Code Generated: " + newGameCode);
			if (gameSettings.musicMode == null || gameSettings.musicMode == "undefined") {
				gameSettings.musicMode = "client-side";
			}
			var GameObject = {GameID: newGameCode, PlayersLoaded: [], CurrentTrack: PickRandomTrack("chill"), ServerSocket: socket.id, AssignedIPs: [], CompData: [], PlayerList: [], GameStatus: "waiting", TimeLeft: (gameSettings.timer * 60), MusicTick: null, MusicMode: gameSettings.musicMode};
			var reassignCount = 0;
			console.log("IP Choice: " + gameSettings.ipType);
			for (x = 0; x < CompDatabase.length; x++) {
				var CurrentComputer = CompDatabase[x];
				if (gameSettings.ipType === "ipv4") {
					while (true) {
						CurrentComputer.ip = generateIPv4();
						if (GameObject.AssignedIPs.indexOf(CurrentComputer.ip) == -1) { break; }
					}
				} else if (gameSettings.ipType === "ipv6") {
					while (true) {
						CurrentComputer.ip = generateIPv6();
						if (GameObject.AssignedIPs.indexOf(CurrentComputer.ip) == -1) { break; }
					}
				} else {
					CurrentComputer.ip.replace("#RANDOMIP4#", generateIPv4()).replace("#RANDOMIP6#", generateIPv6()).replace("#RANDOMIP#", generateIPv4());
				} 
				reassignCount++;
				GameObject.AssignedIPs.push(CurrentComputer.ip);
				GameObject.CompData.push(CurrentComputer);
			}
			ActiveGames.push(GameObject);
			console.log("Game Creation Success! All data generated with 0 errors! - " + reassignCount.toString() + " IPs Reassigned!");
			GameObject.MusicTick = setInterval(function() {
				if (GameObject.GameStatus == "in-game") {
					GameObject.CurrentTrack = PickRandomTrack("chill");
				} else if (GameObject.GameStatus == "ended") {
					GameObject.CurrentTrack = PickRandomTrack("upbeat");
				} else {
					GameObject.CurrentTrack = PickRandomTrack("main-menu");
				}
			}, 180000);
			socket.emit('serverRes', {type:"creationResponse", Status: "Creation Success!", Code: newGameCode});
		}
		else if (msg.type === 'startGame') {
			// GRRRRRRRR... THIS HAS BEEN WORKING FINE FOR MONTHS
			console.log("STARTING GAME...!");
			var GameObject = GetGameById(msg.code);
			if (GameObject != false) {
				GameObject.GameStatus = "starting...";
				for (x = 0; x < GameObject.PlayerList.length; x++) {
					console.log("Triggering Player: " + GameObject.PlayerList[x].username + "  at socket  " + GameObject.PlayerList[x].PlayerSocket);
					socket.to(GameObject.PlayerList[x].PlayerSocket).emit("clientRes", {type: "gameStart", code: msg.code, gameLength: GameObject.TimeLeft});
				}
				socket.emit("serverRes", {type: "startGame", code: msg.code});
				console.log("Game Loading, with Duration:" + GameObject.TimeLeft.toString());
			}
		}
		else if (msg.type === "gameEnd") {
			var WinningPlayers = [];
			var EliminatedPlayers = [];
			var SelectedGame = GetGameById(msg.code);
			if (SelectedGame !== false && SelectedGame !== null) {
				console.log("Game with code: " + msg.code + " Game State Switched to 'Ended'!");
				for (x = 0; x < SelectedGame.PlayerList.length; x++) {
					if (SelectedGame.PlayerList[x].status === "online" || SelectedGame.PlayerList[x].status === "Online") {
						WinningPlayers.push(SelectedGame.PlayerList[x]);
						socket.to(SelectedGame.PlayerList[x].PlayerSocket).emit("gameRes", {type: "endGame", code: msg.code, result: "Survived!"});
					} else {
						EliminatedPlayers.push(SelectedGame.PlayerList[x]);
					}
				}
				socket.to(SelectedGame.ServerSocket).emit("serverRes", {type: "endGame", code: msg.code, winners: WinningPlayers, EliminatedNo: EliminatedPlayers.length});
				SelectedGame.GameStatus = "summary";
			//SelectedGame.GameStatus = "ended";
			}
		}
		else if (msg.type == "checkCode") {
			var SelectedGame = GetGameById(msg.code);
			if (SelectedGame != false && SelectedGame != null) {
				console.log("Socket Change: " + SelectedGame.ServerSocket + "  -->  " + socket.id);
				SelectedGame.ServerSocket = socket.id;
				socket.emit('serverRes', {type:"codeTest", code: msg.code, response: "Success!", playerObjects: SelectedGame.PlayerList, gameStatus: SelectedGame.GameStatus, GameLength: SelectedGame.TimeLeft});
				if (SelectedGame.GameStatus == 'in-game') {
					socket.emit('gameRes', {type: "timerStart", code: msg.code});
				}
			} else {
				socket.emit('serverRes', {type:"codeTest", code: msg.code, response: "Failure!", gameStatus: "No Game"});
			}
		}
	});
	
	socket.on('utilReq', function(msg) {
		if (msg.type === "getVersion") {
			socket.emit('utilRes', {type: "getVersion", versionNo: VersionNumber.toString()});
		}
	});
});

setInterval(function() {
	ExportAccountDB("Routine");
}, 7200000);

server.listen(4003, function() {
	console.log('CydeaOS Server Started Successfully!\nListening Started on Port 4003\nCydeaOS Launch Complete - Version: ' + VersionNumber);
    sql.createConnection(config.dbconf);
    //console.log(config.dbconf);
    console.log('SQL Connection Built.');
});


ImportAccountDB();

process.on('SIGTERM', function() {
	ExportAccountDB("Shutdown");
});