const prisma = require('../prismaClient');
const bcrypt = require('bcryptjs');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// updatePassword for staff account
const updatePassword = catchAsync(async (req, res) => {
  const userId = req.user.staffId;
  const { currentPassword, newPassword, confirm } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError('Missing required fields', 400);
  }

  if (newPassword !== confirm) {
    throw new AppError('Passwords do not match', 400);
  }

  const user = await prisma.user.findUnique({
    where: {id: userId}
  });

  if(!user){
    throw new AppError('User not found', 404);
  }

  // compare currentPassword
  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

  if (!isMatch) {
    throw new AppError('Current password is incorrect', 400);
  }

  // hash new password and update 
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: { password_hash: hashedPassword },
  });

  return res.status(200).json({ msg: 'Updated successfully' });


});

module.exports = {
  updatePassword
};