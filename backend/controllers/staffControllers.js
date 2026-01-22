const prisma = require('../prisma');
const bcrypt = require('bcryptjs');

// updatePassword for staff account
const updatePassword = async (req, res) => {
  try {
  const userId = req.user.staffId;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ msg: 'Confirm password does not matched' });
  }

  const user = await prisma.user.findUnique({
    where: {id: userId}
  });

  if(!user){
    return res.status(404).json({ msg: 'User not found' });
  }

  // compare currentPassword
  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

  if (!isMatch) {
    return res.status(400).json({ msg: 'Current password is incorrect' });
  }

  // hash new password and update 
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: { password_hash: hashedPassword },
  });

  return res.status(200).json({ msg: 'Updated successfully' });

 } catch (err) {
  return res.status(500).json({ msg: 'Server error' });
}

};

module.exports = {
  updatePassword
};