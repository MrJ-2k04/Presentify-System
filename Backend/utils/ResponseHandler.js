class ResponseHandler {
  static success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      type: 'success',
      message,
      data,
    });
  }

  static error(res, error, statusCode = 500) {
    if (typeof error === 'string') {
      error = new Error(error);
    }

    return res.status(statusCode).json({
      type: 'error',
      message: error.message || 'Something went wrong',
      // error: error.stack || null,
    });
  }

  static notFound(res, message = 'Resource not found') {
    return res.status(404).json({
      type: 'error',
      message,
    });
  }

  static badRequest(res, message = 'Bad request') {
    return res.status(400).json({
      type: 'error',
      message,
    });
  }

  static requestTimeout(res, message = 'Request timeout') {
    return res.status(408).json({
      type: 'error',
      message,
    });
  }

  static unauthorized(res, message = 'Unauthorized') {
    return res.status(401).json({
      type: 'error',
      message
    });
  }

  static forbidden(res, message = 'Forbidden') {
    return res.status(403).json({
      type: 'error',
      message
    });
  }
}

export default ResponseHandler;