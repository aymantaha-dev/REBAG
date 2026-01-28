// REBAG Frontend Application
document.addEventListener('DOMContentLoaded', () => {
    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            
            // Update buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update contents
            tabContents.forEach(content => content.classList.add('hidden'));
            document.getElementById(`${tab}-tab`).classList.remove('hidden');
            
            // Reset previews when switching tabs
            clearImagePreview();
            clearVideoPreview();
        });
    });
    
    // Image upload
    const imageInput = document.getElementById('image-input');
    const imagePreview = document.getElementById('image-preview');
    const imageUploadArea = document.getElementById('image-upload-area');
    const processImageBtn = document.getElementById('process-image');
    
    setupFileUpload(imageInput, imageUploadArea, (file) => {
        const url = URL.createObjectURL(file);
        imagePreview.src = url;
        document.querySelector('#image-tab .preview-container').classList.remove('hidden');
        processImageBtn.disabled = false;
    });
    
    // Video upload
    const videoInput = document.getElementById('video-input');
    const videoPreview = document.getElementById('video-preview');
    const videoUploadArea = document.getElementById('video-upload-area');
    const processVideoBtn = document.getElementById('process-video');
    
    setupFileUpload(videoInput, videoUploadArea, (file) => {
        const url = URL.createObjectURL(file);
        videoPreview.src = url;
        document.querySelector('#video-tab .preview-container').classList.remove('hidden');
        processVideoBtn.disabled = false;
    });
    
    // Process image
    processImageBtn.addEventListener('click', () => {
        const file = imageInput.files[0];
        if (!file) return;
        processFile('image', file);
    });
    
    // Process video
    processVideoBtn.addEventListener('click', () => {
        const file = videoInput.files[0];
        if (!file) return;
        processFile('video', file);
    });
});

// File upload setup with drag & drop
function setupFileUpload(input, dropArea, onFileSelect) {
    // Click to browse
    input.addEventListener('change', () => {
        if (input.files.length > 0) onFileSelect(input.files[0]);
    });
    
    // Drag & drop
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('drag-over');
    });
    
    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('drag-over');
    });
    
    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            input.files = e.dataTransfer.files;
            onFileSelect(e.dataTransfer.files[0]);
        }
    });
}

// Clear previews
function clearImagePreview() {
    document.getElementById('image-preview').src = '';
    document.querySelector('#image-tab .preview-container').classList.add('hidden');
    document.getElementById('image-input').value = '';
    document.getElementById('process-image').disabled = true;
}

function clearVideoPreview() {
    document.getElementById('video-preview').src = '';
    document.querySelector('#video-tab .preview-container').classList.add('hidden');
    document.getElementById('video-input').value = '';
    document.getElementById('process-video').disabled = true;
}

// Process file (image or video)
async function processFile(type, file) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Show progress section
    document.querySelector('.upload-section').classList.add('hidden');
    document.querySelector('.progress-section').classList.remove('hidden');
    document.querySelector('.result-section').classList.add('hidden');
    
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const jobIdElem = document.getElementById('job-id');
    const jobStatusElem = document.getElementById('job-status');
    
    // Upload file and start job
    try {
        const endpoint = type === 'image' ? '/api/upload/image' : '/api/upload/video';
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Unknown error');
        
        const jobId = data.jobId;
        jobIdElem.textContent = jobId;
        jobStatusElem.textContent = 'processing';
        
        // Poll job status
        pollJobStatus(jobId, progressFill, progressText, jobStatusElem);
        
    } catch (error) {
        progressText.textContent = `Error: ${error.message}`;
        progressFill.style.width = '0%';
        jobStatusElem.textContent = 'failed';
        setTimeout(() => resetApp(), 5000);
    }
}

// Poll job status
async function pollJobStatus(jobId, progressFill, progressText, jobStatusElem) {
    const pollInterval = 2000; // 2 seconds
    let attempts = 0;
    const maxAttempts = 300; // 10 minutes timeout
    
    const poll = async () => {
        attempts++;
        if (attempts > maxAttempts) {
            progressText.textContent = 'Timeout: Job took too long';
            jobStatusElem.textContent = 'timeout';
            setTimeout(() => resetApp(), 5000);
            return;
        }
        
        try {
            const response = await fetch(`/api/jobs/${jobId}`);
            if (!response.ok) throw new Error(`Job status fetch failed: ${response.statusText}`);
            
            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Unknown error');
            
            const job = data.job;
            jobStatusElem.textContent = job.status;
            
            if (job.progress) {
                const progress = job.progress;
                progressFill.style.width = `${progress}%`;
                progressText.textContent = job.result?.message || `Processing... ${progress}%`;
            }
            
            if (job.status === 'completed') {
                // Show result
                showResult(job.result.outputPath);
            } else if (job.status === 'failed') {
                progressText.textContent = `Job failed: ${job.error}`;
                setTimeout(() => resetApp(), 5000);
            } else {
                // Continue polling
                setTimeout(poll, pollInterval);
            }
        } catch (error) {
            progressText.textContent = `Polling error: ${error.message}`;
            setTimeout(poll, pollInterval);
        }
    };
    
    poll();
}

// Show result
function showResult(outputPath) {
    // Hide progress, show result section
    document.querySelector('.progress-section').classList.add('hidden');
    document.querySelector('.result-section').classList.remove('hidden');
    
    const resultImage = document.getElementById('result-image');
    const resultVideo = document.getElementById('result-video');
    const downloadLink = document.getElementById('download-link');
    
    // Determine if result is image or video
    const isVideo = outputPath.endsWith('.mp4') || outputPath.endsWith('.mov') || outputPath.endsWith('.avi');
    
    if (isVideo) {
        resultImage.classList.add('hidden');
        resultVideo.classList.remove('hidden');
        resultVideo.src = `/processed/${outputPath.split('/').pop()}`;
        downloadLink.href = `/processed/${outputPath.split('/').pop()}`;
        downloadLink.download = 'background_removed_video.mp4';
    } else {
        resultImage.classList.remove('hidden');
        resultVideo.classList.add('hidden');
        resultImage.src = `/processed/${outputPath.split('/').pop()}`;
        downloadLink.href = `/processed/${outputPath.split('/').pop()}`;
        downloadLink.download = 'background_removed_image.png';
    }
}

// Reset app
function resetApp() {
    document.querySelector('.upload-section').classList.remove('hidden');
    document.querySelector('.progress-section').classList.add('hidden');
    document.querySelector('.result-section').classList.add('hidden');
    
    // Reset previews
    clearImagePreview();
    clearVideoPreview();
    
    // Reset progress
    document.getElementById('progress-fill').style.width = '0%';
    document.getElementById('progress-text').textContent = 'Starting...';
    document.getElementById('job-id').textContent = '-';
    document.getElementById('job-status').textContent = '-';
}