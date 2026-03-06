const prisma = require('../prisma');

// Create a new package
const createPackage = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all packages
const getAllPackages = async (req, res) => {
  try {
    const packages = await prisma.package.findMany();
    res.status(200).json(packages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single package by ID
const getPackageById = async (req, res) => {
  try {
    const { id } = req.params;
    const packages = await prisma.package.findUnique({
      where: { id: id }
    });
    if (!packages) {
      return res.status(404).json({ error: 'Package not found' });
    }
    res.status(200).json(packages);

  }catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single package by ID
const getPackageByUserId = async (req, res) => {
  try {
    const { id } = req.params;
    const packages = await prisma.package.findUnique({
      where: { id: id }
    });
    if (!packages) {
      return res.status(404).json({ error: 'Package not found' });
    }
    res.status(200).json(packages);

  }catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a package
const updatePackage = async (req, res) => {
  try {

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

  } catch(error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a package
const deletePackage = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.package.delete({
      where: { id: id }
    });
    res.status(204).send();

  } catch (error) { 
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createPackage,
  getAllPackages,
  getPackageById,
  getPackageByUserId,
  updatePackage,
  deletePackage
};

