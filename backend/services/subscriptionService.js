const prisma = require('../prismaClient');

/**
 * Update subscriptions with expired status when end_date has passed
 * @returns {Promise<number>} Number of subscriptions updated
 */
const updateExpiredSubscriptions = async () => {
  const now = new Date();
  
  try {
    const result = await prisma.subscription.updateMany({
      where: {
        AND: [
          { end_date: { lte: now } },
          { status: { not: 'expired' } }
        ]
      },
      data: {
        status: 'expired'
      }
    });
    
    return result.count;
  } catch (error) {
    console.error('Error updating expired subscriptions:', error);
    throw error;
  }
};

module.exports = {
  updateExpiredSubscriptions
};
