export const sendSuccess = (res, data = null, message = "Success", statusCode = 200, meta = null) => {
  const payload = { success: true, message, data };
  if (meta) payload.meta = meta;
  return res.status(statusCode).json(payload);
};

export const sendError = (res, error, statusCode = 500, fallbackMessage = "Something went wrong") => {
  const message = error?.message || fallbackMessage;
  return res.status(statusCode).json({ success: false, message });
};
