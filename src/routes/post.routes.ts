import { Router } from "express";
import { createPost, deletePost, listPosts, patchPost } from "../controllers/post.controller";
import { getReactionsByPostId } from "../controllers/reaction.controller";
import { requireManualPostOwner, requirePostOwner } from "../middlewares/resourceOwnership.middleware";
import { requireChild } from "../middlewares/rbac.middleware";

export const postRouter = Router();

postRouter.use(requireChild);

postRouter.get("/:postId/reactions", getReactionsByPostId);
postRouter.patch("/:postId", requirePostOwner(), requireManualPostOwner, patchPost);
postRouter.delete("/:postId", requirePostOwner(), requireManualPostOwner, deletePost);
postRouter.post("/", createPost);
postRouter.get("/", listPosts);
