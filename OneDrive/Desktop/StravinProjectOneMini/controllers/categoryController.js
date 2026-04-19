import Category from "../models/categoryModel.js";

export const AddCategories = async(req,res)=>{
    try{
         let {name,description,catOfferPercentage}=req.body;
         catOfferPercentage = Number(catOfferPercentage) || 0;
         if(!name||!name.trim()){
            return res.status(400).json({success:false,message:'Category name is required!'})
         }
         if(!description||!description.trim()){
            return res.status(400).json({success:false,message:'Description is required!'})
         }
         if (catOfferPercentage < 0 || catOfferPercentage > 90) {
           return res.status(400).json({success: false,message:"Offer must be between 0 and 90"})
}
         name=name.trim().toLowerCase()
         description=description.trim()
        const exists=await Category.findOne({name}) 
        if(exists){
            return res.status(409).json({success:false,message:"Category name already exists."})
        }
        await Category.create({name,description,catOfferPercentage})
        
        res.status(201).json({success:true,message:"Category added successfully!"})
    }
    catch(error){
      return  res.status(500).json({success:false,message:"Wont able to add new category.something went wrong!"})
    }
   
}
export const getAllCategories = async(req,res)=>{
    try{
        
        const {search,page=1}=req.query;
        const limit=10
        const skip=(page-1)*limit
        let searchedObj = {}

    if (search && search.trim() !== "") {
      searchedObj.name = {$regex: search.trim(), $options: "i"};
    }
    const totalCategories=await Category.countDocuments(searchedObj)
     const category = await Category.find(searchedObj)
     .sort({createdAt:-1})
     .skip(skip).limit(limit);

   if(!category){
    return res.status(400).json("No Such category Added yet!!")
   }
   res.render('admin/categories',{
        category:category||[],
    search:search||'' ,
currentPage:Number(page),
 totalPages:Math.ceil(totalCategories/limit)            
    })
    }catch(error){
        res.status(400).json({message:"Something went wrong!Server Issue!"})
    } 
}



//dropdown cat
export const getCategoryDropdown = async () => {
  const categories= await Category.find({ isListed: true })
    .sort({ name: 1 });
    return categories
};


export const getEditCategory = async(req,res)=>{
    try{
  
    const category = await Category.findById(req.params.id)
    if(!category){
        return res.status(404).json({success:false,message:"No category found!"})
    }
    res.render('admin/editCategory',{category})
}catch(error){
    return res.redirect('/admin/categories')
}
}
//update 
export const updateCategory = async (req, res) => {
  try {
    const { name, description, isListed ,catOfferPercentage} = req.body
    const { id } = req.params

    await Category.findByIdAndUpdate(id, {
      name,
      description,
      isListed,
      catOfferPercentage
    })

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({success: false,message: "Failed to update category"})
  }
}

export const deleteCategory = async(req,res)=>{
    try{
        const {id} = req.params
         const category = await Category.findByIdAndUpdate(id,{isListed:false},{new:true})
         if(!category){
          return res.status(404).json({success:false,message:"No such category"})
         }
         
         res.status(200).json({success:true,message:"Category deleted successfully"})

    }catch(error){
      return res.status(500).json({success:false,message:"Server error!Cant delete category"})
    }
  

}
export const restoreCategory = async(req,res)=>{
  try{
await Category.findByIdAndUpdate(req.params.id,{isListed:true});
res.json({success:true,message:"Category Restored!"})
  }
  catch(error){
res.status(500).json({success:false,message:"Server Error!"})
  }

}