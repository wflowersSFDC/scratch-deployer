const jsforce = require('jsforce');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

function getPrivateKey() {
    if (process.env.SF_PRIVATE_KEY) {
        return process.env.SF_PRIVATE_KEY.replace(/\\n/g, '\n');
    } else {
        const keyPath = process.env.SF_PRIVATE_KEY_PATH;
        return fs.readFileSync(path.resolve(keyPath), 'utf8');
    }
}

async function authenticateJWT() {
    const privateKey = getPrivateKey();
    const conn = new jsforce.Connection({
        loginUrl: process.env.SF_LOGIN_URL
    });

    const claim = {
        iss: process.env.SF_CLIENT_ID,
        aud: process.env.SF_LOGIN_URL,
        sub: process.env.SF_USERNAME,
        exp: Math.floor(Date.now() / 1000) + 3 * 60
    };

    const bearerToken = jwt.sign(claim, privateKey, { algorithm: 'RS256' });

    try {
        const userInfo = await conn.authorize({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: bearerToken
        });

        console.log('Authentication successful');
        console.log('Access Token:', conn.accessToken);
        console.log('Instance URL:', conn.instanceUrl);
        console.log('User ID:', userInfo.id);
        console.log('Org ID:', userInfo.organizationId);

        return conn;
    } catch (error) {
        console.error('Authentication error:', error);
        throw error;
    }
}

module.exports = { authenticateJWT };
