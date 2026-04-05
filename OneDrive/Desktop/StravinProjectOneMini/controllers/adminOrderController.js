import Order from '../models/orderModel.js'
import Address from '../models/addressModel.js'
import Variant from '../models/variantModel.js'
import User from '../models/userModel.js'

export const getAllOrders=async(req,res)=>{
    try{
      const page=Number(req.query.page)||1
      const limit=10;
      const skip = (page-1)*limit;
      const search=req.query.search
      const status=req.query.status
      let filter={}
      const totalOrders=await Order.countDocuments(filter)
     
  if(search && search.trim()!==""){
  filter.$or = [
    {orderId:search.trim()},
    {orderId:{$regex:search.trim(),$options: "i"}}
  ]
  }
  if(status) {
      filter.status = status;
    }
        const orders = await Order.find(filter).sort({createdAt:-1})
                      .skip(skip).limit(limit).populate('userId')
        res.render('admin/usersOrders',{orders,
          currentPage:page,
          totalPages:Math.ceil(totalOrders/limit),
        search:search||'' ,statusFilter:status})

    }catch(error){
        console.log(error)
        res.json({success:false,message:"Server error!"})
    }
}
//detailed order info :Order Id
export const viewOrderDetails=async(req,res)=>{
    try{
    
    const orderId=req.params.orderId;
    const order = await Order.findOne({orderId}).populate("userId")
    if(!order){
        return res.status(404).json({success:false,message:"Order not found!"})
    }
    res.render('admin/adminViewOrder',{order})
}catch(error){
    console.log(error)
    res.status(500).json({success:false,message:"Server error at order fetching"})
}
}
//update order status-----------
export const updateStatus = async (req,res) => {
  try {
    const {orderId,itemId} = req.params;
    const {status} = req.body;

    const order = await Order.findOne({orderId})
    if (!order) {
      return res.json({success: false,message:"Order not found" });
    }

    const item = order.items.id(itemId);
    if (!item) {
      return res.json({success:false,message:"Item not found" });
    }

    
    let currentStatus = item.itemStatus?.trim();
    
    const nextStatus = status.trim();
    
    //Online/Wallet
    if (currentStatus === "Paid" || currentStatus === "Pending") {
      currentStatus = "Placed";
    }
    const allowedTransitions = {
      Placed: ["Shipped", "Cancelled"],
      Shipped: ["Out for Delivery"],
      "Out for Delivery": ["Delivered"],
      Delivered: ["Returned"],
      Cancelled: [],
      Returned: []
    }

    // invalid transitions
    if (!allowedTransitions[currentStatus] ||
      !allowedTransitions[currentStatus].includes(nextStatus)) {
      return res.json({success:false,message:`Cannot change from ${currentStatus} to ${nextStatus}`})
    }
  if (currentStatus === nextStatus) {
  return res.json({success:false,message:"Status is already the same"})
}
    // update statu
    item.itemStatus = nextStatus;
    if (!item.statusHistory) item.statusHistory = [];

    item.statusHistory.push({
     status: nextStatus,
      date: new Date()
    })

    //payment update
    if (nextStatus === "Delivered") {
      order.paymentStatus = "Paid";
    if (!order.statusHistory) order.statusHistory=[];

    order.statusHistory.push({
    status:"Payment Completed",
    date: new Date()
    })
  }

    const isPaid = order.paymentMethod !== "COD";

    //refund
    if ((nextStatus === "Cancelled" || nextStatus === "Returned") && isPaid) {
      if (!item.isRefunded) {
        const user = await User.findById(order.userId);

        const refundAmount = item.price * item.quantity;

        user.wallet += refundAmount;

        user.walletHistory.push({
          amount: refundAmount,
          type: "credit",
          reason: `Refund for ${nextStatus} - Order ${order.orderId}`,
          date: new Date()
        });

        await user.save();

        item.isRefunded = true;
      }
    }

    // PAYMENT STATUS UPDATE
    if (order.items.every(i => i.itemStatus === "Cancelled") ||
      order.items.every(i => i.itemStatus === "Returned")) {
      if (order.paymentMethod !== "COD") {
        order.paymentStatus = "Refunded";
      }
    }

    // ORDER STATUS UPDATE
   const prevOrderStatus = order.status

    const statuses = order.items.map(i => i.itemStatus);

    if (statuses.every(s => s === "Cancelled")) {
      order.status = "Cancelled";
    } else if (statuses.every(s => s === "Returned")) {
      order.status = "Returned";
    } else if (statuses.every(s => s === "Delivered")) {
      order.status = "Delivered";
    } else if (statuses.some(s => s === "Out for Delivery")) {
      order.status = "Out for Delivery";
    } else if (statuses.some(s => s === "Shipped")) {
      order.status = "Shipped";
    } else {
      order.status = "Placed";
    }
    if(prevOrderStatus!==order.status){
      if(!order.statusHistory) {
        order.statusHistory=[]
      }
    order.statusHistory.push({
    status:order.status,
    date: new Date()
  })
    }
   order.markModified("items"); 
    await order.save();

    
    return res.json({success: true,message: "Status updated successfully"});

  } catch (error) {
    console.error(error);
    res.status(500).json({success: false,message: "Server error at order"})
  }
}

//return request handling-admin-Approve / Reject---------------------------
export const handleReturnRequest = async (req, res) => {
  try {
    const {orderId,itemId} = req.params;
    const {action,adminNote } = req.body

    const order = await Order.findOne({orderId});
    if (!order) return res.status(404).json({success:false,message:"Order not found"})

    const item = order.items.id(itemId);
    if (!item || !item.return?.isRequested) {
      return res.status(400).json({success:false,message:"No return request found"})
    }

    if (item.return.status !== "Pending") {
      return res.status(400).json({ success:false,message:"Return already processed"})
    }

    item.return.status = action;
    item.return.adminNote = adminNote || "";
    item.return.approvalDate = new Date();

    if (action === "Approved" && !item.isRefunded) {
      const user = await User.findById(order.userId)
      const refundAmount = item.price * item.quantity
      //wallet refunding..
      user.wallet += refundAmount;
      user.walletHistory.push({
        amount: refundAmount,
        type: "credit",
        reason: `Refund for returned item - Order ${order.orderId}`,
        date: new Date()
      });
      await user.save();

      item.isRefunded = true;
      item.refundDetails = {
        amount: refundAmount,
        method: "Wallet",
        date: new Date()
      };
    }

    await order.save();
    return res.json({ success: true, message: `Return ${action.toLowerCase()} successfully` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
