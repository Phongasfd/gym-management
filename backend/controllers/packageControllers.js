const prisma = require('../prismaClient');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// Create a new package
const createPackage = catchAsync(async (req, res) => {
    const { name, description, price, duration_days } = req.body;
    const newPackage = await prisma.package.create({
      data: {
        name,
        description,
        price,
        duration_days
      }
    });
    res.status(201).json(newPackage);

});

// Get all packages
const getAllPackages = catchAsync(async (req, res) => {
    const packages = await prisma.package.findMany();
    res.status(200).json(packages);
 
});

// Get a single package by ID
const getPackageById = catchAsync(async (req, res) => {

    const { id } = req.params;
    const packages = await prisma.package.findUnique({
      where: { id: id }
    });
    if (!packages) {
      throw new AppError('Package not found', 404);
    }
    res.status(200).json(packages);

});

// Get a single package by ID
const getPackageByUserId = catchAsync(async (req, res) => {
    const { id } = req.params;
    const packages = await prisma.package.findUnique({
      where: { id: id }
    });
    if (!packages) {
      return res.status(404).json({ error: 'Package not found' });
    }
    res.status(200).json(packages);

});

// Update a package
const updatePackage = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { name, description, price, duration_days } = req.body;
    const updatedPackage = await prisma.package.update({
      where: { id: id },
      data: {
        name,
        description,
        price,
        duration_days
      }
    });
    res.status(200).json(updatedPackage);

});

// Delete a package
const deletePackage = catchAsync(async (req, res) => {
    const { id } = req.params;
    await prisma.package.delete({
      where: { id: id }
    });
    res.status(204).send();
});


module.exports = {
  createPackage,
  getAllPackages,
  getPackageById,
  getPackageByUserId,
  updatePackage,
  deletePackage
};

