import { Router } from "express";
import * as adminService from "./admin.service.js";
import { authentication } from "../../common/middleware/authentication.js";
import { authorization } from "../../common/middleware/authorization.js";
import { roleEnum } from "../../common/enum/auth.enum.js";

const adminRouter = Router();

adminRouter.use(authentication, authorization([roleEnum.admin]));

adminRouter.get("/dashboard", adminService.getDashboardStats);
adminRouter.get("/users/export", adminService.exportUsers);
adminRouter.get("/users", adminService.getUsers);
adminRouter.get("/users/:id", adminService.getUserDetails);
adminRouter.delete("/users/:id", adminService.deleteUser);
adminRouter.get("/analytics", adminService.getAnalytics);

export default adminRouter;
