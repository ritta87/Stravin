import express from "express";
import passport from "../config/passport.js";

const router = express.Router();

// redirect to Google for login
router.get("/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

//callback after Google login
router.get(
  "/google/callback",
  passport.authenticate("google", {
    
    failureRedirect: "/login",
    
  }),
  (req, res) => {
    // user is available as req.user,create session,redirect to homepage
    req.session.user = req.user._id;
    res.redirect("/");
  }
);

export default router;
