export type ServiceWorkerMessage =
	| {
			type: 'SWITCH_VERSION';
			newVersion: string;
	  }
	| {
			type: 'CLEAR_CACHE';
	  };
