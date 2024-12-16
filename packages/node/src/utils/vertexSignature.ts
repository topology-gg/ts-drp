import { createSign, createVerify } from "node:crypto";
import type { Operation } from "@ts-drp/object";

export function signOperation(
	privateKey: string,
	operation: Operation,
): string {
	if (!privateKey || !operation) {
		throw new Error("Invalid input");
	}

	const signer = createSign("sha256");
	signer.update(JSON.stringify(operation));
	signer.end();

	return signer.sign(privateKey, "hex");
}

export function verifySignature(
	publicKey: string,
	operation: Operation,
	signature: string,
) {
	const verifier = createVerify("sha256");
	verifier.update(JSON.stringify(operation));
	verifier.end();
	return verifier.verify(publicKey, signature, "hex");
}
