# DialogFlow example for Gitple

## How to execute

### 1. Prepare Gitple Bot Configuration

see https://github.com/gitple/gitple-bot-node

Put config.json file in the current directory.

### 2. Prepare https key and cert file.

Put key.pem and cert.pem file in the current directory.

### 3. Set up dialog-flow configration in the code

- At `DialogFlow console -> Fullfillment -> Webhook`, set URL and BASIC AUTH as the configration in the `app.js`:

app.js
```js
/*
 * Fullfillment Webhook configuration:
 *   - URL https://{_your_domain_}:{webhookPort}/{webhookPath
 *   - BASIC_AUTH {basicAuth.id} {basicAuth.password}
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
```

### 3. Set up authentication with a service account 

https://cloud.google.com/docs/authentication/getting-started

Download the json file and set it as an environment variable:
```
export GOOGLE_APPLICATION_CREDENTIALS="{your_service_account_credential}.json"
```

### 4. Execute

```
npm install
node app.js
```

## How it works

### dialogflow-agent/
- The backup of this example from Dialogflow console.

### app.js : 
- the following intents are implemet in the webhook handler - `webhookHandler` function
  - `end.conv` : Handling termination request for this bot instance.
  - `connect.agent - yes` : Handling transfer from this bot instance to the available agent.
  - `ask.bitcoinprice` : example intent which returns bitcoin price. You can replace this for your own intents.

### dialogFlowLib : 

```
let dialogFlowLib = require('./dialogFlowLib');
```

Available functions are:

#### init(options) : void
- initialize before use.
- Parameters:
  - options:

```
{
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
```
- Return: void

#### getSessionInfo (sessionId) : SessionInfo
  
- Parameters:
  - sessionId: Dialogflow's session id. `_.last(agent.session.split('/'))`
- Return: 
  - SessionInfo
    - client: the instance of Dialogflow session client
    - path: full path of session
    - user: user info using this bot instance.
    - gitpleBot: the matching gitple Bot instace.
    
## reference

### Dialogflow: Node.js Client

https://github.com/googleapis/nodejs-dialogflow

### Dialogflow Fulfillment Library

https://cloud.google.com/nodejs/docs/reference/dialogflow/0.8.x/v2.SessionsClient
