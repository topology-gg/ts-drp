import { Logger } from "@ts-drp/logger";

interface ILogger {
	log?: Logger;
}

export const logger: ILogger = { log: undefined };
