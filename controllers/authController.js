// controllers/authController.js
const User = require("../Models/User");
const generateToken = require("../utils/generateToken");

const handleOAuthCallback = async (req, res) => {
    const { profile, provider } = req.user || req.authInfo; // ensure both are checked
  
    try {
      const existingUser = await User.findOne({ email: profile.email });
  
      if (existingUser) {
        // ❌ Conflict: Email already used with another provider
        if (existingUser.provider !== provider) {
          return res.redirect(`http://localhost:5173/login?error=Email already used with ${existingUser.provider || 'another method'}`);
        }
  
        // ✅ Login: same provider
        const token = generateToken(existingUser._id, existingUser.isAdmin);
        const redirectUrl = `http://localhost:5173/oauth-success?token=${token}&name=${encodeURIComponent(existingUser.name)}&email=${encodeURIComponent(existingUser.email)}`;
        return res.redirect(redirectUrl);
      }
  
      // 🆕 Register: new user
      const newUser = await User.create({
        name: profile.name,
        email: profile.email,
        providerId: profile.id,
        provider: provider,
      });
  
      const token = generateToken(newUser._id, newUser.isAdmin);
      const redirectUrl = `http://localhost:5173/login`;
      return res.redirect(redirectUrl);
    } catch (error) {
      console.error('OAuth error:', error);
      return res.redirect('http://localhost:5173/login?error=OAuth login failed');
    }
  };
  

module.exports = { handleOAuthCallback };
