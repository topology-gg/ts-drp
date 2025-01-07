import type { IACL } from "./index.js";

export const isACLInterface = (target: object): boolean => {
	return (
		typeof (target as IACL).isWriter === "function" &&
		typeof (target as IACL).isAdmin === "function" &&
		typeof (target as IACL).grant === "function" &&
		typeof (target as IACL).revoke === "function" &&
		typeof (target as IACL).getPeerKey === "function"
	);
};
