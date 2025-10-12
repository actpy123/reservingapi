import { login, register } from '@controllers/user.controller';
import { authenticateRequest, isAdmin } from '@middlewares/authenticateMiddleware';

import { Router } from 'express';

const userRouter = Router();

userRouter.post('/register', authenticateRequest, isAdmin, register);
userRouter.post('/login', login);

export default userRouter;
