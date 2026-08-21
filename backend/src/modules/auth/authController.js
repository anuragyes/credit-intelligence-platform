import { login, signup } from './authService.js';

export async function signupHandler(req, res, next) {
  try {
    const result = await signup(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(req, res, next) {
  try {
    const result = await login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
