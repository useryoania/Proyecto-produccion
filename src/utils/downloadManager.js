// src/utils/downloadManager.js

class DownloadManager {
    constructor() {
        this.listeners = [];
        this.state = {
            isActive: false,
            phase: 'idle', // 'idle' | 'downloading' | 'processing' | 'done' | 'error'
            taskName: '',
            bytesDownloaded: 0,
            totalBytes: 0,
            currentFile: 0,
            totalFiles: 0,
            errorMsg: '',
            subTaskName: ''
        };
    }

    subscribe(listener) {
        this.listeners.push(listener);
        listener(this.state);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        for (const listener of this.listeners) {
            listener({ ...this.state });
        }
    }

    start(taskName) {
        this.state = {
            isActive: true,
            phase: 'downloading',
            taskName,
            bytesDownloaded: 0,
            totalBytes: 0,
            currentFile: 0,
            totalFiles: 0,
            errorMsg: '',
            subTaskName: ''
        };
        this.notify();
    }

    updateDownloadProgress(bytesDownloaded, totalBytes) {
        this.state.bytesDownloaded = bytesDownloaded;
        this.state.totalBytes = totalBytes || 0;
        this.notify();
    }

    startProcessing(totalFiles) {
        this.state.phase = 'processing';
        this.state.totalFiles = totalFiles;
        this.state.currentFile = 0;
        this.notify();
    }

    updateProcessingProgress(currentFile) {
        this.state.currentFile = currentFile;
        this.notify();
    }

    updateSubTask(subTaskName) {
        this.state.subTaskName = subTaskName;
        this.notify();
    }

    finish() {
        this.state.phase = 'done';
        this.notify();
        
        // Auto hide after 3 seconds
        setTimeout(() => {
            if (this.state.phase === 'done') {
                this.state.isActive = false;
                this.notify();
            }
        }, 3000);
    }

    error(msg) {
        this.state.phase = 'error';
        this.state.errorMsg = msg;
        this.notify();

        // Auto hide after 5 seconds
        setTimeout(() => {
            if (this.state.phase === 'error') {
                this.state.isActive = false;
                this.notify();
            }
        }, 5000);
    }

    close() {
        this.state.isActive = false;
        this.notify();
    }
}

export const downloadManager = new DownloadManager();
