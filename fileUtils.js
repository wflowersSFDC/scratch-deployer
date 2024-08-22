const fs = require('fs');
const path = require('path');

async function deleteFolderRecursive(folderPath) {
    if (fs.existsSync(folderPath)) {
        for (const entry of await fs.promises.readdir(folderPath)) {
            const curPath = path.join(folderPath, entry);
            if ((await fs.promises.lstat(curPath)).isDirectory()) {
                await deleteFolderRecursive(curPath);
            } else {
                await fs.promises.unlink(curPath);
            }
        }
        await fs.promises.rmdir(folderPath);
    }
}

module.exports = { deleteFolderRecursive };
