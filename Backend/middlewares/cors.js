// Backend/middlewares/cors.js

const corsMiddleware = ({ origin = "*", methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"] }) => (req, res, next) => {
  res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", methods.join(", "));

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
};

export default corsMiddleware;

