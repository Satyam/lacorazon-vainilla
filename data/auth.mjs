import jwt from 'jsonwebtoken';
import { checkValidUser } from './user.mjs';

const UNAUTHORIZED = 401;

export const authMiddleware = (req, res, next) => {
  if (req.path === '/api/auth' && req.body.op === 'login') return void next();
  const token = req.cookies[process.env.SESSION_COOKIE];
  const unauthorised = () =>
    res.json({
      error: UNAUTHORIZED,
      data: 'Unauthorized',
    });

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) unauthorised();
      else {
        req.user = user;
        next();
      }
    });
  } else unauthorised();
};

export default function ({ op, ...rest }, res) {
  const fns = {
    login: ({ data }) => {
      return checkValidUser(data.email, data.password).then((user) => {
        res.cookie(
          process.env.SESSION_COOKIE,
          jwt.sign(user, process.env.JWT_SECRET, {
            expiresIn: `${process.env.SESSION_DURATION}s`,
          }),
          {
            httpOnly: true,
            expires: new Date(Date.now() + process.env.SESSION_DURATION * 1000),
          }
        );
        return { data: user };
      });
    },
    logout: () => {
      res.clearCookie(process.env.SESSION_COOKIE);
      return Promise.resolve({ data: {} });
    },
  };

  const fn = fns[op];
  if (fn) return fn(rest);
  return Promise.reject('not found');
}