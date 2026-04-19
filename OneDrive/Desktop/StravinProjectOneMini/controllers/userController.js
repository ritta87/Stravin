import * as userService from "../services/userService.js";

// get signup page..
export const getSignupPage = (req, res) => {
  res.render("user/signup");
};

export const getVerifyOtp = (req, res) => {
  if (!req.session.pendingUserId) {
    return res.redirect("/signup");
  }
  res.render("user/verifyOtp");
};

// signup
export const userSignup = async (req, res) => {
  try {
    const result = await userService.userSignupService(req.body);

    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }

    req.session.pendingUserId = result.pendingUserId;
    req.session.cookie.maxAge = 5 * 60 * 1000;

    req.session.save((err) => {
      if (err) {
        console.log("session save error", err);
        return res.status(500).json({success: false,message: "Session error!"})
      }

      return res.status(200).json({success: true,message: result.message,
        redirect: result.redirect})
    })

    console.log("OTP sent :", result.otp);
  } catch (error) {
    console.log("signup error", error);
    return res.status(500).json({success: false,message: "Oops!!Server failure!"})
  }
};

// verify otp
export const verifyOtp = async (req, res) => {
  try {
    const pendingUserId = req.session.pendingUserId;
    const { otp } = req.body;

    const result = await userService.verifyOtpService(pendingUserId, otp);

    if (!result.success) {
      return res.json(result);
    }

    delete req.session.pendingUserId;

    req.session.regenerate((err) => {
      if (err) {
        console.log("session regenerate error", err);
        return res.json({success: false,message: "Session error"})
      }

      req.session.userId = result.userId;
      req.session.cookie.maxAge = 24 * 60 * 60 * 1000;

      req.session.save((err) => {
        if (err) {
          console.log("session save error", err);
          return res.json({success: false,message: "Session error"})
        }

        return res.json({success: true,message: result.message})
      })
    })
  } catch (error) {
    console.log(error);
    return res.json({success: false,message: "Oops!Server failure!"})
  }
}

// resend otp
export const resendOtp = async (req, res) => {
  try {
    const pendingUserId = req.session.pendingUserId;

    const result = await userService.resendOtpService(pendingUserId);

    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }

    console.log("Otp Resent :", result.otp);

    return res.status(200).json({success: true,message: result.message})
  } catch (error) {
    console.log(error);
    return res.status(500).json({success: false,message: "Server Error while resenting OTP!"})
  }
}

// get login page
export const getLoginPage = async (req, res) => {
  const error = req.query.error;
  res.render("user/login", { error });
};

export const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await userService.userLoginService(email, password);

    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }

    req.session.userId = result.userId;
    req.session.isLoggedIn = true;

    return res.status(200).json({success: true,message: result.message,
      redirect: result.redirect
    })
  } catch (error) {
    console.log(error);
    return res.status(500).json({success: false,message: "Server error during logIn!"})
  }
}

// forgot password 
export const getForgotPassword = async (req, res) => {
  res.render("user/forgotPassword");
}

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const result = await userService.forgotPasswordService(email);

    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }

    console.log("Reset OTP is :", result.otp);

    return res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({success: false,message: "Server error cant sent otp!"})
  }
}

// verify reset otp
export const verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const result = await userService.verifyResetOtpService(email, otp);

    return res.status(result.statusCode || (result.success ? 200 : 400)).json(result);
  } catch (error) {
    return res.status(500).json({success: false,message: "Server Issue!"})
  }
}

// reset password
export const resetPassword = async (req, res) => {
  try {
    const result = await userService.resetPasswordService(req.body);

    return res.status(result.statusCode || (result.success ? 200 : 400)).json(result);
  } catch (error) {
    console.log("Reset password error!:", error);
    return res.status(500).json({success: false,message: "Server error"})
  }
}

// password reset page
export const getResetPassword = async (req, res) => {
  const email = req.query.email;
  res.render("user/resetPassword", { resetEmail: email });
};

// apply coupon
export const applyCoupon = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { couponCode } = req.body;

    const result = await userService.applyCouponService(userId, couponCode);

    return res.status(result.statusCode || (result.success ? 200 : 400)).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({success: false,message: "Server error"})
  }
}

// remove coupon
export const removeCoupon = async (req, res) => {
  try {
    const userId = req.session.userId;

    const result = await userService.removeCouponService(userId);

    return res.status(result.statusCode || (result.success ? 200 : 400)).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({success: false,message: "Error removing coupon"})
  }
}