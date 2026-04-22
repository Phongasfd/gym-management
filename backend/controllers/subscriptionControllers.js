const prisma = require('../prismaClient');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// Create a new subscription
const createSubscription = catchAsync(async (req, res) => {
  const { member_id, package_id, start_date, end_date, status } = req.body;
    const subscription = await prisma.subscription.create({
      data: {
        member_id,
        package_id,
        start_date,
        end_date,
        status
      }
    });
    res.status(201).json(subscription);
});

// Get all subscriptions
const getSubscriptions = catchAsync(async (req, res) => {
    const subscriptions = await prisma.subscription.findMany();
    res.status(200).json(subscriptions);

});

// Update a subscription by ID
const updateSubscription = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { member_id, package_id, start_date, end_date, status } = req.body;
    const subscription = await prisma.subscription.update({
      where: { id: id },
      data: {
        member_id,
        package_id,
        start_date,
        end_date,
        status
      }
    });
    res.status(200).json(subscription);
    
});

// Get a subscription by ID
const getSubscriptionById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const subscription = await prisma.subscription.findUnique({
      where: { id: id }
    });
    res.status(200).json(subscription);

});

// Get a subscription by ID
const getSubscriptionByUserId = catchAsync(async (req, res) => {
    const id = req.user.userId;
    const subscription = await prisma.subscription.findMany({
      where: { member_id: id }
    });
    res.status(200).json(subscription);

});

module.exports = {
  createSubscription,
  getSubscriptions,
  updateSubscription,
  getSubscriptionById,
  getSubscriptionByUserId
};