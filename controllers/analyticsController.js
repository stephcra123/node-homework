const { StatusCodes } = require('http-status-codes');
const prisma = require("../db/prisma");

const getUsersWithStats = async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    if (page < 1) page = 1;
    if (limit < 1) limit = 1;
    if (limit > 100) limit = 100;
    const skip = (page - 1) * limit;

    const totalUsers = await prisma.user.count();

    const usersRaw = await prisma.user.findMany({
      include: {
        Task: {
          where: { isCompleted: false },
          select: { id: true },
          take: 5
        },
        _count: {
          select: { Task: true }
        }
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    const users = usersRaw.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      _count: user._count,
      Task: user.Task
    }));

    const pagination = {
      page,
      limit,
      total: totalUsers,
      pages: Math.ceil(totalUsers / limit),
      hasNext: page * limit < totalUsers,
      hasPrev: page > 1
    };

    res.status(StatusCodes.OK).json({ users, pagination });
  } catch (err) {
    return next(err);
  }
};

const getUserAnalytics = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid user ID" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
    }

    const taskStats = await prisma.task.groupBy({
      by: ['isCompleted'],
      where: { userId },
      _count: { id: true }
    });

    const recentTasks = await prisma.task.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
        userId: true,
        User: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyProgress = await prisma.task.groupBy({
      by: ['createdAt'],
      where: {
        userId,
        createdAt: { gte: oneWeekAgo }
      },
      _count: { id: true }
    });

    res.status(StatusCodes.OK).json({ taskStats, recentTasks, weeklyProgress });
  } catch (err) {
    return next(err);
  }
};

const searchTasks = async (req, res, next) => {
  try {
    const searchQuery = req.query.q;
    if (!searchQuery || searchQuery.trim().length < 2) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: "Search query must be at least 2 characters long"
      });
    }
    const limit = parseInt(req.query.limit) || 20;
    const searchPattern = `%${searchQuery}%`;
    const exactMatch = searchQuery;
    const startsWith = `${searchQuery}%`;

    const results = await prisma.$queryRaw`
      SELECT 
        t.id,
        t.title,
        t.is_completed as "isCompleted",
        t.priority,
        t.created_at as "createdAt",
        t.user_id as "userId",
        u.name as "user_name"
      FROM tasks t
      JOIN users u ON t.user_id = u.id
      WHERE t.title ILIKE ${searchPattern} 
         OR u.name ILIKE ${searchPattern}
      ORDER BY 
        CASE 
          WHEN t.title ILIKE ${exactMatch} THEN 1
          WHEN t.title ILIKE ${startsWith} THEN 2
          WHEN t.title ILIKE ${searchPattern} THEN 3
          ELSE 4
        END,
        t.created_at DESC
      LIMIT ${limit}
    `;

    res.status(StatusCodes.OK).json({
      results,
      query: searchQuery,
      count: results.length
    });
  } catch (err) {
    return next(err);
  }
};
module.exports = { getUserAnalytics, getUsersWithStats, searchTasks };