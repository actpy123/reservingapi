// Import your schemas here
import { UserModel } from '@models/user.model';
import type { Connection } from 'mongoose';

export async function up(connection: Connection): Promise<void> {
  // Write migration here

  const User = connection.model('User', UserModel.schema);
  const doc = new User({
    firstName: 'Super',
    lastName: 'Admin',
    password: 'SuperAdmin2wq!',
    emailAddress: 'sa@actpy.co',
    isAdmin: true,
  });
  await doc.validate();
  await doc.save();
}

export async function down(connection: Connection): Promise<void> {
  const User = connection.model('User', UserModel.schema);
  await User.deleteOne({ emailAddress: 'sa@actpy.com' });
}
