var colors 			= require('colors');

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

var RtmClient 		= require('@slack/client').RtmClient,
	CLIENT_EVENTS 	= require('@slack/client').CLIENT_EVENTS,
	RTM_EVENTS 		= require('@slack/client').RTM_EVENTS,
	MemoryDataStore = require('@slack/client').MemoryDataStore;

var token = process.env.SLACK_API_TOKEN || '';

var rtm = new RtmClient(token, {
  logLevel: 'info', //debug
  dataStore: new MemoryDataStore(),
  autoReconnect: true,
  autoMark: true
});
rtm.start();

rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
	console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}, but not yet connected to a channel`);
	senderMessage();
});

rtm.on(RTM_EVENTS.MESSAGE, function (message) {

	if( message.type == 'message' ){
		
		var user_name 	 = getUserNameById( message.user );
		var channel_name = getChannelNameById( message.channel );
		var message_text = message.text;

		if( ignoredChannels.indexOf( channel_name ) == -1 && user_name !== 'bot'){

			if(message_text === undefined) {
				if( message.hasOwnProperty("subtype") && message.subtype == "message_changed" ){
					message_text = `\nMESSAGE: ${message.previous_message.text}  \nCHANGED: ${message.message.text}`;
					user_name = getUserNameById(message.previous_message.user);
				}else if(message.hasOwnProperty("subtype") && message.subtype == "message_deleted"){
					message_text = `[DELETED] ${message.previous_message.text}`;
					user_name = getUserNameById(message.previous_message.user);
				}else if(message.hasOwnProperty("subtype") && message.subtype == "bot_message"){
					message_text = `[TWITTER] ${message.attachments[0].text}`;
					user_name = '[bot]';
				}else console.log(message);
			}

			message_text = replaceUsersTags(message_text);
			console.log(`[${channel_name}] - ${user_name} : ${message_text}`);
			//console.log("[" + channel_name + "]".green + " - " + user_name +" : " + message_text);
		}
	}else{
		console.log(message);
	}
	
});

const regexTags = /<@(.{9})>/g;
const getMatches = function (string, regex, index) {
	index || (index = 1); // default to the first capturing group
	var matches = [];
	var match;
	while (match = regex.exec(string)) {
		matches.push(match[index]);
	}
	return matches;
};

const replaceUsersTags = function(message){
	var matches = getMatches(message, regexTags, 1);
	matches.forEach(function(element){
		var tagged_name = getUserNameById(element);
		message = message.replaceAll('<@' + element + '>', tagged_name);
	});
	return message;
};

const getUserNameById = function(id){
	var user = rtm.dataStore.getUserById(id);
	return (user !== undefined) ? user.name : ' [bot] ';
};

const getChannelNameById = function(id){
	var channel = rtm.dataStore.getChannelGroupOrDMById(id);
	return (channel.hasOwnProperty("name"))? channel.name : 'private';
};

const getChannelIdByName = function(name){
	var channel = rtm.dataStore.getChannelOrGroupByName(name);
	return (channel !== undefined && channel.hasOwnProperty("id"))? channel.id : (getUserIdByName(name) != null) ? getUserIdByName(name) :'C0DAADCHF';//default general
};

const getUserIdByName = function(name){
	try {
		var user = rtm.dataStore.getDMByName(name);
	} catch (error) {
		
	}
	return (user != undefined && user.hasOwnProperty("id")) ? user.id : null;
}

String.prototype.replaceAll = function(search, replacement) {
	var target = this;
	return target.replace(new RegExp(search, 'g'), replacement);
};

const ignoredChannels = ['rss', 'ofertas-laborales'];


//Sender
const senderMessage = function(){
	rl.question('', (answer) => {

		var index 			= answer.indexOf('->');
		var channel_name 	= answer.substr( 0, index );
		var message 		= answer.substr( index + 2 );
		var channel_id 		= getChannelIdByName(channel_name) || 'C0DAADCHF';
		
		rtm.sendMessage(message, channel_id, function messageSent(err, sended) {
		    if (err !== null) console.log(err);
		});

		senderMessage();
	});
}
