const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs');
const { authenticateJWT } = require('./auth');
const { publishPlatformEvent } = require('./salesforce');

const execAsync = util.promisify(exec);

async function generateLoginUrl(username) {
    try {
        const { stdout } = await execAsync(
            `sf org open --target-org ${username} --url-only --json`
        );
        const loginUrlResult = JSON.parse(stdout);
        if (loginUrlResult.status === 0) {
            return loginUrlResult.result.url;
        } else {
            throw new Error(loginUrlResult.message);
        }
    } catch (error) {
        console.error('Error generating login URL:', error);
        throw error;
    }
}

async function createScratchOrg(cloneDir) {
    try {
        const conn = await authenticateJWT();

        const scratchDefPath = path.join(cloneDir, 'config', 'project-scratch-def.json');

        const { stdout } = await execAsync(
            `sf org create scratch --definition-file ${scratchDefPath} --duration-days 30 --alias MyScratchOrg --set-default --json`
        );

        const scratchOrgResult = JSON.parse(stdout);

        if (scratchOrgResult.status === 0) {
            const username = scratchOrgResult.result.username;
            const loginUrl = await generateLoginUrl(username);

            const result = {
                success: true,
                message: 'Scratch org created successfully',
                orgId: scratchOrgResult.result.orgId,
                username: username,
                loginUrl: loginUrl
            };

            await publishPlatformEvent(conn, {
                Org_Id__c: result.orgId,
                Username__c: result.username,
                Login_URL__c: result.loginUrl,
                Status__c: 'Created'
            });

            return result;
        } else {
            throw new Error(scratchOrgResult.message);
        }
    } catch (error) {
        console.error('Error creating scratch org:', error);
        throw error;
    }
}

async function executeOrgInitScript(cloneDir, conn, recordId, username) {
    const scriptPath = path.join(cloneDir, 'orgInit.sh');

    try {
        const scriptContent = await fs.promises.readFile(scriptPath, 'utf8');
        const commands = scriptContent.split('\n').filter(line => {
            const trimmedLine = line.trim();
            return trimmedLine !== '' && !trimmedLine.startsWith('#');
        });

        for (let i = 0; i < commands.length; i++) {
            let command = commands[i].trim();

            if (command.startsWith('sf ') && !command.includes('-o') && !command.includes('--target-org')) {
                command = `${command} --target-org ${username}`;
            }

            try {
                const { stdout, stderr } = await execAsync(command, { cwd: cloneDir });

                await publishPlatformEvent(conn, {
                    Scratch_Deployment__c: recordId,
                    Command__c: command,
                    Status__c: 'Completed',
                    Output__c: stdout,
                    Error__c: stderr
                });

                console.log(`Command executed successfully: ${command}`);
            } catch (error) {
                await publishPlatformEvent(conn, {
                    Scratch_Deployment__c: recordId,
                    Command__c: command,
                    Status__c: 'Error',
                    Error__c: error.message
                });

                console.error(`Error executing command: ${command}`, error);
                throw error;
            }
        }

        console.log('All valid commands in orgInit.sh executed successfully');

    } catch (error) {
        console.error('Error executing orgInit.sh script:', error);

        await conn.sobject('Scratch_Deployment__c').update({
            Id: recordId,
            Status__c: 'Error',
            Error_Message__c: `Error executing orgInit.sh: ${error.message}`
        });

        throw error;
    }
}

async function updateTransactionSecurityPolicies(cloneDir, username) {
    const policyDir = path.join(cloneDir, 'force-app', 'main', 'default', 'transactionSecurityPolicies');

    try {
        // Check if the directory exists
        if (!fs.existsSync(policyDir)) {
            console.log('No transaction security policies directory found. Skipping update.');
            return;
        }

        const files = await fs.promises.readdir(policyDir);

        if (files.length === 0) {
            console.log('No transaction security policy files found. Skipping update.');
            return;
        }

        let updatedCount = 0;
        for (const file of files) {
            if (file.endsWith('.transactionSecurityPolicy-meta.xml')) {
                const filePath = path.join(policyDir, file);
                let content = await fs.promises.readFile(filePath, 'utf8');

                content = content.replace(/<user>.*<\/user>/, `<user>${username}</user>`);
                content = content.replace(/<executionUser>.*<\/executionUser>/, `<executionUser>${username}</executionUser>`);

                await fs.promises.writeFile(filePath, content, 'utf8');
                console.log(`Updated ${file} with new username: ${username}`);
                updatedCount++;
            }
        }

        if (updatedCount === 0) {
            console.log('No transaction security policy files needed updating.');
        } else {
            console.log(`Updated ${updatedCount} transaction security policy files.`);
        }
    } catch (error) {
        console.error('Error updating Transaction Security Policy files:', error);
        // Instead of throwing, we'll log the error and continue
        console.log('Continuing despite error in updating Transaction Security Policies.');
    }
}


module.exports = { createScratchOrg, executeOrgInitScript, updateTransactionSecurityPolicies };
