
import { connect } from 'mongoose';
import { DB_CONNECTION_URL } from '../config.js';
import { ENVIRONMENTS, DB_NAMES } from '../utils/constants.js';

const connectionOptions = {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
    // useFindAndModify: false,
    // useCreateIndex: true
    dbName: (() => {
        switch (process.env.NODE_ENV) {
            case ENVIRONMENTS.DEVELOPMENT: return DB_NAMES.DEVELOPMENT;
            case ENVIRONMENTS.STAGING: return DB_NAMES.STAGING;
            case ENVIRONMENTS.PRODUCTION: return DB_NAMES.PRODUCTION;
            default: return undefined;
        }
    })()
}


export const connectToDb = (callback) => {
    connect(DB_CONNECTION_URL, connectionOptions)
        .then(conn => {
            console.log("Connected to MongoDB Successfully!");
            return callback()
        })
        .catch(err => {
            return callback(err)
        })
};