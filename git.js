const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs');
const { deleteFolderRecursive } = require('./fileUtils');

const execAsync = util.promisify(exec);

async function cloneRepository(repoUrl, recordId) {
    let cloneDir;
    try {
        cloneDir = path.join(process.cwd(), recordId);
        await fs.promises.mkdir(cloneDir, { recursive: true });

        const { stdout, stderr } = await execAsync(`git clone ${repoUrl} ${cloneDir}`);
        console.log(`Repository cloned successfully into ${cloneDir}:`, stdout);
        if (stderr) {
            console.warn('Clone operation warnings:', stderr);
        }

        return cloneDir;
    } catch (error) {
        console.error('Error cloning repository:', error);
        if (cloneDir) {
            await deleteFolderRecursive(cloneDir);
        }
        throw error;
    }
}

module.exports = { cloneRepository };
