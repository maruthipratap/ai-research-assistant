import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Protects routes by requiring a valid JWT in the Authorization header.
// Header format: "Authorization: Bearer <token>"
//
// Interview talking point: JWTs are stateless - the server doesn't store
// sessions. The token itself (signed with JWT_SECRET) proves identity.
// We verify the SIGNATURE here, we don't "decrypt" anything (JWT payloads
// are just base64-encoded JSON, not encrypted).
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // attach the user (minus password) to the request for downstream routes
      req.user = await User.findById(decoded.id).select("-password");
      return next();
    } catch (error) {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};
