import Order from "../models/orderModel.js";

// helper function
function getDateRange(filter, startDate, endDate) {
  const now = new Date();
  let start, end;

  const startOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const endOfDay = (date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  switch (filter) {
    case "daily":
      start = startOfDay(now);
      end = endOfDay(now);
      break;

    case "weekly":
      start = new Date(now);
      start.setDate(now.getDate() - 6);
      start = startOfDay(start);
      end = endOfDay(now);
      break;

    case "monthly":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      start = startOfDay(start);
      end = endOfDay(now);
      break;

    case "yearly":
      start = new Date(now.getFullYear(), 0, 1);
      start = startOfDay(start);
      end = endOfDay(now);
      break;

    case "custom":
      if (!startDate || !endDate) {
        return { start: null, end: null };
      }
      start = startOfDay(new Date(startDate));
      end = endOfDay(new Date(endDate));
      break;

    default:
      start = startOfDay(now);
      end = endOfDay(now);
  }

  return { start, end };
}


export const loadSalesReport = async (req, res) => {
  try {
    const { filter = "daily", startDate = "", endDate = "" } = req.query;

    const { start, end } = getDateRange(filter, startDate, endDate);

    let orders = [];

    if (start && end) {
      orders = await Order.find({
        createdAt: { $gte: start, $lte: end },
        status: { $nin: ["Cancelled", "Returned", "Failed"] }
      })
      .populate("userId") 
      .sort({ createdAt: -1 });
    }
    let totalOrders = orders.length;
    let overallOrderAmount = 0;
    let overallDiscount = 0;
    let overallCouponDiscount = 0;
    let netSales = 0;

    for (let order of orders) {
      overallOrderAmount += order.totalAmount || 0;

      overallDiscount += order.discount || 0;

      overallCouponDiscount += order.coupon?.discountAmount || 0;

      netSales += order.finalTotal || 0;
    }
    res.render("admin/salesReport", {
      filter,
      startDate,
      endDate,
      orders,
      totalOrders,
      overallOrderAmount,
      overallDiscount,
      overallCouponDiscount,
      netSales
    });

  } catch (error) {
    console.log("Sales Report Error:", error);
    res.status(500).send("Server Error");
  }
};