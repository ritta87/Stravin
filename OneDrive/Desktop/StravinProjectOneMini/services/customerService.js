import User from "../models/userModel.js";

export const getAllCustomersService = async (req) => {
  const search = req.query.search || "";
  const status = req.query.status || "";
  const page = parseInt(req.query.page) || 1;

  const limit = 10;
  const skip = (page - 1) * limit;

  let filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } }
    ];
  }

  if (status === "active") {
    filter.isBlocked = false;
  } else if (status === "blocked") {
    filter.isBlocked = true;
  }

  const totalUsers = await User.countDocuments(filter);

  const customers = await User.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalPages = Math.ceil(totalUsers / limit);

  return {
    success: true,
    data: {
      customers,
      search,
      status,
      currentPage: page,
      totalPages
    }
  }
}

export const blockCustomerService = async (req) => {
  const user = await User.findByIdAndUpdate(req.params.id,
    { isBlocked: true },
    { new: true }
  )

  if (!user) {
    return {
      success: false,
      statusCode: 404,
      message: "User not found"
    }
  }

  return {
    success: true,
    statusCode: 200,
    message: "User Blocked"
  }
}

export const unblockCustomerService = async (req) => {
  const user = await User.findByIdAndUpdate(req.params.id,
    { isBlocked: false },
    { new: true }
  )

  if (!user) {
    return {
      success: false,
      statusCode: 404,
      message: "User not found"
    }
  }

  return {
    success: true,
    statusCode: 200,
    message: "User Unblocked!"
  }
}