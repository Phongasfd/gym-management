const prisma = require('../prisma');

// Create a new subscription
const createSubscription = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all subscriptions
const getSubscriptions = async (req, res) => {
  try {

    const subscriptions = await prisma.subscription.findMany();
    res.status(200).json(subscriptions);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a subscription by ID
const updateSubscription = async (req, res) => {
  try {

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
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a subscription by ID
const getSubscriptionById = async (req, res) => {
  try {

    const { id } = req.params;
    const subscription = await prisma.subscription.findUnique({
      where: { id: id }
    });
    res.status(200).json(subscription);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a subscription by ID
const getSubscriptionByUserId = async (req, res) => {
  try {

    const id = req.user.userId; 
    const subscription = await prisma.subscription.findMany({
      where: { member_id: id }
    });
    res.status(200).json(subscription);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createSubscription,
  getSubscriptions,
  updateSubscription,
  getSubscriptionById,
  getSubscriptionByUserId
};