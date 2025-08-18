import dotenv from 'dotenv';
dotenv.config();
import { afterAll } from "vitest";
import { projectPurger } from "./project-cleanup";

afterAll(async () => {
    await projectPurger.cleanup();
});