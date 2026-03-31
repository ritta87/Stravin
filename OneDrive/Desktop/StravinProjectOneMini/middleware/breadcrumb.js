export const breadcrumps = (req, res, next) => {
  const pathParts = req.originalUrl.split('?')[0].split('/').filter(Boolean)

  let breadcrumbs = [{ name: "Home", url: "/" }];
  let currentPath = "";

  pathParts.forEach((part) => {
    currentPath += `/${part}`;
    let name = part.charAt(0).toUpperCase() + part.slice(1);

    breadcrumbs.push({
      name,
      url: currentPath
    });
  });

  res.locals.breadcrumbs = breadcrumbs;
  next();
}