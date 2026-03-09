const prisma = require('../prismaClient');

// Create a new member
const createMember = async (req, res) => {
  try {
    const { full_name, phone, email, gender, date_of_birth } = req.body;
    const member = await prisma.member.create({
      data: {
        full_name,
        phone,
        email,
        gender,
        date_of_birth: new Date(date_of_birth)
      }
    });
    res.status(201).json(member);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all members
const getAllMembers = async (req, res) => {
  try {
    const { count } = req.query;
    const now = new Date();

    if (count === 'active') {
      const activeCount = await prisma.member.count({
        where: {
          subscriptions: {
            some: {
              start_date: { lte: now },
              end_date: { gte: now },
            },
          },
        },
      });

      return res.status(200).json({ activeCount });
    }

    const members = await prisma.member.findMany();
    res.status(200).json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMembersOverview = async (req, res) => {
  try {
  
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const skip = (page - 1) * limit;


    const [members, total] = await prisma.$transaction([
      prisma.member.findMany({
        skip,
        take: limit,
        orderBy: {
          full_name: "asc",
        },
        select: {
          id: true,
          full_name: true,
          phone: true,
          subscriptions: {
            where: {
              status: "active",
              // end_date: {
              //   gte: new Date(),
              // },
            },
            take: 1,
            orderBy: {
              end_date: "desc",
            },
            select: {
              status: true,
              end_date: true,
              package: {
                select: {
                  name: true,
                },
              },
            },
          },
          checkins: {
            take: 1,
            orderBy: {
              checkin_time: "desc",
            },
            select: {
              checkin_time: true,
              source: true
            }
          }
        },
      }),

      prisma.member.count(),
    ]);

    const formattedMembers = members.map(member => {
      const sub = member.subscriptions[0];
      const checkin = member.checkins[0];

      return {
        id: member.id,
        name: member.full_name,
        phone: member.phone,
        packageName: sub?.package?.name ?? "—",
        status: sub?.status ?? "none",
        expiryDate: sub?.end_date ?? null,
        lastCheckin: checkin ? {
          time: checkin.checkin_time,
          source: checkin.source
        } : null
      };
    });

  
    res.status(200).json({
      data: formattedMembers,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};


// Get a member by ID
const getMemberById = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await prisma.member.findUnique({
      where: { id: id },
    });
    if(!member){
      return res.status(404).json({ error: 'Member not found' });
    }
    res.status(200).json(member);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a member by ID
const updateMemberById = async (req, res) => {
  try { 
    
    const { id } = req.params;
    const { full_name, phone, email, gender, date_of_birth } = req.body;
    const member = await prisma.member.update({
      where: { id: id },
      data: {
        full_name,
        phone,
        email,
        gender,
        date_of_birth
      }
    });
    res.status(200).json(member);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



module.exports = {
  createMember,
  getAllMembers,
  getMembersOverview,
  getMemberById,
  updateMemberById
};