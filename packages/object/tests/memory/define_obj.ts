import { AddWinsSet } from "../../../blueprints/src/AddWinsSet/index.js";
import { DRPObject } from "../../src/index.js";

const before = process.memoryUsage().heapUsed;
const obj = new DRPObject("peer1", new AddWinsSet<number>());
const after = process.memoryUsage().heapUsed;
console.log("heapUsed", after - before);
