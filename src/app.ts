/*
 * Copyright 2017 Gitple Inc.
 */

/* tslint:disable:no-unused-expression */

'use strict';
import * as _ from 'lodash';
import * as rp from 'request-promise';

import * as gitpleDialogFlowLib from './dialogFlowLib';
const { WebhookClient } = require('dialogflow-fulfillment');
const process = require('process');

/*
 * Fullfillment Webhook configuration:
 *   - URL https://{_your_domain_}:{webhookPort}/{webhookPath
 *   - BASIC_AUTH {basicAuth.id} {basicAuth.password}
 *
*/
const dialogFlowOptions = {
  webhookHandler: webhookHandler, // webhook handler
  webhookPort: 443,               // webhook port, default https(443)
  webhookPath: '/gitple_example', // webhook path
  projectId: 'gitple-example',    // project id
  certificatePath: 'cert.pem',    // path to https cert
  privateKeyPath: 'key.pem',      // path to https key
  basicAuth: {
    id: 'your_id',                // basic auth id
    password: 'your_secret'       // basic auth password
  }
};

gitpleDialogFlowLib.init(dialogFlowOptions);

// dialog-flow webhook
function webhookHandler(request: any, response: any) {

  const agent = new WebhookClient({ request, response });

  let sessionId = agent.session && _.last(agent.session.split('/'));
  let sessionInfo = gitpleDialogFlowLib.getSessionInfo(sessionId);
  let userId = _.get(sessionInfo, 'user.identifier') || _.get(sessionInfo, 'user.id');
  let gitpleBot = (sessionInfo && sessionInfo.gitpleBot);

  //console.log(JSON.stringify(request.body, null, 2));
  console.log(`[webhookHandler] - session:${sessionId} - user:${userId}`);
  console.log(`  Query: ${agent.query}`);
  console.log(`  Intent: ${agent.intent}`);

  // end conversation with bot
  function endConv(agent: any) {
    agent.add(''); // use dialogflow console message;
    gitpleBot && gitpleBot.sendCommand('botEnd');
  }
  // transfer from bot to agent
  function connectAgentYes(agent: any) {
    agent.add(''); // use dialogflow console message;
    gitpleBot && gitpleBot.sendCommand('transferToAgent');
  }
  // example: get bitcoin price per your currency
  function askBitcoinPrice(agent: any) {
    gitpleBot && gitpleBot.sendKeyInEvent();

    let currency = agent.parameters.currency || 'KRW';

    return rp({ url: 'https://blockchain.info/de/ticker', json: true })
    .then((body: any) => {
      let result = body[currency] || body.KRW;
      agent.add(`비트코인 현재 가격은 ${result.symbol} ${result.last} 입니다`);
    })
    .catch((reason: any) => {
      agent.add('잠시 후 다시 이용해 주세요');
    });
  }

  let intentMap = new Map(); // Map functions to Dialogflow intent names
  intentMap.set('end.conv', endConv);
  intentMap.set('connect.agent - yes', connectAgentYes);
  intentMap.set('ask.bitcoinprice', askBitcoinPrice);
  agent.handleRequest(intentMap);
}
