import { AddWinsSet } from "../../../blueprints/src/AddWinsSet/index.js";
import { DRPObject } from "../../src/index.js";

const before = process.memoryUsage().heapUsed;
const obj = new DRPObject("peer1", new AddWinsSet<number>());
const drp = obj.drp as AddWinsSet<number>;
const lim = Number.parseInt(process.argv[2]);
for (let i = 0; i < lim; i++) {
    drp.add(i);
}
obj.hashGraph.linearizeOperations();
const after = process.memoryUsage().heapUsed;
console.log("heapUsed", after - before);
