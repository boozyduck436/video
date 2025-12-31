import { ApiError } from "../utils/ApiError.js";
import { defineAbilityFor } from "../casl/defineAbility.js";
import mongoose from "mongoose";


/*
 Record-based authorization middleware.
 Assumes verifyJWT already ran and req.user exists.

 Usage:
   authorizeById({ action: "delete", subject: "Video", Model: Video, param: "videoId" })
 */
export function authorizeById({ action, subject, Model, param }) {
  return async (req, _res, next) => {
    try {
      if (!req.user) throw new ApiError(401, "Unauthorized request");
      

      const id = req.params?.[param];
      if (!id) throw new ApiError(400, `Missing param: ${param}`);
      if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid ID"); // Valdiating objectId

      const doc = await Model.findById(id);
      if (!doc) throw new ApiError(404, `${subject} not found`);

      // Tell CASL what subject type this document represents
      doc.__caslSubjectType__ = subject;

      const ability = defineAbilityFor(req.user);

      if (!ability.can(action, doc)) {
        throw new ApiError(403, "Forbidden");
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}