const { createScratchOrg } = require('./scratchOrg');

class ScratchOrgQueue {
    constructor() {
        this.queue = [];
        this.maxConcurrentCreations = 5;
        this.runningCreations = 0;
    }

    queueScratchOrgCreation(cloneDir) {
        return new Promise((resolve, reject) => {
            this.queue.push({ resolve, reject, cloneDir });
            this.processQueue();
        });
    }

    processQueue() {
        while (this.runningCreations < this.maxConcurrentCreations && this.queue.length > 0) {
            const { resolve, reject, cloneDir } = this.queue.shift();
            this.runningCreations++;

            createScratchOrg(cloneDir)
                .then(result => {
                    this.runningCreations--;
                    resolve(result);
                    this.processQueue();
                })
                .catch(error => {
                    this.runningCreations--;
                    reject(error);
                    this.processQueue();
                });
        }
    }
}

module.exports = new ScratchOrgQueue();
