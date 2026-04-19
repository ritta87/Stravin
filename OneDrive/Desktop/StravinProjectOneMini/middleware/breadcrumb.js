export const breadcrumps = (req, res, next) => {
  const pathParts = req.originalUrl.split("?")[0].split("/").filter(Boolean);

  let breadcrumbs = [{ name: "Home", url: "/" }];
  let currentPath = "";

  // readable names
  const nameMap = {
    admin: "Admin",
    products: "Products",
    variants: "Variants",
    orders: "Orders",
    viewOrderDetails: "Order Details",
    orderSuccess: "Success",
    orderFailure: "Failed",
    cart: "Cart",
    checkout: "Checkout",
    profile: "Profile",
    address: "Address",
    addAddress: "Add Address",
    editAddress: "Edit Address",
    wishlist: "Wishlist",
    coupons: "Coupons",
    customers: "Customers"
  };

  pathParts.forEach((part) => {
    //skip Mongo IDs (24 char hex)
    if (/^[0-9a-fA-F]{24}$/.test(part)) return;

    currentPath += `/${part}`;

    let name = nameMap[part] ||
      part
        .replace(/([A-Z])/g, " $1") // camelCase → words
        .replace(/-/g, " ")
        .replace(/^./, str => str.toUpperCase());

    breadcrumbs.push({
      name,
      url: currentPath
    });
  });

  res.locals.breadcrumbs = breadcrumbs;
  next();
}