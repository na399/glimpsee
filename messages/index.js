"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var azure = require('azure-storage');
var path = require('path');

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});




var DocumentDBClient = require('documentdb').DocumentClient
    , fs = require('fs')
    , async = require('async')
    , databaseId = 'afws'
    , collectionId = 'features'
    , dbLink = 'dbs/' + databaseId
    , collLink = dbLink + '/colls/' + collectionId;


var host = 'https://glimpsee.documents.azure.com';
var DB_MASTERKEY = process.env.DB_MASTERKEY;


// Establish a new instance of the DocumentDBClient to be used throughout this bot
var client = new DocumentDBClient( host, { masterKey: DB_MASTERKEY });



var bot = new builder.UniversalBot(connector);
bot.localePath(path.join(__dirname, './locale'));


// Anytime the major version is incremented any existing conversations will be restarted.
bot.use(builder.Middleware.dialogVersion({ version: 0.4, message: 'Update found! Resett initiated!', resetCommand: /^reset/i }));

// End Conversation with 'goodbye'
bot.endConversationAction('Bye!', { matches: /^goodbye/i });

// Waterfall conversation
bot.dialog('/', [
    // WELCOME & ASK NAME
    function (session) {
        session.sendTyping();
        setTimeout(function () {
            session.send("Hi! This is GlimpSeeBot speaking. :D");
        }, 10);
        setTimeout(function () {
            session.beginDialog('/platform');
        }, 20);
    }
]);


bot.dialog('/platform',[
    function (session) {
        builder.Prompts.choice(session,
            "Which platform?",
            ["Web", "FB", "SLACK"]
        );
    },

    function (session, results) {

        session.userData.platform = results.response.entity;

        session.beginDialog('/options');
    }
]);




bot.dialog('/options',[
    function (session) {
        builder.Prompts.choice(session,
            "What would you like to GlimpSee?",
            ["Emotions", "Tags", "Colours"]
        );
    },

    function (session, results) {
        if (results.response.entity == "Emotions") {
            session.beginDialog('/emotions');
        } else if (results.response.entity == "Tags") {
            session.beginDialog('/tags');
        } else if (results.response.entity == "Colours") {
            session.beginDialog('/colours');
        }
    }
]);

bot.dialog('/emotions',[
    function (session) {
        builder.Prompts.choice(session,
            "Emotion?",
            ["happiness", "surprise", "neutral", "contempt"]
        );
    },

    function (session, results) {

            var querySpec = {
                query: 'SELECT f.url FROM f JOIN face IN f.faceResults WHERE face.faceAttributes.emotion.' + results.response.entity + '> 0.9',
            };

            client.queryDocuments(collLink, querySpec).toArray(function (err, qresults) {


                var resultsLen = qresults.length;

                if (err || resultsLen == 0){
                    session.send("not found");
                    session.beginDialog('/options');
                } else {

                    var msg = new builder.Message(session);
                    msg.attachmentLayout(builder.AttachmentLayout.carousel);

                    var images = [];

                    var i = 0;

                    while (i < 10 && i < resultsLen) {
                        images.push(new builder.HeroCard(session)
                            .images([builder.CardImage.create(session, qresults[i]['url'])]));
                        i++;
                    };

                    msg.attachments(images);
                    session.send(msg);
                    session.beginDialog('/options');
                }

            });

    }
]);


bot.dialog('/tags',[
    function (session) {
        builder.Prompts.text(session, "Which tag do you want to GlimpSee? e.g. crowd");
    },

    function (session, results) {

        var querySpec = {
            query: 'SELECT f.url FROM f JOIN tag IN f.tags WHERE tag.name = "' + results.response + '"',
        };


        client.queryDocuments(collLink, querySpec).toArray(function (err, qresults) {

            var resultsLen = qresults.length;


            if (err || resultsLen == 0){
                session.send("not found");
                session.beginDialog('/options');
            } else {


                if (session.userData.platform == "Web"){

                    var msg = new builder.Message(session);
                    msg.attachmentLayout(builder.AttachmentLayout.carousel);

                    var images = [];

                    var i = 0;

                    while (i < 10 && i < resultsLen) {
                        images.push(new builder.HeroCard(session)
                            .images([builder.CardImage.create(session, qresults[i]['url'])]));
                        i++;
                    };

                    msg.attachments(images);
                    session.send(msg);
                    session.beginDialog('/options');

                } else {


                    var i = 0;

                    while (i < 10 && i < resultsLen) {

                        session.send({
                            attachments: [
                                {
                                    contentType: "image/jpeg",
                                    contentUrl: qresults[i]['url']
                                }
                            ]
                        });

                        i++;

                    };

                    session.beginDialog('/options');

                }



            }

        });

    }
]);


bot.dialog('/colours',[
    function (session) {
        builder.Prompts.text(session, "Which color do you want to GlimpSee? e.g. Pink");
    },

    function (session, results) {

        var querySpec = {
            query: 'SELECT f.url FROM f WHERE f.color.dominantColorBackground = "' + results.response + '"',
        };


        client.queryDocuments(collLink, querySpec).toArray(function (err, qresults) {

            var resultsLen = qresults.length;


            if (err || resultsLen == 0){
                session.send("not found");
                session.beginDialog('/options');
            } else {


                if (session.userData.platform == "Web"){

                    var msg = new builder.Message(session);
                    msg.attachmentLayout(builder.AttachmentLayout.carousel);

                    var images = [];

                    var i = 0;

                    while (i < 10 && i < resultsLen) {
                        images.push(new builder.HeroCard(session)
                            .images([builder.CardImage.create(session, qresults[i]['url'])]));
                        i++;
                    };

                    msg.attachments(images);
                    session.send(msg);
                    session.beginDialog('/options');

                } else {


                    var i = 0;

                    while (i < 10 && i < resultsLen) {

                        session.send({
                            attachments: [
                                {
                                    contentType: "image/jpeg",
                                    contentUrl: qresults[i]['url']
                                }
                            ]
                        });

                        i++;

                    };

                    session.beginDialog('/options');

                }



            }

        });

    }
]);

if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpoint at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());    
} else {
    module.exports = { default: connector.listen() }
}



