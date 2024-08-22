const express = require('express');
const { authenticateJWT } = require('./auth');
const { createScratchDeploymentRecord } = require('./salesforce');
const scratchOrgQueue = require('./queue');
const { cloneRepository } = require('./git');
const { executeOrgInitScript, updateTransactionSecurityPolicies } = require('./scratchOrg');
const { deleteFolderRecursive } = require('./fileUtils');

const router = express.Router();

router.post('/create', async (req, res) => {
    try {
        const { repoUrl } = req.body;

        if (!repoUrl) {
            return res.status(400).json({
                success: false,
                message: 'GitHub repository URL is required'
            });
        }

        const conn = await authenticateJWT();
        const recordId = await createScratchDeploymentRecord(conn);

        res.json({
            success: true,
            message: 'Scratch org creation request received and is being processed',
            recordId: recordId
        });

        // Clone the repository first
        const cloneDir = await cloneRepository(repoUrl, recordId);

        scratchOrgQueue.queueScratchOrgCreation(cloneDir)
            .then(async (result) => {
                console.log('Scratch org created:', result);

                // Update the Scratch_Deployment__c record with initial results
                await conn.sobject('Scratch_Deployment__c').update({
                    Id: recordId,
                    Status__c: 'In Progress',
                    Org_Id__c: result.orgId,
                    Username__c: result.username,
                    Login_URL__c: result.loginUrl,
                    GitHub_Template_URL__c: repoUrl
                });

                // Update Transaction Security Policy files
                await updateTransactionSecurityPolicies(cloneDir, result.username);

                // Execute orgInit script
                await executeOrgInitScript(cloneDir, conn, recordId, result.username);

                // Update status to 'Created' after successful execution of all commands
                await conn.sobject('Scratch_Deployment__c').update({
                    Id: recordId,
                    Status__c: 'Created'
                });
            })
            .catch(async (error) => {
                console.error('Error in scratch org creation process:', error);

                await conn.sobject('Scratch_Deployment__c').update({
                    Id: recordId,
                    Status__c: 'Error',
                    Error_Message__c: error.message
                });
            })
            .finally(async () => {
                // Clean up cloned repository
                await deleteFolderRecursive(cloneDir);
            });
    } catch (error) {
        console.error('Error in /create endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while processing your request',
            error: error.message
        });
    }
});

module.exports = router;