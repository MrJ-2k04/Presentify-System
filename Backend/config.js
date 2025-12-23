
import { ENVIRONMENTS } from './utils/constants.js';

// ################################################### CONSTANTS ###################################################

const APP_PORT = process.env.NODE_ENV === ENVIRONMENTS.PRODUCTION ? 80 : 8080;
const DB_CONNECTION_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/AI_Attendance_System';
const AWS_CONFIG = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    bucketName: process.env.AWS_BUCKET_NAME,
};

// const FRONTEND_URL = process.env.NODE_ENV === 'production'
//     ? (process.env.FRONTEND_URL || `https://ai-attendance-system.pages.dev`)
//     : `http://localhost:3000`
// const MAIL_TRANSPORTER_AUTH = {
//     user: "savaridekho@gmail.com",
//     pass: "vfhw ytof dojc gokm",
// }
// const LINKS = {
//     // RIDE_DETAILS: `${FRONTEND_URL}/rides/:rideId`,
//     // WALLET: `${FRONTEND_URL}/wallet`,
//     // SEARCH_RIDES: `${FRONTEND_URL}/search-rides`,
//     // PUBLISH_RIDE: `${FRONTEND_URL}/rides/publish`,
//     // RAISE_TICKET: `${FRONTEND_URL}/ticket`,
//     // USER_PROFILE: `${FRONTEND_URL}/profile`,
//     // VEHICLE_DETAILS: `${FRONTEND_URL}/vehicle/:vehicleId`,
// }

// ################################################### S3 FOLDER STRUCTURE ###################################################

// students:
//   - 24CI2110116
//     - 1.jpg
//     - 2.jpg
//   - 24CI2110117
//     - 3.jpg

// lectures:
//   - subject_id
//     - lec_id
//       - images
//         - {timestamp}.jpg
//         - {timestamp}.jpg
//       - annotated_images
//         - {timestamp_annotated}.jpg
//         - {timestamp_annotated}.jpg
//     - lec_id2
//       - images
//         - {timestamp}.jpg
//         - {timestamp}.jpg

// ################################################### EXPORT ###################################################

export {
    APP_PORT,
    DB_CONNECTION_URL,
    AWS_CONFIG,
};