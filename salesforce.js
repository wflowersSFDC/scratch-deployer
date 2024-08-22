const jsforce = require('jsforce');

async function createScratchDeploymentRecord(conn) {
    try {
        const result = await conn.sobject('Scratch_Deployment__c').create({
            Status__c: 'Queued',
        });

        if (result.success) {
            console.log('Scratch_Deployment__c record created with Id:', result.id);
            return result.id;
        } else {
            throw new Error('Failed to create Scratch_Deployment__c record');
        }
    } catch (error) {
        console.error('Error creating Scratch_Deployment__c record:', error);
        throw error;
    }
}

async function publishPlatformEvent(conn, eventData) {
    try {
        const eventApiName = 'Scratch_Deployment_Update__e';
        const eventPayload = {
            ...eventData,
            Status__c: 'Created'
        };
        const result = await conn.sobject(eventApiName).create(eventPayload);
        console.log('Platform Event published successfully:', result);
        return result;
    } catch (error) {
        console.error('Error publishing Platform Event:', error);
        throw error;
    }
}

module.exports = { createScratchDeploymentRecord, publishPlatformEvent };
