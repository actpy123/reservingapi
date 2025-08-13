import mongoose from 'mongoose';
import cache from '../cache';
import path from 'path';
import { Worker } from 'worker_threads';

export default async function loadFilterData() {
  // Assume `cache` is some object with a .get() method (you'll need to define this)
  const cacheRequests = ['AnnuityRate', 'MortalityRate'];

  for (let i = 0; i < cacheRequests.length; i++) {
    const key = cacheRequests[i];
    const model = mongoose.models[key];
    const data = await model.find().lean();
    cache.set(key, data);
  }
}
