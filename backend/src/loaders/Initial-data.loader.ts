import cache from '@libs/cache';
import { AssumptionModel } from '@models/assumption.model';
import mongoose from 'mongoose';
import path from 'path';
import { Worker } from 'worker_threads';

export default async function loadAssumptions() {
  // Assume `cache` is some object with a .get() method (you'll need to define this)
  const assumptions = await AssumptionModel.find({ valid: true }, { name: 1, _id: 0, data: 1 }).lean();
  console.log(assumptions);

  cache.set('assumptions', assumptions);
}
