import Multer from 'multer';

// Configure storage strategy (using memory storage for S3 uploads)
const storage = Multer.memoryStorage();

// Initialize Multer
const upload = Multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    }
});

export default upload;