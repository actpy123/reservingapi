import cache from '@libs/cache';
import { AssumptionModel } from '@models/assumption.model';

export default async function loadAssumptions() {
  const assumptions = await AssumptionModel.find({ valid: true }, { name: 1, _id: 0, data: 1 }).lean();

  cache.set('assumptions', assumptions);
}
