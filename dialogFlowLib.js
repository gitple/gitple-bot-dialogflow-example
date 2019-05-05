/*
 * Copyright 2017 Gitple Inc.
 */
'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');
const https = require('https');
const gitpleBot = require("gitple-bot");
const _ = require('lodash');
const request = require('request');
const express = require('express');
const bodyParser = require('body-parser');
const basicAuth = require('express-basic-auth');
const app = express();
const dialogflow = require('dialogflow');
const uuid = require('uuid');
// const async = require('async');
const botMgrConfig = require('./config.json');
let dialogFlowSessions = {};
let PROJECT_ID;
function getSessionInfo(sessionId) {
    return dialogFlowSessions[sessionId];
}
exports.getSessionInfo = getSessionInfo;
function init(options, cb) {
    let whPort = options && options.webhookPort;
    let whPath = options && options.webhookPath;
    let whHandler = options && options.webhookHandler;
    let whCertPath = options && options.certificatePath;
    let whKeyPath = options && options.privateKeyPath;
    let whBasicAuth = options && options.BasicAuth;
    PROJECT_ID = options && options.projectId;
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    //app.get('/', (req, res) => res.send('OK'));
    app.post(whPath, whHandler);
    if (whBasicAuth && whBasicAuth.id && whBasicAuth.password) {
        let users = {};
        users[whBasicAuth.id] = whBasicAuth.password;
        app.use(basicAuth(users));
    }
    if (whKeyPath && whCertPath) {
        let httpsServer = https.createServer({
            key: fs.readFileSync(whKeyPath, 'utf8'),
            cert: fs.readFileSync(whCertPath, 'utf8')
        }, app);
        // post WELCOME event with login info
        httpsServer.listen(whPort, () => console.log(`webhook listening HTTPS on port ${whPort}!`));
    }
    else {
        app.listen(whPort, () => console.log(`webhook listening HTTP on port ${whPort}!`));
    }
    return cb && cb();
}
exports.init = init;
// [Start] Bot ---------------------------------------------------------------------
let botMgr = new gitpleBot.BotManager(botMgrConfig);
// on bot start
botMgr.on('start', (botConfig, done) => {
    let gpBot = new gitpleBot.Bot(botMgr, botConfig, {
        dialogFlowSessionId: uuid.v4(),
    });
    if (!gpBot || !botConfig || !botConfig.context) {
        return;
    }
    let botId = _.get(botConfig, 'id');
    let sessionId = _.get(botConfig, 'context.session');
    console.log(`(${sessionId}) [botMgr] start bot ${botId}. sessionId: ${sessionId}, user identifier: ${_.get(gpBot, 'config.user.identifier')}`);
    gpBot.on('message', handleBotMessage);
    gpBot.sendKeyInEvent();
    startChat(gpBot); //FIXME: wait?
    // Ignore
    return done && done();
});
// on bot end
botMgr.on('end', (botId, done) => {
    let gpBot = botMgr.getBot(botId);
    if (!gpBot || !gpBot.config) {
        return;
    }
    let sessionId = gpBot && _.get(gpBot.config, 'context.session');
    let identifier = gpBot && _.get(gpBot.config, 'user.identifier');
    console.log(`(${sessionId}) [botMgr] end bot ${gpBot.id}. sessionId: ${sessionId}, user identifier: ${identifier}`);
    if (gpBot) {
        gpBot.finalize();
    }
    // Ignore
    return done && done();
});
// on bot recovery from stored info
botMgr.on('recovery', (botRecovery) => {
    // Ignore
});
botMgr.on('timeout', (botId) => {
    // Ignore
});
botMgr.on('ready', () => {
    console.info('[botMgr] ready');
});
botMgr.on('error', (err) => {
    console.error('[botMgr] error', err);
});
botMgr.on('connect', () => {
    console.info('[botMgr] connect');
});
botMgr.on('reconnect', () => {
    console.info('[botMgr] reconnect');
});
botMgr.on('disconnect', () => {
    console.info('[botMgr] disconnect');
});
// [END] Bot ---------------------------------------------------------------------
function startChat(gpBot) {
    return __awaiter(this, void 0, void 0, function* () {
        // A unique identifier for the given session
        const sessionId = gpBot.state.dialogFlowSessionId;
        let user = gpBot.config.user;
        // Create a new session
        const sessionClient = new dialogflow.SessionsClient();
        const sessionPath = sessionClient.sessionPath(PROJECT_ID, sessionId);
        // save session
        dialogFlowSessions[sessionId] = { client: sessionClient, path: sessionPath, gitpleBot: gpBot, user: user };
        // The text query request.
        const request = {
            session: sessionPath,
            queryInput: {
                event: { name: 'WELCOME', languageCode: 'ko', },
            },
        };
        // Send request and log result
        sessionClient.detectIntent(request)
            .then((responses) => {
            let result = responses[0].queryResult;
            console.log(`[startChat] - ${sessionId} - ${user.identifier || user.id} \n  Query: ${result.queryText}`);
            console.log(`  Response: ${result.fulfillmentText}`);
            if (result.intent) {
                console.log(`  Intent: ${result.intent.displayName}`);
            }
            else {
                console.log(`  No intent matched.`);
            }
            if (gpBot && result.fulfillmentText) {
                gpBot.sendMessage(result.fulfillmentText);
            }
        })
            .catch((err) => {
            console.error('detectIntent Err', err);
        });
    });
}
function handleBotMessage(inputMessage) {
    /* jshint validthis: true */
    let gpBot = this;
    if (_.isNil(inputMessage)) {
        return;
    }
    let sessionId = _.get(gpBot, 'state.dialogFlowSessionId');
    let dfSessionInfo = dialogFlowSessions[sessionId];
    if (_.isEmpty(dfSessionInfo)) {
        console.error('NOT_FOUND: dfSessionInfo');
        return;
    }
    let userId = dfSessionInfo.user && (dfSessionInfo.user.identifier || dfSessionInfo.user.id);
    // The text query request.
    const request = {
        session: dfSessionInfo.path,
        queryInput: {
            text: { text: inputMessage, languageCode: 'ko', },
        }
    };
    dfSessionInfo.client.detectIntent(request)
        .then((responses) => {
        let result = responses[0].queryResult;
        console.log(`[handleBotMessage] - ${sessionId} - ${userId}\n  Query: ${result.queryText}`);
        console.log(`  Response: ${result.fulfillmentText}`);
        if (result.intent) {
            console.log(`  Intent: ${result.intent.displayName}`);
        }
        else {
            console.log(`  No intent matched.`);
        }
        if (gpBot && result.fulfillmentText) {
            gpBot.sendMessage(result.fulfillmentText);
        }
    })
        .catch((err) => {
        console.error(`[handleBotMessage] - ${sessionId} - ${userId}\n  detectIntent Err`, err);
    });
}
