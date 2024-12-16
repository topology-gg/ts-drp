import { createSign, createVerify } from "node:crypto";
import type { Operation } from "@ts-drp/object";

export function signOperation(
	privateKey: string,
	operation: Operation | undefined,
): string {
	if (!privateKey) {
		throw new Error("Invalid private key");
	}

	const signer = createSign("sha256");
	signer.update(JSON.stringify(operation));
	signer.end();

	return signer.sign(privateKey, "hex");
}

export function verifySignature(
	publicKey: string,
	operation: Operation | undefined,
	signature: string,
): boolean {
	const verifier = createVerify("sha256");
	verifier.update(JSON.stringify(operation));
	verifier.end();
	return verifier.verify(publicKey, signature, "hex");
}
