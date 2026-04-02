/**
 * apiResponse.js
 * Every response has the same shape: { success, message, data }
 * Consistency makes the frontend predictable — no guessing where data lives.
 */
const success = (res, data = null, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });
 
const created = (res, data, message = 'Created') => success(res, data, message, 201);
const error = (res, message = 'Something went wrong', statusCode = 500, errors = null) => {
    const body = {success: false, message};
    if (errors) body.errors = errors;
    return res.status(statusCode).json(body);
}

module.exports = {
    success,
    created,
    error,
    notFound: (res, msg = 'Not Found') => error(res, msg, 404),
    unauthorized: (res, msg = 'Unauthorized') => error(res, msg, 401),
    forbidden: (res, msg = 'Forbidden') => error(res, msg, 403),
    badRequest: (res, msg, errs) => error(res, msg || 'Bad Request', 400, errs),
}