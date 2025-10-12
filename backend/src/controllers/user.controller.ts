import { UserModel } from '@models/user.model';
import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';

export async function register(req: Request, res: Response) {
  try {
    const { emailAddress, firstName, lastName, password, isAdmin } = req.body;
    const newUser = new UserModel({
      emailAddress,
      firstName,
      lastName,
      password,
      isAdmin,
    });
    await newUser.save();
    res.status(201).send({
      message: 'User registered successfully',
    });
  } catch (err) {
    res.status(400).send({ error: 'Error registering user' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { emailAddress, password } = req.body;
    const user: any = await UserModel.findOne({ emailAddress });
    if (!user) {
      return res.status(401).send({ error: 'Invalid email or password' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).send({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ userId: user._id }, 'mysecretkey', {
      expiresIn: '1h',
    });
    res.send({ token });
  } catch (err) {
    res.status(400).send({ error: 'Error logging in' });
  }
}
