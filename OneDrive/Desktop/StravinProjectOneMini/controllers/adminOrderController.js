import Order from '../models/orderModel.js'
import Address from '../models/addressModel.js'
import UserModel from '../models/userModel.js'

export const getAllOrders=async(req,res)=>{
    try{
      const page=Number(req.query.page)||1
      const limit=10;
      const skip = (page-1)*limit;
      const search=req.query.search
      let filter={}
      const totalOrders=await Order.countDocuments(filter)
     
  if(search && search.trim()!==""){
  filter.$or = [
    {orderId:search.trim()},
    {orderId:{$regex:search.trim(),$options: "i"}}
  ]
   }
        const orders = await Order.find(filter).sort({createdAt:-1})
                      .skip(skip).limit(limit).populate('userId')
        res.render('usersOrders',{orders,
          currentPage:page,
          totalPages:Math.ceil(totalOrders/limit),
        search:search||'' })

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
    res.render('adminViewOrder',{order})
}catch(error){
    console.log(error)
    res.status(500).json({success:false,message:"Server error at order fetching"})
}
}
//update order status,
export const updateStatus = async (req, res) => {
  try {
    const {orderId,itemId} = req.params;
    const {status} = req.body;

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.json({ success: false, message: "Order not found" });
    }

    // find item using _id
    const item = order.items.id(itemId)

    if (!item) {
      return res.json({ success: false, message: "Item not found" })
    }

    //  update item status
const currentStatus = item.itemStatus.trim();
const nextStatus = status.trim();

const allowedTransitions = {
  Placed: ["Shipped", "Cancelled"],
  Shipped: ["Out for Delivery"],
  "Out for Delivery": ["Delivered"],
  Delivered: ["Returned"],   
  Cancelled: [],             
  Returned: []               
};

if (
  !allowedTransitions[currentStatus] ||
  !allowedTransitions[currentStatus].includes(nextStatus)
) {
  return res.json({
    success: false,
    message: `Cannot change from ${currentStatus} to ${nextStatus}`
  });
}

item.itemStatus = nextStatus;

    const statuses = order.items.map(i => i.itemStatus);

    if (statuses.every(s => s === "Cancelled")) {
      order.status = "Cancelled";
    } 
    else if (statuses.every(s => s === "Delivered")) {
      order.status = "Delivered";
    } 
    else if (statuses.some(s => s === "Out for Delivery")) {
      order.status = "Out for Delivery";
    } 
    else if (statuses.every(s => s === "Returned")) {
  order.status = "Returned";
    }
    else if (statuses.some(s => s === "Shipped")) {
      order.status = "Shipped";
    } 
    else {
      order.status = "Placed";
    }

    await order.save();

    res.json({ success: true });

  } catch (error) {
    console.log("Error:", error);
    res.json({ success: false });
  }
}