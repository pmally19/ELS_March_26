import { Router } from "express";
import { createMissingTables } from "./create-tables";

export const createTablesRouter = Router();

// Endpoint to create missing tables
createTablesRouter.get("/create-tables", async (req, res) => {
  try {
    const result = await createMissingTables();
    if (result.success) {
      res.status(200).json({ message: "Tables created successfully" });
    } else {
      res.status(500).json({ message: "Error creating tables", error: result.error });
    }
  } catch (error) {
    console.error("Error in create tables endpoint:", error);
    res.status(500).json({ message: "Server error", error });
  }
});