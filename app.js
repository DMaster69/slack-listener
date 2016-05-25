var RtmClient = require('@slack/client').RtmClient;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var MemoryDataStore = require('@slack/client').MemoryDataStore;

var token = process.env.SLACK_API_TOKEN || 'xoxp-13346603558-13350392466-13833830320-da062f28dd';

var rtm = new RtmClient(token, {
  logLevel: 'error', //debug
  dataStore: new MemoryDataStore(),
  autoReconnect: true,
  autoMark: true
});
rtm.start();

rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
	console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}, but not yet connected to a channel`);
});

rtm.on(RTM_EVENTS.MESSAGE, function (message) {

	if( message.type == 'message' ){
		
		var user_name 	 = getUserNameById( message.user );
		var channel_name = getChannelNameById( message.channel );
		var message_text = message.text;

		if(message_text === undefined) {
			if( message.hasOwnProperty("subtype") && message.subtype == "message_changed" ){
				message_text = `\nMESSAGE: ${message.previous_message.text}  \nCHANGED: ${message.message.text}`;
				user_name = getUserNameById(message.previous_message.user);
			}else if(message.hasOwnProperty("subtype") && message.subtype == "message_deleted"){
				message_text = `[DELETED] ${message.previous_message.text} -by ${getUserNameById(message.previous_message.user)}`;
				user_name = getUserNameById(message.previous_message.user);
			}else console.log(message);
		}

		message_text = replaceUsersTags(message_text);

		console.log(`[${channel_name}] - ${user_name} : ${message_text}`);
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
	var channel = rtm.dataStore.getChannelById(id);
	return (channel !== undefined) ? channel.name : 'private';
};

String.prototype.replaceAll = function(search, replacement) {
	var target = this;
	return target.replace(new RegExp(search, 'g'), replacement);
};
