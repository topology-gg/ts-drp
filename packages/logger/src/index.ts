import loglevel from "loglevel";
import prefix from "loglevel-plugin-prefix";

export interface LoggerOptions {
	level?: loglevel.LogLevelDesc;
}

export class Logger {
	private log: loglevel.Logger;
	// biome-ignore lint/suspicious/noExplicitAny: Do this to allow any method to be called on the logger
	[key: string]: any;

	constructor(context: string, config?: LoggerOptions) {
		this.log = loglevel.getLogger(context);
		this.log.setLevel(config?.level || "info");
		prefix.reg(loglevel);
		prefix.apply(this.log, {
			template: "%n",
		});

		for (const method of Object.keys(this.log)) {
			const logMethod = this.log[method as keyof loglevel.Logger];
			if (typeof logMethod === "function") {
				this[method as string] = logMethod.bind(this.log);
			}
		}
	}
}
