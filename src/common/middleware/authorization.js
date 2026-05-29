export const authorization = (roles = []) => {
  return async (req, res, next) => {
    if (!roles.includes(req.auth.role)) {
      throw new Error("UnAuthorized");
    }
    next();
  };
};
