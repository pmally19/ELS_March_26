import { Express } from "express";
import { registerMasterDataRoutes } from "./master-data/index";

export default function initializeMasterDataRoutes(app: Express) {
  registerMasterDataRoutes(app);
}